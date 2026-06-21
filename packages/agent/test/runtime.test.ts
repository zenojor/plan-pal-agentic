import { describe, expect, it } from 'vitest'
import { createInMemoryStores } from '@planpal/db'
import { createPlanFromPrompt, type AgentEvent, type PendingAction } from '@planpal/domain'
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

    await runtime.run({ planId: plan.id, message: '你是什么模型', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(calls).toHaveLength(1)
    const modelErrors = events.filter((event) => event.type === 'agent.model.error')
    expect(modelErrors.length).toBeGreaterThan(0)
    expect(modelErrors[0]?.message).toContain('模型调用失败')
    expect(JSON.stringify(modelErrors)).not.toContain(config.apiKey)
    expect(JSON.stringify(modelErrors)).toContain('[redacted]')
    const finished = [...events].reverse().find((event) => event.type === 'agent.finished')
    expect(finished?.message).toContain('模型调用失败，已切换离线 fallback')
    expect(finished?.payload).toMatchObject({
      usedModel: false,
      fallbackUsed: true,
    })
  })

  it('keeps answer-phase model failures to one final fallback chat result', async () => {
    const calls: unknown[] = []
    const { plan, runtime } = await createRuntime({
      generateAssistantReply: async (_config, messages) => {
        calls.push(messages)
        throw new Error(`Provider returned HTTP 404 for ${config.apiKey}`)
      },
    })
    const events: AgentEvent[] = []

    await runtime.run({ planId: plan.id, message: '你是什么模型', modelConfig: config }, (event) => {
      events.push(event)
    })

    expect(calls).toHaveLength(1)
    expect(events.filter((event) => event.type === 'agent.model.error')).toHaveLength(1)
    const finishedEvents = events.filter((event) => event.type === 'agent.finished')
    expect(finishedEvents).toHaveLength(1)
    expect(finishedEvents[0]?.message).toContain('模型调用失败，已切换离线 fallback')
    expect(JSON.stringify(finishedEvents)).not.toContain(config.apiKey)
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
    }, (event) => {
      resumeEvents.push(event)
    })

    expect(resumed.status).toBe('completed')
    expect(resumeEvents.map((event) => event.type)).toEqual(['plan.updated', 'agent.finished'])

    const updated = await stores.plans.getPlan(plan.id)
    expect(updated?.currentVersion).toBe(3)
    expect(updated?.pendingAction).toBeUndefined()
    expect(updated?.segments.find((segment) => segment.phase === 'dining')?.title).toBe(candidate.segment.title)

    const persistedEvents = await stores.agents.listEvents(plan.id)
    expect(persistedEvents.some((event) => event.type === 'action.required')).toBe(true)
    expect(persistedEvents.some((event) => event.type === 'agent.finished')).toBe(true)
    expect(JSON.stringify(persistedEvents)).not.toContain(config.apiKey)
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





