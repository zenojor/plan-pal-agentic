import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPlanFromPrompt, type AgentEvent } from '@planpal/domain'
import { createPlan, deletePlan, getMockPoi, getMockRoutes, getPlan, isAbortError, listPlans, searchMockPois, streamAgentResume, streamAgentRun, streamCreatePlan, testModelConfig } from './api'
import type { StoredModelConfig } from './modelConfig'

const config: StoredModelConfig = {
  apiKey: 'sk-secret-for-test',
  baseURL: 'https://api.example.com/v1',
  model: 'demo-chat',
  providerMode: 'auto',
  resolvedBaseURL: 'https://api.example.com/v1',
}

describe('web API streaming client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('passes BYOK config only through the request and parses chunked SSE events', async () => {
    const event = agentEvent({
      id: 'evt_1',
      message: 'Agent run started',
      type: 'agent.started',
    })
    let capturedInput: unknown
    let capturedInit: RequestInit | undefined
    vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
      capturedInput = input
      capturedInit = init
      const raw = `event: ${event.type}\nid: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`
      return new Response(chunkedStream([raw.slice(0, 12), raw.slice(12, 47), raw.slice(47)]), {
        status: 200,
      })
    })
    const events: AgentEvent[] = []

    await streamAgentRun('plan_1', config, {
      message: '把晚饭换近一点',
      selectedSegmentId: 'seg_1',
      candidateActionId: 'action_1',
      interactionSource: 'candidate-card',
    }, (nextEvent) => {
      events.push(nextEvent)
    })

    expect(String(capturedInput)).toContain('/api/plans/plan_1/agent/runs')
    const headers = capturedInit?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${config.apiKey}`)
    expect(headers['X-Model-Base-URL']).toBe(config.baseURL)
    expect(headers['X-Model-Name']).toBe(config.model)

    const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>
    expect(body).toMatchObject({
      baseURL: config.baseURL,
      message: '把晚饭换近一点',
      model: config.model,
      providerMode: 'auto',
      resolvedBaseURL: config.resolvedBaseURL,
      selectedSegmentId: 'seg_1',
      candidateActionId: 'action_1',
      interactionSource: 'candidate-card',
    })
    expect(body.apiKey).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain(config.apiKey)
    expect(events).toEqual([event])
  })

  it('parses the final SSE event even without a trailing event boundary', async () => {
    const event = agentEvent({
      id: 'evt_final',
      message: 'Final answer',
      type: 'agent.finished',
    })
    vi.stubGlobal('fetch', async () => {
      const raw = `event: ${event.type}\nid: ${event.id}\ndata: ${JSON.stringify(event)}`
      return new Response(chunkedStream([raw.slice(0, 24), raw.slice(24)]), {
        status: 200,
      })
    })
    const events: AgentEvent[] = []

    await streamAgentRun('plan_1', config, {
      message: '你好',
    }, (nextEvent) => {
      events.push(nextEvent)
    })

    expect(events).toEqual([event])
  })

  it('streams create-plan progress events and resolves the final created plan', async () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const progress = agentEvent({
      id: 'evt_create_progress',
      message: 'Plan creation started',
      type: 'agent.started',
    })
    const createdPayload = {
      type: 'plan.created',
      result: {
        events: [progress],
        plan,
        planId: plan.id,
        status: plan.status,
      },
    }
    let capturedInput: unknown
    let capturedInit: RequestInit | undefined
    vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
      capturedInput = input
      capturedInit = init
      const progressRaw = `event: ${progress.type}\nid: ${progress.id}\ndata: ${JSON.stringify(progress)}\n\n`
      const createdRaw = `event: plan.created\nid: ${plan.id}\ndata: ${JSON.stringify(createdPayload)}\n\n`
      return new Response(chunkedStream([progressRaw.slice(0, 18), progressRaw.slice(18), createdRaw]), {
        status: 200,
      })
    })
    const progressEvents: AgentEvent[] = []

    const result = await streamCreatePlan('下午两个人附近轻松玩', config, (event) => {
      progressEvents.push(event)
    })

    expect(String(capturedInput)).toContain('/api/plans/stream')
    const headers = capturedInit?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${config.apiKey}`)
    const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>
    expect(body).toMatchObject({
      baseURL: config.baseURL,
      model: config.model,
      modelConfigRef: 'client-byok',
      prompt: '下午两个人附近轻松玩',
      providerMode: 'auto',
      resolvedBaseURL: config.resolvedBaseURL,
    })
    expect(JSON.stringify(body)).not.toContain(config.apiKey)
    expect(progressEvents).toEqual([progress])
    expect(result).toMatchObject({
      planId: plan.id,
      status: plan.status,
    })
    expect(result.plan.id).toBe(plan.id)
  })
  it('creates model-backed plans with BYOK in headers and non-secret provider metadata in the body', async () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const event = agentEvent({
      id: 'evt_create_model',
      message: 'Plan variants generated',
      type: 'agent.finished',
    })
    let capturedInput: unknown
    let capturedInit: RequestInit | undefined
    vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
      capturedInput = input
      capturedInit = init
      return new Response(JSON.stringify({
        events: [event],
        plan,
        planId: plan.id,
        status: plan.status,
      }), { status: 200 })
    })

    const result = await createPlan('下午两个人附近轻松玩', config)

    expect(String(capturedInput)).toContain('/api/plans')
    const headers = capturedInit?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${config.apiKey}`)
    expect(headers['X-Model-Base-URL']).toBe(config.baseURL)
    expect(headers['X-Model-Name']).toBe(config.model)
    expect(headers['X-Model-Resolved-Base-URL']).toBe(config.resolvedBaseURL)

    const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>
    expect(body).toEqual({
      baseURL: config.baseURL,
      model: config.model,
      modelConfigRef: 'client-byok',
      prompt: '下午两个人附近轻松玩',
      providerMode: 'auto',
      resolvedBaseURL: config.resolvedBaseURL,
    })
    expect(body.apiKey).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain(config.apiKey)
    expect(result).toMatchObject({
      events: [event],
      planId: plan.id,
      status: plan.status,
    })
    expect(result.plan.id).toBe(plan.id)
  })

  it('does not send a create request when model config is missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(createPlan('晚上两个人吃饭', null as never)).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the verified BYOK connection again when resuming a graph interrupt', async () => {
    let capturedInit: RequestInit | undefined
    vi.stubGlobal('fetch', async (_input: unknown, init?: RequestInit) => {
      capturedInit = init
      return new Response('', { status: 200 })
    })

    await streamAgentResume('plan_1', config, {
      runId: 'run_1',
      actionId: 'action_1',
      payload: { decision: 'retry' },
    }, () => undefined)

    const headers = capturedInit?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${config.apiKey}`)
    expect(JSON.parse(String(capturedInit?.body))).toMatchObject({
      runId: 'run_1',
      actionId: 'action_1',
      baseURL: config.baseURL,
      model: config.model,
    })
    expect(String(capturedInit?.body)).not.toContain(config.apiKey)
  })


  it('deletes local demo plans without sending BYOK credentials', async () => {
    let capturedInput: unknown
    let capturedInit: RequestInit | undefined
    vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
      capturedInput = input
      capturedInit = init
      return new Response(JSON.stringify({ ok: true, planId: 'plan_1' }), { status: 200 })
    })

    await expect(deletePlan('plan_1')).resolves.toEqual({ ok: true, planId: 'plan_1' })

    expect(String(capturedInput)).toContain('/api/plans/plan_1')
    expect(capturedInit?.method).toBe('DELETE')
    const headers = capturedInit?.headers as Record<string, string> | undefined
    expect(headers?.Authorization).toBeUndefined()
    expect(JSON.stringify(capturedInit)).not.toContain(config.apiKey)
  })

  it('loads plan envelopes with version history summaries', async () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const abortController = new AbortController()
    let capturedInit: RequestInit | undefined
    const version = {
      createdAt: plan.createdAt,
      segmentCount: plan.segments.length,
      status: plan.status,
      summary: plan.summary,
      title: plan.title,
      updatedAt: plan.updatedAt,
      version: plan.currentVersion,
    }
    vi.stubGlobal('fetch', async (_input: unknown, init?: RequestInit) => {
      capturedInit = init
      return new Response(JSON.stringify({
        events: [],
        plan,
        versions: [version],
      }), { status: 200 })
    })

    await expect(getPlan(plan.id, abortController.signal)).resolves.toEqual({
      events: [],
      plan,
      versions: [version],
    })
    expect(capturedInit?.signal).toBe(abortController.signal)
  })
  it('lists recent plans for the home page entry point', async () => {
    const first = createPlanFromPrompt('下午两个人附近轻松玩')
    const second = createPlanFromPrompt('晚上两个人吃饭')
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
      plans: [first, second],
    }), { status: 200 }))

    await expect(listPlans()).resolves.toEqual([first, second])
  })

  it('loads local mock POIs and route estimates without BYOK credentials', async () => {
    let capturedInputs: string[] = []
    vi.stubGlobal('fetch', async (input: unknown) => {
      const url = String(input)
      capturedInputs = [...capturedInputs, url]
      if (url.includes('/api/mock/pois/poi_copper_cloud_hotpot')) {
        return new Response(JSON.stringify({
          source: 'fictional-local-mock-v2',
          poi: { id: 'poi_copper_cloud_hotpot', name: '铜锅云汤火锅社' },
        }), { status: 200 })
      }
      if (url.includes('/api/plans/plan_1/mock/routes')) {
        return new Response(JSON.stringify({
          source: 'mock-route',
          planId: 'plan_1',
          routes: [{ id: 'seg_1->seg_2', source: 'mock-route', options: [] }],
        }), { status: 200 })
      }
      return new Response(JSON.stringify({
        source: 'fictional-local-mock-v2',
        count: 1,
        pois: [{ id: 'poi_copper_cloud_hotpot', name: '铜锅云汤火锅社', searchScore: 120, reasons: ['匹配火锅需求'] }],
      }), { status: 200 })
    })

    await expect(searchMockPois({ phase: 'dining', q: '火锅', tags: ['火锅'], limit: 3 })).resolves.toMatchObject({
      count: 1,
      source: 'fictional-local-mock-v2',
    })
    await expect(getMockPoi('poi_copper_cloud_hotpot')).resolves.toMatchObject({
      poi: { id: 'poi_copper_cloud_hotpot' },
    })
    await expect(getMockRoutes('plan_1')).resolves.toMatchObject({
      source: 'mock-route',
      planId: 'plan_1',
    })
    expect(capturedInputs[0]).toContain('/api/mock/pois?')
    expect(capturedInputs[0]).toContain('phase=dining')
    expect(capturedInputs[0]).toContain('q=%E7%81%AB%E9%94%85')
    expect(JSON.stringify(capturedInputs)).not.toContain(config.apiKey)
  })

  it('treats malformed plan list responses as an empty recent list', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ plans: null }), { status: 200 }))

    await expect(listPlans()).resolves.toEqual([])
  })
  it('returns a stable model-test error when the API response is not JSON', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>bad gateway</html>', {
      status: 502,
      statusText: 'Bad Gateway',
    }))

    await expect(testModelConfig(config)).resolves.toEqual({
      ok: false,
      error: 'Request failed (502)',
    })
  })

  it('redacts secrets from entry-point API failures', async () => {
    vi.stubGlobal('fetch', async () => new Response(
      JSON.stringify({ error: 'bad token sk-secret-for-test with Bearer abc.def' }),
      { status: 401 },
    ))

    await expect(createPlan('下午两个人附近轻松玩', config)).rejects.toThrow(
      'bad token [redacted] with Bearer [redacted]',
    )
  })

  it('returns a redacted model-test error when fetch rejects', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network failed for Bearer abc.def and sk-secret-for-test')
    })

    const result = await testModelConfig(config)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('network failed')
    expect(result.error).toContain('Bearer [redacted]')
    expect(result.error).toContain('[redacted]')
    expect(result.error).not.toContain('abc.def')
    expect(result.error).not.toContain('sk-secret-for-test')
  })

  it('redacts network errors consistently for streamed Agent requests', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network failed for Bearer abc.def and sk-secret-for-test')
    })

    await expect(streamAgentRun('plan_1', config, { message: '你好' }, () => {})).rejects.toThrow(
      'network failed for Bearer [redacted] and [redacted]',
    )
  })

  it('preserves abort errors so callers can silently cancel obsolete requests', async () => {
    const abortError = new DOMException('This operation was aborted', 'AbortError')
    vi.stubGlobal('fetch', async () => {
      throw abortError
    })

    expect(isAbortError(abortError)).toBe(true)
    await expect(streamAgentRun('plan_1', config, { message: '你好' }, () => {})).rejects.toBe(abortError)
  })
})

function agentEvent(input: Pick<AgentEvent, 'id' | 'message' | 'type'>): AgentEvent {
  return {
    ...input,
    createdAt: '2026-06-18T00:00:00.000Z',
    planId: 'plan_1',
    runId: 'run_1',
    sequence: 1,
  }
}

function chunkedStream(chunks: string[]) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}




