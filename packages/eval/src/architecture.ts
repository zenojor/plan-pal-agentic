import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createDefaultToolRegistry,
  createSqliteCheckpointer,
  PlanPalAgentRuntime,
  routeNaturalLanguageTurn,
  type AgentModelGateway,
  type ClientModelConfig,
} from '../../agent/src/index.ts'
import { createInMemoryStores } from '../../db/src/index.ts'
import {
  applyPlanCommand,
  createPlanFromPrompt,
  type AgentEvent,
  type Plan,
  type PlanSegment,
} from '../../domain/src/index.ts'

export type ArchitectureEvalResult = {
  id: string
  title: string
  tags: string[]
  passed: boolean
  checks: Array<{ label: string; passed: boolean; detail: string }>
}

const modelConfig: ClientModelConfig = {
  apiKey: 'sk-eval-placeholder',
  baseURL: 'https://api.example.com/v1',
  model: 'eval-model',
}

const invalidStructuredGateway: AgentModelGateway = {
  generateAssistantReply: async () => '{invalid structured output',
}

export async function runArchitectureEval(): Promise<ArchitectureEvalResult[]> {
  const cases: Array<() => Promise<ArchitectureEvalResult>> = [
    () => routeCase('eval-delete-coffee', '删除咖啡这个安排', 'DELETE_SEGMENT', 'coffee'),
    () => routeCase('eval-negated-hotel', '不要酒店了', 'DELETE_SEGMENT', 'hotel'),
    () => routeCase('eval-confirm-hotel', '确认酒店安排', 'CONFIRM_PLAN'),
    () => resumeTextCase('eval-retry-candidate', '换一个', 'retry', 'waiting_for_user'),
    () => resumeTextCase('eval-select-second', '就第二个', 'selected', 'completed'),
    () => resumeTextCase('eval-cancel-candidate', '还是算了', 'rejected', 'cancelled'),
    emptyPlanQaCase,
    checkpointRecoveryCase,
    emptyToolCase,
    invalidStructuredCase,
  ]
  const results: ArchitectureEvalResult[] = []
  for (const run of cases) {
    try {
      results.push(await run())
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push(result('eval-unexpected-error', 'Architecture eval case', ['architecture'], [
        check('unexpected_error', false, message),
      ]))
    }
  }
  return results
}

async function routeCase(
  id: string,
  message: string,
  expectedType: string,
  expectedTarget?: 'coffee' | 'hotel',
) {
  const plan = buildNamedPlan()
  const routed = routeNaturalLanguageTurn(plan, message)
  const command = routed.kind === 'command' ? routed.command : undefined
  const expectedSegmentId = expectedTarget === 'coffee' ? 'seg_eval_coffee'
    : expectedTarget === 'hotel' ? 'seg_eval_hotel'
      : undefined
  const actualSegmentId = command && 'segmentId' in command ? command.segmentId : undefined
  return result(id, `Routing: ${message}`, ['routing', 'negation', 'regression'], [
    check('route_kind', routed.kind === 'command', `got ${routed.kind}`),
    check('command_type', command?.type === expectedType, `expected ${expectedType}, got ${command?.type ?? 'none'}`),
    check(
      'target_grounding',
      !expectedSegmentId || actualSegmentId === expectedSegmentId,
      `expected ${expectedSegmentId ?? 'whole plan'}`,
    ),
  ])
}

async function resumeTextCase(
  id: string,
  message: string,
  expectedDecision: string,
  expectedStatus: 'waiting_for_user' | 'completed' | 'cancelled',
) {
  const { runtime, plan } = await setupRuntime()
  await runtime.run({ planId: plan.id, message: '把晚饭换近一点', modelConfig }, () => undefined)
  const events: AgentEvent[] = []
  const resumed = await runtime.run({ planId: plan.id, message, modelConfig }, collect(events))
  const resume = readObject(events.find((event) => event.type === 'interrupt.resumed')?.payload).resume
  return result(id, `Typed resume: ${message}`, ['interrupt', 'resume', 'regression'], [
    check('resume_decision', readObject(resume).decision === expectedDecision, JSON.stringify(resume)),
    check('run_status', resumed.status === expectedStatus, `expected ${expectedStatus}, got ${resumed.status}`),
    check('sequence_continuity', isStrictlyIncreasing(events), `${events.length} resumed events`),
  ])
}

async function emptyPlanQaCase() {
  const { runtime, stores, plan } = await setupRuntime({
    generateAssistantReply: async () => '当前计划是空的。请告诉我新的时间、地点和偏好。',
  })
  const waiting = await runtime.run({ planId: plan.id, message: '清空计划', modelConfig }, () => undefined)
  const action = (await stores.plans.getPlan(plan.id))?.pendingAction
  if (!action) throw new Error('clear-plan approval missing')
  await runtime.resume({
    planId: plan.id,
    runId: waiting.runId,
    actionId: action.id,
    payload: { confirmed: true },
    modelConfig,
  }, () => undefined)
  const events: AgentEvent[] = []
  const qa = await runtime.run({ planId: plan.id, message: '这个计划怎么样', modelConfig }, collect(events))
  const final = events.find((event) => event.type === 'agent.finished')
  return result('eval-empty-plan-qa', '清空计划后询问“这个计划怎么样”', ['multi-turn', 'qa', 'regression'], [
    check('plan_empty', (await stores.plans.getPlan(plan.id))?.segments.length === 0, 'plan has no segments'),
    check('qa_completed', qa.status === 'completed', `got ${qa.status}`),
    check('empty_grounding', final?.message.includes('空') === true, final?.message ?? 'no answer'),
  ])
}

async function checkpointRecoveryCase() {
  const directory = await mkdtemp(join(tmpdir(), 'planpal-eval-checkpoint-'))
  const path = join(directory, 'checkpoints.sqlite')
  try {
    const stores = createInMemoryStores()
    const plan = await stores.plans.createPlan(createPlanFromPrompt('晚上两个人附近吃饭'))
    const firstSaver = createSqliteCheckpointer(path)
    const firstEvents: AgentEvent[] = []
    const first = new PlanPalAgentRuntime(stores, createDefaultToolRegistry(), invalidStructuredGateway, firstSaver)
    const waiting = await first.run({ planId: plan.id, message: '清空计划', modelConfig }, collect(firstEvents))
    const action = (await stores.plans.getPlan(plan.id))?.pendingAction
    if (!action) throw new Error('checkpoint approval missing')
    firstSaver.db.close()

    const secondSaver = createSqliteCheckpointer(path)
    const resumedEvents: AgentEvent[] = []
    const second = new PlanPalAgentRuntime(stores, createDefaultToolRegistry(), invalidStructuredGateway, secondSaver)
    const resumed = await second.resume({
      planId: plan.id,
      runId: waiting.runId,
      actionId: action.id,
      payload: { confirmed: true },
      modelConfig,
    }, collect(resumedEvents))
    secondSaver.db.close()
    const nodes = nodePath(resumedEvents)
    return result('eval-checkpoint-restart', 'interrupt 后重启 runtime 再 resume', ['checkpoint', 'recovery', 'regression'], [
      check('same_run', resumed.runId === waiting.runId, `${waiting.runId} -> ${resumed.runId}`),
      check('completed', resumed.status === 'completed', `got ${resumed.status}`),
      check('no_reexecution', !nodes.includes('understandIntent') && nodes.includes('applyCommand'), nodes.join(' -> ')),
      check('continuous_sequence', (resumedEvents[0]?.sequence ?? 0) > Math.max(...firstEvents.map((event) => event.sequence)), 'resume continues prior sequence'),
    ])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function emptyToolCase() {
  const stores = createInMemoryStores()
  const plan = await stores.plans.createPlan(createPlanFromPrompt('晚上两个人附近吃饭'))
  const tools = createDefaultToolRegistry({
    poi_search: async () => ({ source: 'eval', intent: {}, candidates: [] }),
  })
  const runtime = new PlanPalAgentRuntime(stores, tools, invalidStructuredGateway)
  const events: AgentEvent[] = []
  const run = await runtime.run({ planId: plan.id, message: '把晚饭换近一点', modelConfig }, collect(events))
  const action = (await stores.plans.getPlan(plan.id))?.pendingAction
  return result('eval-empty-tool-result', '工具返回空候选', ['tool-failure', 'clarification', 'regression'], [
    check('waiting', run.status === 'waiting_for_user', `got ${run.status}`),
    check('typed_clarification', action?.kind === 'clarification', action?.kind ?? 'none'),
    check('tool_trace', events.some((event) => event.type === 'tool.result'), 'tool result is observable'),
  ])
}

async function invalidStructuredCase() {
  let calls = 0
  const gateway: AgentModelGateway = {
    generateAssistantReply: async () => {
      calls += 1
      return '{invalid structured output'
    },
  }
  const { runtime, plan } = await setupRuntime(gateway)
  const events: AgentEvent[] = []
  const run = await runtime.run({
    planId: plan.id,
    message: '把晚饭换近一点',
    modelConfig,
  }, collect(events))
  return result('eval-invalid-structured-output', '模型返回不合法 structured output', ['model-failure', 'fallback', 'regression'], [
    check('one_repair_retry', calls === 2, `model calls: ${calls}`),
    check('deterministic_fallback', run.status === 'waiting_for_user', `got ${run.status}`),
    check('fallback_trace', events.some((event) => event.type === 'agent.model.error'), 'model error recorded'),
  ])
}

async function setupRuntime(gateway?: AgentModelGateway) {
  const stores = createInMemoryStores()
  const plan = await stores.plans.createPlan(createPlanFromPrompt('晚上两个人附近吃饭'))
  const runtime = new PlanPalAgentRuntime(stores, createDefaultToolRegistry(), gateway ?? invalidStructuredGateway)
  return { stores, plan, runtime }
}

function buildNamedPlan(): Plan {
  let plan = createPlanFromPrompt('晚上两个人附近吃饭')
  const template = plan.segments.find((segment) => !segment.isTransit)
  if (!template) throw new Error('plan segment template missing')
  for (const segment of [
    namedSegment(template, 'seg_eval_coffee', '咖啡休息', 'drinks'),
    namedSegment(template, 'seg_eval_hotel', '酒店安排', 'leisure', 'hotel'),
  ]) {
    plan = applyPlanCommand(plan, { type: 'ADD_SEGMENT', source: 'system', segment }).plan
  }
  return plan
}

function namedSegment(
  template: PlanSegment,
  id: string,
  title: string,
  phase: PlanSegment['phase'],
  serviceCategory?: PlanSegment['serviceCategory'],
): PlanSegment {
  return { ...template, id, title, place: title, phase, serviceCategory, locked: false, isTransit: false }
}

function result(
  id: string,
  title: string,
  tags: string[],
  checks: ArchitectureEvalResult['checks'],
): ArchitectureEvalResult {
  return { id, title, tags, passed: checks.every((item) => item.passed), checks }
}

function check(label: string, passed: boolean, detail: string) {
  return { label, passed, detail }
}

function collect(events: AgentEvent[]) {
  return (event: AgentEvent) => { events.push(event) }
}

function nodePath(events: AgentEvent[]) {
  return events
    .filter((event) => event.type === 'graph.node.finished')
    .map((event) => String(readObject(event.payload).node ?? ''))
    .filter(Boolean)
}

function isStrictlyIncreasing(events: AgentEvent[]) {
  return events.every((event, index) => index === 0 || event.sequence > events[index - 1]!.sequence)
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
