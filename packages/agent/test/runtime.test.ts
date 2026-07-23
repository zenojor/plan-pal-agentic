import { describe, expect, it } from 'vitest'
import { createInMemoryStores } from '@planpal/db'
import { applyPlanCommand, createPlanFromPrompt, getFictionalPoiById, type AgentEvent, type PendingAction } from '@planpal/domain'
import { createDefaultToolRegistry, PlanPalAgentRuntime, type AgentModelGateway } from '../src'

const config = {
  baseURL: 'https://api.example.com/v1',
  apiKey: 'sk-secret-for-test',
  model: 'demo-chat',
}

async function createRuntime(gateway: AgentModelGateway) {
  const stores = createInMemoryStores()
  const plan = await stores.plans.createPlan(createPlanFromPrompt('晚上两个人附近吃饭'))
  const runtime = new PlanPalAgentRuntime(stores, createDefaultToolRegistry(), gateway)
  return { plan, runtime, stores }
}

describe('agent runtime model transparency', () => {
  it('uses the configured model for QA turns and marks the final event', async () => {
    const calls: unknown[] = []
    const { plan, runtime } = await createRuntime({
      generateAssistantReply: async (_config, messages) => {
        calls.push(messages)
        return '我是当前配置的 demo-chat。'
      },
    })
    const events: AgentEvent[] = []

    await runtime.run({ planId: plan.id, message: '你是什么模型', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(calls).toHaveLength(1)
    expect(modelEventPhases(events, 'agent.model.started')).toEqual(['answer'])
    expect(modelEventPhases(events, 'agent.model.finished')).toEqual(['answer'])
    const finished = [...events].reverse().find((event) => event.type === 'agent.finished')
    expect(finished?.message).toBe('我是当前配置的 demo-chat。')
    expect(finished?.payload).toMatchObject({ usedModel: true, fallbackUsed: false })
    expect(JSON.stringify(events)).not.toContain(config.apiKey)
  })


  it('streams answer deltas before the final QA result', async () => {
    const { plan, runtime } = await createRuntime({
      generateAssistantReply: async () => {
        throw new Error('QA streaming should not wait for intent preflight')
      },
      streamAssistantReply: async (_config, _messages, onDelta) => {
        await onDelta('我是')
        await onDelta(' demo-chat')
        return '我是 demo-chat'
      },
    })
    const events: AgentEvent[] = []

    await runtime.run({ planId: plan.id, message: '你是什么模型', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(modelEventPhases(events, 'agent.model.started')).toEqual(['answer'])
    const deltaEvents = events.filter((event) => event.type === 'agent.message.delta')
    expect(deltaEvents.map((event) => event.message)).toEqual(['我是', ' demo-chat'])
    expect(deltaEvents[0]?.payload).toMatchObject({ usedModel: true, fallbackUsed: false, phase: 'answer' })
    expect(events.findIndex((event) => event.type === 'agent.message.delta')).toBeLessThan(
      events.findIndex((event) => event.type === 'agent.finished'),
    )
    const finished = events.find((event) => event.type === 'agent.finished')
    expect(finished?.message).toBe('我是 demo-chat')
    expect(JSON.stringify(events)).not.toContain(config.apiKey)
  })
  it('emits redacted model errors instead of silently hiding failures', async () => {
    const calls: unknown[] = []
    const { plan, runtime } = await createRuntime({
      generateAssistantReply: async (_config, messages) => {
        calls.push(messages)
        throw new Error(`Provider returned HTTP 401 for ${config.apiKey}`)
      },
    })
    const events: AgentEvent[] = []

    const result = await runtime.run({ planId: plan.id, message: '你是什么模型', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(calls).toHaveLength(1)
    const modelErrors = events.filter((event) => event.type === 'agent.model.error')
    expect(modelErrors.length).toBeGreaterThan(0)
    expect(modelErrors[0]?.message).toContain('模型调用失败')
    expect(JSON.stringify(modelErrors)).not.toContain(config.apiKey)
    expect(JSON.stringify(modelErrors)).toContain('[redacted]')
    expect(result.status).toBe('failed')
    expect(events.some((event) => event.type === 'agent.finished')).toBe(false)
    const terminalError = events.filter((event) => event.type === 'agent.error').at(-1)
    expect(terminalError?.message).toContain('模型调用失败')
    expect(terminalError?.payload).toMatchObject({ fallbackUsed: false })
  })

  it('keeps answer-phase model failures to one failed terminal result', async () => {
    const calls: unknown[] = []
    const { plan, runtime } = await createRuntime({
      generateAssistantReply: async (_config, messages) => {
        calls.push(messages)
        throw new Error(`Provider returned HTTP 404 for ${config.apiKey}`)
      },
    })
    const events: AgentEvent[] = []

    const result = await runtime.run({ planId: plan.id, message: '你是什么模型', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(calls).toHaveLength(1)
    expect(events.filter((event) => event.type === 'agent.model.error')).toHaveLength(1)
    expect(result.status).toBe('failed')
    expect(events.filter((event) => event.type === 'agent.finished')).toHaveLength(0)
    const terminalErrors = events.filter((event) => event.type === 'agent.error')
    expect(terminalErrors.at(-1)?.message).toContain('模型调用失败')
    expect(JSON.stringify(terminalErrors)).not.toContain(config.apiKey)
  })

  it('uses model intent for command-like turns while keeping plan writes deterministic', async () => {
    const { plan, runtime } = await createRuntime({
      generateAssistantReply: async () => JSON.stringify({
        action: 'replace',
        targetPhase: 'dining',
        query: '换近一点',
        reason: 'nearby dinner request',
      }),
    })
    const events: AgentEvent[] = []

    const result = await runtime.run({ planId: plan.id, message: '把晚饭换近一点', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(result.status).toBe('waiting_for_user')
    expect(events.some((event) => event.type === 'agent.model.finished')).toBe(true)
    const action = events.find((event) => event.type === 'action.required')
    expect(action?.payload).toMatchObject({
      routeSource: 'model',
      usedModel: true,
    })
    expect(action?.payload).toMatchObject({
      intentSummary: expect.objectContaining({
        summary: expect.stringContaining('dining'),
        rankingSignals: expect.arrayContaining(['phase:dining']),
      }),
    })
    expect(JSON.stringify(events)).not.toContain(config.apiKey)
  })

  it('emits the first delta while qaAgent is still running and never replays streamed deltas', async () => {
    let releaseModel: (() => void) | undefined
    let modelCompleted = false
    let firstDeltaObserved: (() => void) | undefined
    const modelGate = new Promise<void>((resolve) => {
      releaseModel = resolve
    })
    const firstDelta = new Promise<void>((resolve) => {
      firstDeltaObserved = resolve
    })
    const { plan, runtime } = await createRuntime({
      generateAssistantReply: async () => 'unused',
      streamAssistantReply: async (_config, _messages, onDelta) => {
        await onDelta('第一段')
        await modelGate
        await onDelta('🙂 second')
        modelCompleted = true
        return '第一段🙂 second'
      },
    })
    const events: AgentEvent[] = []

    const runPromise = runtime.run({ planId: plan.id, message: '你是什么模型', modelConfig: config }, (event) => {
      events.push(event)
      if (event.type === 'agent.message.delta') firstDeltaObserved?.()
    })

    await firstDelta
    expect(modelCompleted).toBe(false)
    expect(events.some((event) => event.type === 'graph.node.finished'
      && (event.payload as { node?: string } | undefined)?.node === 'qaAgent')).toBe(false)

    releaseModel?.()
    await runPromise

    const deltas = events.filter((event) => event.type === 'agent.message.delta')
    expect(deltas.map((event) => event.message)).toEqual(['第一段', '🙂 second'])
    expect(deltas[0]?.payload).toMatchObject({ producedAt: expect.any(String) })
    expect(deltas.map((event) => event.message).join('')).toBe('第一段🙂 second')
    expect(events.filter((event) => event.type === 'agent.message.delta')).toHaveLength(2)
    expect(events.find((event) => event.type === 'agent.finished')?.message).toBe('第一段🙂 second')
    expect(events.findIndex((event) => event.type === 'agent.message.delta')).toBeLessThan(
      events.findIndex((event) => event.type === 'graph.node.finished'
        && (event.payload as { node?: string } | undefined)?.node === 'qaAgent'),
    )
  })

  it('pauses for clarification instead of guessing vague edits', async () => {
    const { plan, runtime, stores } = await createRuntime({
      generateAssistantReply: async () => {
        return '{invalid structured output'
      },
    })
    const events: AgentEvent[] = []

    const run = await runtime.run({ planId: plan.id, message: '调整一下', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(run.status).toBe('waiting_for_user')
    expect(events.some((event) => event.type === 'tool.called')).toBe(false)
    const action = events.find((event) => event.type === 'action.required')
    expect(action?.payload).toMatchObject({
      action: expect.objectContaining({ kind: 'clarification' }),
    })
    const updated = await stores.plans.getPlan(plan.id)
    expect(updated?.pendingAction?.kind).toBe('clarification')
  })

  it('previews a sandbox receipt before asking the user to confirm an order command', async () => {
    const { plan, runtime, stores } = await createRuntime({
      generateAssistantReply: async () => {
        return '{invalid structured output'
      },
    })
    const events: AgentEvent[] = []

    const result = await runtime.run({ planId: plan.id, message: '可以模拟下单了', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(result.status).toBe('waiting_for_user')
    expect(events.map((event) => event.type)).toContain('tool.called')
    expect(events.map((event) => event.type)).toContain('tool.result')
    expect(events.map((event) => event.type)).toContain('action.required')
    expect(events.find((event) => event.type === 'tool.called')?.payload).toMatchObject({
      toolName: 'order.preview',
      effect: 'read-only',
    })
    const action = commandActionFromEvent(events.find((event) => event.type === 'action.required'))
    expect(action.severity).toBe('finalizing')
    const updated = await stores.plans.getPlan(plan.id)
    expect(updated?.status).toBe('ready')
    expect(updated?.sandboxOrder).toBeUndefined()
  })

  it('gates destructive agent commands until resume confirmation', async () => {
    const { plan, runtime, stores } = await createRuntime({
      generateAssistantReply: async () => {
        return '{invalid structured output'
      },
    })
    const events: AgentEvent[] = []

    const run = await runtime.run({ planId: plan.id, message: '删除所有节点', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(run.status).toBe('waiting_for_user')
    const action = commandActionFromEvent(events.find((event) => event.type === 'action.required'))
    expect(action.commands[0]?.type).toBe('CLEAR_PLAN_SEGMENTS')
    expect(action.severity).toBe('destructive')
    const beforeConfirm = await stores.plans.getPlan(plan.id)
    expect(beforeConfirm?.segments).toHaveLength(plan.segments.length)

    const resumeEvents: AgentEvent[] = []
    await runtime.resume({
      planId: plan.id,
      runId: run.runId,
      actionId: action.id,
      payload: { confirmed: true },
      modelConfig: config,
    }, (event) => {
      resumeEvents.push(event)
    })

    expect(resumeEvents.map((event) => event.type)).toEqual(expect.arrayContaining([
      'interrupt.resumed',
      'plan.updated',
      'agent.finished',
    ]))
    expect(resumeEvents.find((event) => event.type === 'agent.finished')?.message).toBe('已应用修改，可撤销')
    const afterConfirm = await stores.plans.getPlan(plan.id)
    expect(afterConfirm?.segments).toEqual([])
    expect(afterConfirm?.pendingAction).toBeUndefined()
  })

  it('shows confirmation and deletes one selected node after approval', async () => {
    const { plan, runtime, stores } = await createRuntime({
      generateAssistantReply: async () => '{invalid structured output',
    })
    const target = plan.segments[0]!
    const events: AgentEvent[] = []

    const run = await runtime.run({
      planId: plan.id,
      message: '删除这个节点',
      selectedSegmentId: target.id,
      modelConfig: config,
    }, (event) => {
      events.push(event)
    })

    expect(run.status).toBe('waiting_for_user')
    const action = commandActionFromEvent(events.find((event) => event.type === 'action.required'))
    expect(action).toMatchObject({
      kind: 'command-confirmation',
      title: '确认删除节点',
      severity: 'destructive',
      commands: [{ type: 'DELETE_SEGMENT', segmentId: target.id }],
    })
    expect((await stores.plans.getPlan(plan.id))?.segments.some((segment) => segment.id === target.id)).toBe(true)

    const resumed = await runtime.resume({
      planId: plan.id,
      runId: run.runId,
      actionId: action.id,
      payload: { confirmed: true },
      modelConfig: config,
    }, () => undefined)

    expect(resumed.status).toBe('completed')
    const afterConfirm = await stores.plans.getPlan(plan.id)
    expect(afterConfirm?.segments.some((segment) => segment.id === target.id)).toBe(false)
    expect(afterConfirm?.segments).toHaveLength(plan.segments.length - 1)
    expect(afterConfirm?.pendingAction).toBeUndefined()
  })

  it('resumes candidate selection and persists the chosen segment through commands', async () => {
    const { plan, runtime, stores } = await createRuntime({
      generateAssistantReply: async () => JSON.stringify({
        action: 'replace',
        targetPhase: 'dining',
        query: '换近一点',
        reason: 'nearby dinner request',
      }),
    })
    const runEvents: AgentEvent[] = []

    const run = await runtime.run({ planId: plan.id, message: '把晚饭换近一点', modelConfig: config }, (event) => {
      runEvents.push(event)
    })

    expect(run.status).toBe('waiting_for_user')
    const action = candidateActionFromEvent(runEvents.find((event) => event.type === 'action.required'))
    expect(action.mode).toBe('replace')
    expect(action.candidates.length).toBeGreaterThan(1)
    const candidate = action.candidates[0]!
    const resumeEvents: AgentEvent[] = []

    const resumed = await runtime.resume({
      planId: plan.id,
      runId: run.runId,
      actionId: action.id,
      payload: { candidateId: candidate.id },
      modelConfig: config,
    }, (event) => {
      resumeEvents.push(event)
    })

    expect(resumed.status).toBe('completed')
    expect(resumeEvents.map((event) => event.type)).toEqual(expect.arrayContaining([
      'interrupt.resumed',
      'plan.updated',
      'agent.finished',
    ]))

    const updated = await stores.plans.getPlan(plan.id)
    expect(updated?.currentVersion).toBe(3)
    expect(updated?.pendingAction).toBeUndefined()
    expect(updated?.segments.find((segment) => segment.phase === 'dining')?.title).toBe(candidate.segment.title)

    const persistedEvents = await stores.agents.listEvents(plan.id)
    expect(persistedEvents.some((event) => event.type === 'action.required')).toBe(true)
    expect(persistedEvents.some((event) => event.type === 'agent.finished')).toBe(true)
    expect(JSON.stringify(persistedEvents)).not.toContain(config.apiKey)
  })

  it('uses model add intent to create an add-after candidate workflow', async () => {
    const { plan, runtime, stores } = await createRuntime({
      generateAssistantReply: async () => JSON.stringify({
        action: 'add',
        targetSegmentId: plan.segments[0]!.id,
        query: '加一个咖啡休息点',
        reason: 'extra coffee stop request',
      }),
    })
    const events: AgentEvent[] = []

    const run = await runtime.run({ planId: plan.id, message: '中间再加个咖啡休息', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(run.status).toBe('waiting_for_user')
    const action = candidateActionFromEvent(events.find((event) => event.type === 'action.required'))
    expect(action.mode).toBe('add-after')
    expect(action.afterSegmentId).toBe(plan.segments[0]!.id)
    expect(action.candidates.length).toBeGreaterThan(1)

    const candidate = action.candidates[0]!
    await runtime.resume({
      planId: plan.id,
      runId: run.runId,
      actionId: action.id,
      payload: { candidateId: candidate.id },
      modelConfig: config,
    }, () => undefined)

    const updated = await stores.plans.getPlan(plan.id)
    expect(updated?.segments).toHaveLength(plan.segments.length + 1)
    const anchorIndex = updated?.segments.findIndex((segment) => segment.id === plan.segments[0]!.id) ?? -1
    expect(updated?.segments[anchorIndex + 1]?.title).toBe(candidate.segment.title)
    expect(JSON.stringify(events)).not.toContain(config.apiKey)
  })

  it('uses offering.search and command-gated resume for service item selection', async () => {
    const stores = createInMemoryStores()
    const basePlan = createPlanFromPrompt('晚上两个人附近吃饭')
    const moviePoi = getFictionalPoiById('poi_orbit_cinema')!
    const moviePlan = applyPlanCommand(basePlan, {
      type: 'ADD_SEGMENT',
      source: 'puzzle',
      afterSegmentId: basePlan.segments[0]!.id,
      segment: {
        id: 'seg_movie_runtime',
        phase: 'activity',
        serviceCategory: 'movie',
        title: moviePoi.activityTitle,
        place: moviePoi.name,
        startTime: '16:00',
        endTime: '18:00',
        durationMinutes: 120,
        status: '待确认',
        reason: moviePoi.description,
        budget: moviePoi.budget,
        poiId: moviePoi.id,
        lnglat: moviePoi.lnglat,
      },
    }).plan
    const plan = await stores.plans.createPlan(moviePlan)
    const runtime = new PlanPalAgentRuntime(stores, createDefaultToolRegistry(), {
      generateAssistantReply: async () => {
        return '{invalid structured output'
      },
    })
    const events: AgentEvent[] = []

    const run = await runtime.run({ planId: plan.id, message: '买两张电影票', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(run.status).toBe('waiting_for_user')
    expect(events.find((event) => event.type === 'tool.called')?.payload).toMatchObject({
      toolName: 'offering.search',
      effect: 'read-only',
    })
    const action = serviceActionFromEvent(events.find((event) => event.type === 'action.required'))
    expect(action.segmentId).toBe('seg_movie_runtime')
    expect(action.offerings.every((offering) => offering.category === 'movie')).toBe(true)

    const resumeEvents: AgentEvent[] = []
    await runtime.resume({
      planId: plan.id,
      runId: run.runId,
      actionId: action.id,
      payload: { offeringId: action.offerings[0]!.id, quantity: 2 },
      modelConfig: config,
    }, (event) => {
      resumeEvents.push(event)
    })

    expect(resumeEvents.map((event) => event.type)).toEqual(expect.arrayContaining([
      'interrupt.resumed',
      'plan.updated',
      'agent.finished',
    ]))
    const updated = await stores.plans.getPlan(plan.id)
    expect(updated?.serviceSelections).toEqual([expect.objectContaining({
      offeringId: action.offerings[0]!.id,
      quantity: 2,
      segmentId: 'seg_movie_runtime',
    })])
  })
})

function modelEventPhases(events: AgentEvent[], type: AgentEvent['type']) {
  return events
    .filter((event) => event.type === type)
    .map((event) => event.payload)
    .map((payload) => payload && typeof payload === 'object' && 'phase' in payload ? String(payload.phase) : '')
}

function candidateActionFromEvent(event: AgentEvent | undefined) {
  expect(event?.type).toBe('action.required')
  const payload = event?.payload
  if (!payload || typeof payload !== 'object' || !('action' in payload)) {
    throw new Error('action.required payload is missing action')
  }
  const action = (payload as { action?: PendingAction }).action
  expect(action?.kind).toBe('candidate-selection')
  if (!action || action.kind !== 'candidate-selection') {
    throw new Error('expected candidate-selection action')
  }
  return action
}

function serviceActionFromEvent(event: AgentEvent | undefined) {
  expect(event?.type).toBe('action.required')
  const payload = event?.payload
  if (!payload || typeof payload !== 'object' || !('action' in payload)) {
    throw new Error('action.required payload is missing action')
  }
  const action = (payload as { action?: PendingAction }).action
  expect(action?.kind).toBe('service-item-selection')
  if (!action || action.kind !== 'service-item-selection') {
    throw new Error('expected service-item-selection action')
  }
  return action
}

function commandActionFromEvent(event: AgentEvent | undefined) {
  expect(event?.type).toBe('action.required')
  const payload = event?.payload
  if (!payload || typeof payload !== 'object' || !('action' in payload)) {
    throw new Error('action.required payload is missing action')
  }
  const action = (payload as { action?: PendingAction }).action
  expect(action?.kind).toBe('command-confirmation')
  if (!action || action.kind !== 'command-confirmation') {
    throw new Error('expected command-confirmation action')
  }
  return action
}





