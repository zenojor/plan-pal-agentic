import { HumanMessage } from '@langchain/core/messages'
import { Command, MemorySaver, type BaseCheckpointSaver } from '@langchain/langgraph'
import {
  createId,
  nowIso,
  type AgentEvent,
  type AgentRun,
  type PendingAction,
} from '@planpal/domain'
import type { PlanPalStores } from '@planpal/db'
import { buildPlanPalLangGraph } from './graph'
import { defaultModelGateway, type AgentModelGateway } from './graph-model'
import { assertClientModelConfig, type ClientModelConfig } from './model'
import { PlanPalResumeSchema, type PlanPalResume } from './schemas'
import { RuntimeEventEmitter } from './runtime-events'
import { createGraphStreamTracker, mapGraphStreamChunk, readActionContext } from './runtime-stream'
import { createDefaultToolRegistry, type ToolRegistry } from './tools'

export type AgentRunInput = {
  planId: string
  message: string
  selectedSegmentId?: string
  candidateActionId?: string
  interactionSource?: 'chat' | 'candidate-card'
  modelConfig: ClientModelConfig
}

export type AgentResumeInput = {
  planId: string
  runId: string
  actionId: string
  payload: unknown
  modelConfig: ClientModelConfig
}

export type AgentEventSink = (event: AgentEvent) => void | Promise<void>

export class PlanPalAgentRuntime {
  constructor(
    private readonly stores: PlanPalStores,
    private readonly tools: ToolRegistry = createDefaultToolRegistry(),
    private readonly modelGateway: AgentModelGateway = defaultModelGateway,
    private readonly checkpointer: BaseCheckpointSaver = new MemorySaver(),
  ) {
    this.tools.bindPlanLookup((planId) => this.stores.plans.getPlan(planId))
  }

  async run(input: AgentRunInput, sink: AgentEventSink) {
    const modelConfig = assertClientModelConfig(input.modelConfig)
    const plan = await this.stores.plans.getPlan(input.planId)
    if (!plan) throw new Error('Plan not found')
    const waiting = (await this.stores.agents.listRuns(input.planId))
      .find((run) => run.status === 'waiting_for_user')
    if (waiting && plan.pendingAction) {
      return this.resume({
        planId: input.planId,
        runId: waiting.id,
        actionId: plan.pendingAction.id,
        payload: { answer: input.message, interactionSource: input.interactionSource ?? 'chat' },
        modelConfig,
      }, sink)
    }
    if (waiting) throw new Error(`Run ${waiting.id} is waiting for resume`)

    const runId = createId('run')
    const threadId = planThreadId(input.planId)
    const run: AgentRun = {
      id: runId,
      planId: input.planId,
      status: 'running',
      inputMessage: input.message,
      checkpointId: threadId,
      threadId,
      createdAt: nowIso(),
    }
    await this.stores.agents.createRun(run)
    const emitter = await RuntimeEventEmitter.create(this.stores, sink, runId, input.planId)
    await emitter.emit('agent.started', 'Agent run started', { threadId, status: 'running' })
    await emitter.emit('run.status', 'Run is running', { status: 'running', threadId })

    const candidateAction = plan.pendingAction?.kind === 'candidate-selection'
      && (!input.candidateActionId || plan.pendingAction.id === input.candidateActionId)
      ? plan.pendingAction
      : undefined

    const graph = buildPlanPalLangGraph({
      stores: this.stores,
      tools: this.tools,
      modelGateway: this.modelGateway,
      modelConfig,
      checkpointer: this.checkpointer,
    })
    const config = graphConfig(threadId)
    const inputState = {
      messages: [new HumanMessage(input.message)],
      planId: input.planId,
      runId,
      baseVersion: plan.currentVersion,
      metadata: {
        selectedSegmentId: input.selectedSegmentId ?? candidateAction?.targetSegmentId,
        candidateActionId: candidateAction?.id,
        interactionSource: input.interactionSource ?? 'chat',
        userMessage: input.message,
        routeSource: 'deterministic' as const,
        fallbackReasons: [],
        nodePath: [],
        modelCalls: 0,
        toolRetries: 0,
        activeToolCallIds: [],
        appliedCommands: [],
        appliedPatches: [],
        excludedCandidateIds: candidateAction
          ? [...new Set([
              ...(candidateAction.session?.seenPoiIds ?? candidateAction.excludeCandidateIds ?? []),
              ...candidateAction.candidates.map((candidate) => candidate.id),
            ])]
          : [],
        continuation: null,
        resumed: false,
      },
    }
    return this.executeGraph({ graph, graphInput: inputState, config, run, emitter })
  }

  async resume(input: AgentResumeInput, sink: AgentEventSink) {
    const modelConfig = assertClientModelConfig(input.modelConfig)
    const run = await this.stores.agents.getRun(input.runId)
    if (!run || run.planId !== input.planId) throw new Error('Agent run not found')
    if (run.status !== 'waiting_for_user') throw new Error('Agent run is not waiting for user input')
    const threadId = run.threadId ?? run.checkpointId ?? planThreadId(input.planId)
    const emitter = await RuntimeEventEmitter.create(this.stores, sink, run.id, input.planId)
    const plan = await this.stores.plans.getPlan(input.planId)
    const resume = normalizeResume(input.actionId, input.payload, plan?.pendingAction)
    await emitter.emit('interrupt.resumed', 'Graph interrupt resumed', {
      actionId: input.actionId,
      runId: input.runId,
      threadId,
      resume,
    })
    await this.stores.agents.saveRun({ ...run, status: 'running', finishedAt: undefined })
    await emitter.emit('run.status', 'Run resumed', { status: 'running', threadId })
    const graph = buildPlanPalLangGraph({
      stores: this.stores,
      tools: this.tools,
      modelGateway: this.modelGateway,
      modelConfig,
      checkpointer: this.checkpointer,
    })
    return this.executeGraph({
      graph,
      graphInput: new Command({ resume }),
      config: graphConfig(threadId),
      run: { ...run, status: 'running' },
      emitter,
    })
  }

  private async executeGraph(input: {
    graph: ReturnType<typeof buildPlanPalLangGraph>
    graphInput: Parameters<ReturnType<typeof buildPlanPalLangGraph>['stream']>[0]
    config: ReturnType<typeof graphConfig>
    run: AgentRun
    emitter: RuntimeEventEmitter
  }) {
    try {
      const stream = await input.graph.stream(input.graphInput, {
        ...input.config,
        streamMode: ['updates', 'custom'],
      })
      const streamTracker = createGraphStreamTracker()
      for await (const chunk of stream) {
        await mapGraphStreamChunk(this.stores, chunk, input.emitter, streamTracker)
      }
      const snapshot = await input.graph.getState(input.config)
      const state = snapshot.values
      const interrupts = snapshot.tasks.flatMap((task) => task.interrupts)
      if (interrupts.length > 0) {
        const payload = interrupts[0]?.value
        await input.emitter.emit('interrupt.requested', 'Graph execution interrupted for user input', payload)
        const actionContext = readActionContext(state)
        await input.emitter.emit('action.required', readActionTitle(payload), {
          action: readAction(payload),
          interrupt: payload,
          ...actionContext,
        })
        const waitingRun = { ...input.run, status: 'waiting_for_user' as const }
        await this.stores.agents.saveRun(waitingRun)
        await input.emitter.emit('run.status', 'Run is waiting for user', { status: 'waiting_for_user' })
        return { runId: input.run.id, status: 'waiting_for_user' as const }
      }
      const response = readObject(state.response)
      const status = response.status === 'cancelled' ? 'cancelled' as const
        : response.status === 'failed' ? 'failed' as const
          : 'completed' as const
      const text = typeof response.text === 'string' ? response.text : 'Agent run completed'
      await input.emitter.emit(status === 'failed' ? 'agent.error' : 'agent.finished', text, response)
      const finished = { ...input.run, status, finishedAt: nowIso() }
      await this.stores.agents.saveRun(finished)
      await input.emitter.emit('run.status', `Run ${status}`, { status })
      return { runId: input.run.id, status }
    } catch (error) {
      const message = redactRuntimeError(error)
      await input.emitter.emit('agent.error', message, { error: message })
      await this.stores.agents.saveRun({ ...input.run, status: 'failed', finishedAt: nowIso() })
      await input.emitter.emit('run.status', 'Run failed', { status: 'failed', error: message })
      return { runId: input.run.id, status: 'failed' as const }
    }
  }

}

export function planThreadId(planId: string) {
  return `plan:${planId}`
}

function graphConfig(threadId: string) {
  return { configurable: { thread_id: threadId } }
}

function normalizeResume(actionId: string, payload: unknown, action?: PendingAction): PlanPalResume {
  const value = readObject(payload)
  if (typeof value.decision === 'string') return PlanPalResumeSchema.parse({ ...value, actionId })
  if (typeof value.candidateId === 'string') return PlanPalResumeSchema.parse({ ...value, actionId, decision: 'selected' })
  if (typeof value.offeringId === 'string') return PlanPalResumeSchema.parse({ ...value, actionId, decision: 'selected' })
  if (typeof value.variantId === 'string') return PlanPalResumeSchema.parse({ ...value, actionId, decision: 'selected' })
  if (typeof value.answer === 'string') {
    const answer = value.answer.trim().toLowerCase()
    if (matchesMechanicalAnswer(answer, ['还是算了', '算了', '取消', '不要了', 'cancel'])) {
      return PlanPalResumeSchema.parse({ actionId, decision: 'rejected' })
    }
    if (matchesMechanicalAnswer(answer, ['换一个', '再换', '换一批', '别的', 'another'])) {
      return PlanPalResumeSchema.parse({ actionId, decision: 'retry' })
    }
    if (matchesMechanicalAnswer(answer, ['确认', '确定', '可以', 'approved'])) {
      return PlanPalResumeSchema.parse({ actionId, decision: 'approved' })
    }
    const ordinal = readOrdinal(answer)
    if (ordinal !== undefined && action) {
      const candidates = action.kind === 'candidate-selection' ? action.candidates : []
      const offerings = action.kind === 'service-item-selection' ? action.offerings : []
      const variants = action.kind === 'plan-variant-selection' ? action.variants : []
      const candidateId = readObject(candidates[ordinal]).id
      const offeringId = readObject(offerings[ordinal]).id
      const variantId = readObject(variants[ordinal]).id
      if (typeof candidateId === 'string') return PlanPalResumeSchema.parse({ actionId, decision: 'selected', candidateId })
      if (typeof offeringId === 'string') return PlanPalResumeSchema.parse({ actionId, decision: 'selected', offeringId })
      if (typeof variantId === 'string') return PlanPalResumeSchema.parse({ actionId, decision: 'selected', variantId })
    }
    return PlanPalResumeSchema.parse({
      ...value,
      actionId,
      decision: action?.kind === 'candidate-selection' ? 'revise' : 'answered',
    })
  }
  return PlanPalResumeSchema.parse({ actionId, decision: value.confirmed === false ? 'rejected' : 'approved' })
}

function matchesMechanicalAnswer(value: string, answers: string[]) {
  const normalized = value.replace(/[，。！？、,.!?\s]/g, '')
  return answers.some((answer) => normalized === answer.replace(/[，。！？、,.!?\s]/g, ''))
}

function readOrdinal(value: string) {
  const normalized = value.toLowerCase().replace(/[，。！？、,.!?\s]/g, '')
  if (/^(?:就|选|选择)?(?:第二个|第2个|2nd)$/.test(normalized)) return 1
  if (/^(?:就|选|选择)?(?:第三个|第3个|3rd)$/.test(normalized)) return 2
  if (/^(?:就|选|选择)?(?:第一个|第1个|1st)$/.test(normalized)) return 0
  return undefined
}

function readAction(payload: unknown) {
  return readObject(payload).action
}

function readActionTitle(payload: unknown) {
  const action = readObject(readAction(payload))
  return typeof action.title === 'string' ? action.title : 'User input required'
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function redactRuntimeError(error: unknown) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')
}
