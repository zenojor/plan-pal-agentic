import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AIMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages'
import { createInMemoryStores } from '@planpal/db'
import { createPlanFromPrompt, getFictionalPoiById, type AgentEvent, type PendingAction } from '@planpal/domain'
import { describe, expect, it } from 'vitest'
import {
  buildPlanPalLangGraph,
  createDefaultToolRegistry,
  createMemoryCheckpointer,
  createSqliteCheckpointer,
  PlanPalAgentRuntime,
  type AgentModelGateway,
  type ClientModelConfig,
} from '../src'

const modelConfig: ClientModelConfig = {
  apiKey: 'sk-test-only',
  baseURL: 'https://api.example.com/v1',
  model: 'test-chat',
}

const invalidStructuredGateway: AgentModelGateway = {
  generateAssistantReply: async () => '{invalid structured output',
}

describe('mature LangGraph runtime', () => {
  it('rejects execution without a model connection before creating a run', async () => {
    const { runtime, plan, stores } = await setup()

    await expect(runtime.run({
      planId: plan.id,
      message: '这个计划怎么样',
      modelConfig: undefined as never,
    }, () => undefined)).rejects.toThrow('Model baseURL, API key, and model are required')
    expect(await stores.agents.listRuns(plan.id)).toEqual([])
  })

  it('executes the compiled QA branch and records the real node path', async () => {
    const { runtime, plan } = await setup()
    const events: AgentEvent[] = []
    const result = await runtime.run({ planId: plan.id, message: '这个计划怎么样', modelConfig }, collect(events))

    expect(result.status).toBe('completed')
    expect(nodePath(events)).toEqual([
      'loadContext',
      'understandIntent',
      'routeIntent',
      'qaAgent',
      'finalize',
    ])
  })

  it('uses native AIMessage tool calls and grounds candidates in the exact ToolMessage result', async () => {
    const stores = createInMemoryStores()
    const plan = await stores.plans.createPlan(createPlanFromPrompt('晚上两个人附近吃饭'))
    const checkpointer = createMemoryCheckpointer()
    const tools = createDefaultToolRegistry()
    let boundToolNames: string[] = []
    const gateway: AgentModelGateway = {
      generateAssistantReply: async () => '',
      invokeStructured: async (_config, _messages, schema) => schema.parse({
        action: 'replace',
        targetPhase: 'dining',
        query: '换近一点',
        reason: 'replace dinner',
        confidence: 0.98,
      }),
      invokeWithTools: async (_config, _messages, boundTools) => {
        boundToolNames = boundTools.map((item) => item.name)
        const dining = plan.segments.find((segment) => segment.phase === 'dining')!
        return new AIMessage({
          content: '',
          tool_calls: [{
            id: 'call_native_poi',
            name: 'poi_search',
            args: { planId: plan.id, mode: 'replace', segmentId: dining.id, query: '换近一点' },
            type: 'tool_call',
          }],
        })
      },
    }
    const runtime = new PlanPalAgentRuntime(stores, tools, gateway, checkpointer)
    const events: AgentEvent[] = []
    const result = await runtime.run({ planId: plan.id, message: '把晚饭换近一点', modelConfig }, collect(events))

    expect(result.status).toBe('waiting_for_user')
    expect(events.some((event) => event.type === 'agent.message.delta')).toBe(false)
    expect(boundToolNames).toEqual(expect.arrayContaining([
      'poi_search', 'offering_search', 'route_estimate', 'weather_check', 'order_preview', 'get_current_plan',
    ]))
    const called = events.find((event) => event.type === 'tool.called')
    const returned = events.find((event) => event.type === 'tool.result')
    expect(called?.payload).toMatchObject({ nativeToolName: 'poi_search', toolCallId: 'call_native_poi' })
    expect(returned?.payload).toMatchObject({ nativeToolName: 'poi_search', tool_call_id: 'call_native_poi' })

    const action = actionFromEvents(events)
    expect(action.kind).toBe('candidate-selection')
    const callRecord = (await stores.agents.listToolCalls(result.runId))[0]!
    const toolCandidates = (JSON.parse(callRecord.resultJson!) as { candidates: Array<{ id: string }> }).candidates
    if (action.kind !== 'candidate-selection') throw new Error('expected candidates')
    expect(action.candidates.map((candidate) => candidate.id)).toEqual(toolCandidates.map((candidate) => candidate.id))

    const graph = buildPlanPalLangGraph({ stores, tools, modelGateway: gateway, modelConfig, checkpointer })
    const snapshot = await graph.getState({ configurable: { thread_id: `plan:${plan.id}` } })
    const messages = snapshot.values.messages as BaseMessage[]
    const ai = messages.find((message) => AIMessage.isInstance(message) && message.tool_calls?.some((call) => call.id === 'call_native_poi'))
    const toolMessage = messages.find((message) => ToolMessage.isInstance(message) && message.tool_call_id === 'call_native_poi')
    expect(ai).toBeDefined()
    expect(toolMessage).toBeDefined()
  })

  it('keeps “我中午想吃辣” grounded in spicy lunch POIs despite model intent and argument drift', async () => {
    const stores = createInMemoryStores()
    const plan = await stores.plans.createPlan(createPlanFromPrompt('今天中午两个人吃饭'))
    const tools = createDefaultToolRegistry()
    const gateway: AgentModelGateway = {
      generateAssistantReply: async () => '',
      invokeStructured: async (_config, _messages, schema) => schema.parse({
        action: 'qa',
        answer: '模型误判为问答',
        reason: 'incorrect model classification',
        confidence: 0.91,
      }),
      invokeWithTools: async () => new AIMessage({
        content: '',
        tool_calls: [{
          id: 'call_spicy_lunch',
          name: 'poi_search',
          args: {
            planId: 'wrong-plan',
            mode: 'replace',
            segmentId: 'wrong-segment',
            query: '不吃辣',
          },
          type: 'tool_call',
        }],
      }),
    }
    const runtime = new PlanPalAgentRuntime(stores, tools, gateway, createMemoryCheckpointer())
    const events: AgentEvent[] = []

    const result = await runtime.run({
      planId: plan.id,
      message: '我中午想吃辣',
      modelConfig,
    }, collect(events))

    expect(result.status).toBe('waiting_for_user')
    expect(events.some((event) => (
      event.type === 'agent.model.error'
      && JSON.stringify(event.payload).includes('intent-guard:model-qa-conflicted-with-replace')
    ))).toBe(true)
    const toolCall = (await stores.agents.listToolCalls(result.runId))[0]!
    expect(JSON.parse(toolCall.argsJson)).toMatchObject({
      planId: plan.id,
      mode: 'replace',
      query: '我中午想吃辣',
      segmentId: plan.segments.find((segment) => segment.phase === 'dining')?.id,
    })
    const action = actionFromEvents(events)
    expect(action.kind).toBe('candidate-selection')
    if (action.kind !== 'candidate-selection') throw new Error('expected spicy candidates')
    expect(action.candidates).toHaveLength(3)
    for (const candidate of action.candidates) {
      const poi = getFictionalPoiById(candidate.id)
      expect(poi).toBeDefined()
      expect(`${poi!.name}${poi!.description}${poi!.tags.join('')}`).toMatch(/辣|川湘|串串|麻辣|香辣/)
      expect(poi!.hours).toMatch(/10:|11:|12:/)
    }
  })

  it('retries invalid structured output once, then records deterministic fallback', async () => {
    let calls = 0
    const gateway: AgentModelGateway = {
      generateAssistantReply: async () => {
        calls += 1
        return '{not valid json'
      },
    }
    const { runtime, plan } = await setup(gateway)
    const events: AgentEvent[] = []
    const result = await runtime.run({ planId: plan.id, message: '把晚饭换近一点', modelConfig }, collect(events))

    expect(result.status).toBe('waiting_for_user')
    expect(calls).toBe(2)
    expect(events.some((event) => event.type === 'agent.model.error')).toBe(true)
    expect(actionFromEvents(events).kind).toBe('candidate-selection')
  })

  it.each([
    ['tool failure', async () => { throw new Error('mock tool unavailable') }],
    ['empty candidates', async () => ({ source: 'test', intent: {}, candidates: [] })],
  ])('falls back to clarification after %s', async (_title, poiSearch) => {
    const stores = createInMemoryStores()
    const plan = await stores.plans.createPlan(createPlanFromPrompt('晚上两个人附近吃饭'))
    const tools = createDefaultToolRegistry({ poi_search: poiSearch })
    const runtime = new PlanPalAgentRuntime(stores, tools, invalidStructuredGateway)
    const events: AgentEvent[] = []
    const result = await runtime.run({ planId: plan.id, message: '把晚饭换近一点', modelConfig }, collect(events))

    expect(result.status).toBe('waiting_for_user')
    expect(actionFromEvents(events).kind).toBe('clarification')
    if (_title === 'tool failure') {
      expect(events.find((event) => event.type === 'tool.result')?.payload).toMatchObject({ attempts: 2, status: 'error' })
    }
  })

  it('keeps multi-turn messages on the stable plan thread', async () => {
    const calls: string[] = []
    const gateway: AgentModelGateway = {
      generateAssistantReply: async (_config, messages) => {
        calls.push(JSON.stringify(messages))
        return calls.length === 1 ? '第一轮回答' : '第二轮回答'
      },
    }
    const { runtime, plan } = await setup(gateway)
    await runtime.run({ planId: plan.id, message: '这个计划怎么样', modelConfig }, () => undefined)
    await runtime.run({ planId: plan.id, message: '为什么这样安排', modelConfig }, () => undefined)

    expect(calls).toHaveLength(2)
    expect(calls[1]).toContain('这个计划怎么样')
    expect(calls[1]).toContain('第一轮回答')
  })

  it('interprets “就第二个” as a typed candidate-selection resume', async () => {
    const { runtime, plan, stores } = await setup()
    const firstEvents: AgentEvent[] = []
    const waiting = await runtime.run({ planId: plan.id, message: '把晚饭换近一点', modelConfig }, collect(firstEvents))
    const action = actionFromEvents(firstEvents)
    if (action.kind !== 'candidate-selection') throw new Error('expected candidate selection')
    const expected = action.candidates[1]!
    const resumeEvents: AgentEvent[] = []

    const result = await runtime.run({ planId: plan.id, message: '就第二个', modelConfig }, collect(resumeEvents))

    expect(result.runId).toBe(waiting.runId)
    expect(result.status).toBe('completed')
    expect((await stores.plans.getPlan(plan.id))?.segments.some((segment) => segment.title === expected.segment.title)).toBe(true)
    expect(resumeEvents.find((event) => event.type === 'interrupt.resumed')?.payload).toMatchObject({
      resume: { decision: 'selected', candidateId: expected.id },
    })
  })

  it('interprets “还是算了” as rejection and “换一个” as retry', async () => {
    const cancelledSetup = await setup()
    await cancelledSetup.runtime.run({ planId: cancelledSetup.plan.id, message: '把晚饭换近一点', modelConfig }, () => undefined)
    const cancelEvents: AgentEvent[] = []
    const cancelled = await cancelledSetup.runtime.run(
      { planId: cancelledSetup.plan.id, message: '还是算了', modelConfig },
      collect(cancelEvents),
    )
    expect(cancelled.status).toBe('cancelled')
    expect(cancelEvents.find((event) => event.type === 'interrupt.resumed')?.payload).toMatchObject({
      resume: { decision: 'rejected' },
    })

    const retrySetup = await setup()
    await retrySetup.runtime.run({ planId: retrySetup.plan.id, message: '把晚饭换近一点', modelConfig }, () => undefined)
    const retryEvents: AgentEvent[] = []
    const retried = await retrySetup.runtime.run(
      { planId: retrySetup.plan.id, message: '换一个', modelConfig },
      collect(retryEvents),
    )
    expect(['waiting_for_user', 'completed']).toContain(retried.status)
    expect(retryEvents.find((event) => event.type === 'interrupt.resumed')?.payload).toMatchObject({
      resume: { decision: 'retry' },
    })
  })

  it('resumes from the same SQLite checkpoint with a new runtime instance', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'planpal-checkpoint-'))
    const databasePath = join(directory, 'checkpoints.sqlite')
    const stores = createInMemoryStores()
    const plan = await stores.plans.createPlan(createPlanFromPrompt('晚上两个人附近吃饭'))
    const firstSaver = createSqliteCheckpointer(databasePath)
    const firstRuntime = new PlanPalAgentRuntime(stores, createDefaultToolRegistry(), invalidStructuredGateway, firstSaver)
    const firstEvents: AgentEvent[] = []
    const run = await firstRuntime.run({ planId: plan.id, message: '删除所有节点', modelConfig }, collect(firstEvents))
    const action = actionFromEvents(firstEvents)
    expect(run.status).toBe('waiting_for_user')
    firstSaver.db.close()

    const secondSaver = createSqliteCheckpointer(databasePath)
    const resumeEvents: AgentEvent[] = []
    const secondRuntime = new PlanPalAgentRuntime(stores, createDefaultToolRegistry(), invalidStructuredGateway, secondSaver)
    const resumed = await secondRuntime.resume({
      planId: plan.id,
      runId: run.runId,
      actionId: action.id,
      payload: { confirmed: true },
      modelConfig,
    }, collect(resumeEvents))

    expect(resumed.status).toBe('completed')
    expect((await stores.plans.getPlan(plan.id))?.segments).toEqual([])
    expect(nodePath(resumeEvents)).toEqual(['requestApproval', 'applyCommand', 'finalize'])
    expect(nodePath(resumeEvents)).not.toContain('understandIntent')
    const beforeMaximum = Math.max(...firstEvents.map((event) => event.sequence))
    expect(resumeEvents[0]?.sequence).toBe(beforeMaximum + 1)
    secondSaver.db.close()
    await rm(directory, { recursive: true, force: true })
  })
})

async function setup(gateway?: AgentModelGateway) {
  const stores = createInMemoryStores()
  const plan = await stores.plans.createPlan(createPlanFromPrompt('晚上两个人附近吃饭'))
  const runtime = new PlanPalAgentRuntime(
    stores,
    createDefaultToolRegistry(),
    gateway ?? { generateAssistantReply: async () => 'test answer' },
  )
  return { stores, plan, runtime }
}

function collect(events: AgentEvent[]) {
  return (event: AgentEvent) => { events.push(event) }
}

function nodePath(events: AgentEvent[]) {
  return events
    .filter((event) => event.type === 'graph.node.finished')
    .map((event) => (event.payload as { node?: string } | undefined)?.node)
    .filter((node): node is string => Boolean(node))
}

function actionFromEvents(events: AgentEvent[]): PendingAction {
  const event = events.find((item) => item.type === 'action.required')
  const action = (event?.payload as { action?: PendingAction } | undefined)?.action
  if (!action) throw new Error('action.required was not emitted')
  return action
}
