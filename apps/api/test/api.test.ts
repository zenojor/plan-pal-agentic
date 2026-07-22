import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFictionalPoiById, getPlanRouteChoiceId, type AgentEvent, type CommandResult, type PendingAction, type Plan } from '@planpal/domain'
import app from '../src'

const modelConfig = {
  apiKey: 'sk-secret-for-test',
  baseURL: 'https://api.example.com/v1',
  model: 'demo-chat',
}

describe('PlanPal API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a client-byok plan and applies a deterministic command', async () => {
    const created = await createModelPlan('下午两个人附近轻松玩')
    const target = created.plan.segments[0]
    expect(target).toBeTruthy()

    const commandResponse = await app.request(`/api/plans/${created.planId}/commands`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'REWRITE_SEGMENT',
        source: 'puzzle',
        segmentId: target!.id,
        changes: { notes: '更轻松一点' },
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(commandResponse.status).toBe(200)
    const commandResult = (await commandResponse.json()) as { version: number }
    expect(commandResult.version).toBe(2)
  })

  it('rejects plan creation before persistence when no model connection is supplied', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await app.request('/api/plans', {
      method: 'POST',
      body: JSON.stringify({ prompt: '下午两个人附近轻松玩', modelConfigRef: 'client-byok' }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'A model connection is required' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not persist a local replacement plan when the provider fails', async () => {
    const before = (await (await app.request('/api/plans')).json() as { plans: Plan[] }).plans.length
    vi.stubGlobal('fetch', async () => new Response(
      JSON.stringify({ error: { message: `bad key ${modelConfig.apiKey}` } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    ))

    const response = await app.request('/api/plans', {
      method: 'POST',
      body: JSON.stringify({
        prompt: '下午两个人附近轻松玩',
        modelConfigRef: 'client-byok',
        baseURL: modelConfig.baseURL,
        model: modelConfig.model,
      }),
      headers: {
        Authorization: `Bearer ${modelConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(502)
    expect(JSON.stringify(await response.json())).not.toContain(modelConfig.apiKey)
    const after = (await (await app.request('/api/plans')).json() as { plans: Plan[] }).plans.length
    expect(after).toBe(before)
  })

  it('rejects Agent run and resume requests without a model connection', async () => {
    const created = await createModelPlan('晚上两个人附近吃饭')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const runResponse = await app.request(`/api/plans/${created.planId}/agent/runs`, {
      method: 'POST',
      body: JSON.stringify({ message: '这个计划怎么样' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const resumeResponse = await app.request(`/api/plans/${created.planId}/agent/resume`, {
      method: 'POST',
      body: JSON.stringify({ runId: 'run_missing', actionId: 'action_missing', payload: {} }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(runResponse.status).toBe(400)
    expect(resumeResponse.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('serves expanded local mock POIs and plan route estimates without network calls', async () => {
    const created = await createModelPlan('下午两个人附近轻松玩')
    const fetchMock = vi.fn(async () => {
      throw new Error('network should not be used by mock API')
    })
    vi.stubGlobal('fetch', fetchMock)

    const searchResponse = await app.request('/api/mock/pois?phase=dining&q=%E7%81%AB%E9%94%85&limit=3')
    expect(searchResponse.status).toBe(200)
    const search = (await searchResponse.json()) as {
      count: number
      pois: Array<{ id: string; mockSource: string; reasons: string[]; searchScore: number }>
      source: string
    }
    expect(search.source).toBe('fictional-local-mock-v2')
    expect(search.count).toBe(3)
    expect(search.pois.every((poi) => poi.mockSource === 'fictional-local-mock-v2')).toBe(true)
    expect(search.pois.every((poi) => poi.searchScore > 0)).toBe(true)

    const detailResponse = await app.request('/api/mock/pois/poi_copper_cloud_hotpot')
    expect(detailResponse.status).toBe(200)
    const detail = (await detailResponse.json()) as {
      poi: {
        capacityRange: { min: number; max: number }
        id: string
        openWindows: Array<{ startTime: string; endTime: string }>
        orderableItems: unknown[]
      }
    }
    expect(detail.poi.id).toBe('poi_copper_cloud_hotpot')
    expect(detail.poi.orderableItems.length).toBeGreaterThan(0)
    expect(detail.poi.openWindows.length).toBeGreaterThan(0)
    expect(detail.poi.capacityRange.max).toBeGreaterThanOrEqual(detail.poi.capacityRange.min)

    const constrainedResponse = await app.request('/api/mock/pois?phase=dining&q=%E6%88%91%E4%BB%AC%E5%85%AB%E4%B8%AA%E4%BA%BA%E4%B8%AD%E5%8D%88%E5%90%83%E9%A5%AD&headcount=8&startTime=11%3A00&endTime=14%3A00&requiredTags=%E5%A4%9A%E4%BA%BA%E5%8F%8B%E5%A5%BD&limit=8')
    expect(constrainedResponse.status).toBe(200)
    const constrained = (await constrainedResponse.json()) as {
      count: number
      pois: Array<{ capacityRange: { max: number }; tags: string[] }>
    }
    expect(constrained.count).toBeGreaterThan(0)
    expect(constrained.pois.every((poi) => poi.capacityRange.max >= 8 && poi.tags.includes('多人友好'))).toBe(true)

    const missingResponse = await app.request('/api/mock/pois/poi_missing')
    expect(missingResponse.status).toBe(404)

    const merchantResponse = await app.request('/api/mock/merchants?category=hotel&q=%E5%8F%8C%E5%BA%8A&limit=3')
    expect(merchantResponse.status).toBe(200)
    const merchants = (await merchantResponse.json()) as { count: number; merchants: Array<{ serviceCategory: string; offerings: unknown[] }> }
    expect(merchants.count).toBe(3)
    expect(merchants.merchants.every((merchant) => merchant.serviceCategory === 'hotel' && merchant.offerings.length >= 3)).toBe(true)

    const offeringResponse = await app.request('/api/mock/offerings?category=movie&q=IMAX&limit=3')
    expect(offeringResponse.status).toBe(200)
    const offerings = (await offeringResponse.json()) as { count: number; offerings: Array<{ category: string; merchant: { serviceCategory: string }; showtime?: string }> }
    expect(offerings.count).toBe(3)
    expect(offerings.offerings.every((offering) => offering.category === 'movie' && offering.merchant.serviceCategory === 'movie')).toBe(true)

    const merchantOfferingsResponse = await app.request('/api/mock/merchants/poi_linen_clock_hotel/offerings')
    expect(merchantOfferingsResponse.status).toBe(200)
    const merchantOfferings = (await merchantOfferingsResponse.json()) as { offerings: Array<{ category: string; roomType?: string }> }
    expect(merchantOfferings.offerings).toHaveLength(3)
    expect(merchantOfferings.offerings.every((offering) => offering.category === 'hotel' && offering.roomType)).toBe(true)

    const routeResponse = await app.request(`/api/plans/${created.planId}/mock/routes`)
    expect(routeResponse.status).toBe(200)
    const routes = (await routeResponse.json()) as { source: string; routes: Array<{ source: string; options: Array<{ source: string }> }> }
    expect(routes.source).toBe('mock-route')
    expect(routes.routes.length).toBeGreaterThan(0)
    expect(routes.routes[0]?.options.map((option) => option.source)).toEqual(['mock-route', 'mock-route', 'mock-route'])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('drives the product demo flow through new-architecture API commands', async () => {
    const created = await createModelPlan('明天下午 2 个人附近轻松玩到晚上，晚饭别太远')
    expect(created.plan.pendingAction?.kind).toBe('plan-variant-selection')
    const variantAction = expectPendingAction(created.plan.pendingAction, 'plan-variant-selection')
    const chosenVariant = variantAction.variants[0]!

    const variantResult = await postCommand(created.planId, {
      type: 'CHOOSE_PLAN_VARIANT',
      source: 'action-card',
      actionId: variantAction.id,
      variantId: chosenVariant.id,
    })
    expect(variantResult.version).toBe(2)
    expect(variantResult.plan.pendingAction).toBeUndefined()
    expect(variantResult.plan.summary).toBe(chosenVariant.summary)

    const routeFrom = variantResult.plan.segments[0]!
    const routeTo = variantResult.plan.segments[1]!
    const routeResult = await postCommand(created.planId, {
      type: 'SET_ROUTE_CHOICE',
      source: 'puzzle',
      fromSegmentId: routeFrom.id,
      toSegmentId: routeTo.id,
      mode: 'taxi',
    })
    expect(routeResult.version).toBe(3)
    expect(routeResult.plan.routeChoices).toEqual([expect.objectContaining({
      id: getPlanRouteChoiceId(routeFrom.id, routeTo.id),
      mode: 'taxi',
    })])

    const afterSegment = routeResult.plan.segments[0]!
    const candidateResult = await postCommand(created.planId, {
      type: 'REFRESH_CANDIDATES',
      source: 'puzzle',
      mode: 'add-after',
      afterSegmentId: afterSegment.id,
    })
    expect(candidateResult.version).toBe(4)
    const candidateAction = expectPendingAction(candidateResult.plan.pendingAction, 'candidate-selection')
    expect(candidateAction.mode).toBe('add-after')
    expect(candidateAction.candidates.length).toBeGreaterThan(1)
    const candidate = candidateAction.candidates[0]!

    const chooseCandidateResult = await postCommand(created.planId, {
      type: 'CHOOSE_CANDIDATE',
      source: 'action-card',
      actionId: candidateAction.id,
      candidateId: candidate.id,
    })
    expect(chooseCandidateResult.version).toBe(5)
    expect(chooseCandidateResult.plan.pendingAction).toBeUndefined()
    const insertedIndex = chooseCandidateResult.plan.segments.findIndex((segment) => segment.title === candidate.segment.title)
    expect(insertedIndex).toBeGreaterThan(0)
    expect(chooseCandidateResult.plan.segments[insertedIndex - 1]?.id).toBe(afterSegment.id)

    const confirmResult = await postCommand(created.planId, {
      type: 'CREATE_SANDBOX_ORDER',
      source: 'puzzle',
    })
    expect(confirmResult.version).toBe(6)
    expect(confirmResult.plan.status).toBe('confirmed')
    expect(confirmResult.plan.sandboxOrder?.status).toBe('sandbox_generated')

    const envelopeResponse = await app.request(`/api/plans/${created.planId}`)
    const envelope = (await envelopeResponse.json()) as { events: Array<{ type: string }>; plan: Plan; versions: Array<{ segmentCount: number; status: string; version: number }> }
    expect(envelope.plan.status).toBe('confirmed')
    expect(envelope.plan.sandboxOrder?.receiptId).toBe(confirmResult.plan.sandboxOrder?.receiptId)
    expect(envelope.events.filter((event) => event.type === 'plan.updated')).toHaveLength(5)
    expect(JSON.stringify(envelope)).not.toContain('PlanNode')
  })

  it('deletes local demo plans and their runtime events', async () => {
    const created = await createModelPlan('下午两个人附近轻松玩')
    const variantAction = expectPendingAction(created.plan.pendingAction, 'plan-variant-selection')
    await postCommand(created.planId, {
      type: 'CHOOSE_PLAN_VARIANT',
      source: 'action-card',
      actionId: variantAction.id,
      variantId: variantAction.variants[0]!.id,
    })

    const deleteResponse = await app.request(`/api/plans/${created.planId}`, {
      method: 'DELETE',
    })
    expect(deleteResponse.status).toBe(200)
    await expect(deleteResponse.json()).resolves.toEqual({ ok: true, planId: created.planId })

    const deletedEnvelope = await app.request(`/api/plans/${created.planId}`)
    expect(deletedEnvelope.status).toBe(404)

    const deletedRuns = await app.request(`/api/plans/${created.planId}/agent/runs`)
    expect(deletedRuns.status).toBe(404)

    const listResponse = await app.request('/api/plans')
    const list = (await listResponse.json()) as { plans: Plan[] }
    expect(list.plans.some((plan) => plan.id === created.planId)).toBe(false)

    const missingDelete = await app.request(`/api/plans/${created.planId}`, {
      method: 'DELETE',
    })
    expect(missingDelete.status).toBe(404)
  })
  it('streams agent run and resume events through HTTP SSE', async () => {
    const created = await createModelPlan('明天下午 2 个人附近轻松玩到晚上，晚饭别太远')
    const variantAction = expectPendingAction(created.plan.pendingAction, 'plan-variant-selection')
    const variantResult = await postCommand(created.planId, {
      type: 'CHOOSE_PLAN_VARIANT',
      source: 'action-card',
      actionId: variantAction.id,
      variantId: variantAction.variants[0]!.id,
    })
    const originalDining = variantResult.plan.segments.find((segment) => segment.phase === 'dining')!
    let modelCalls = 0
    vi.stubGlobal('fetch', async (_input: unknown, init?: RequestInit) => {
      modelCalls += 1
      const request = JSON.parse(String(init?.body)) as {
        model?: string
        tools?: Array<{ function?: { name?: string } }>
      }
      const name = request.tools?.[0]?.function?.name
      const intent = {
        action: 'replace',
        targetPhase: 'dining',
        query: '换近一点',
        reason: 'nearby dinner request',
        confidence: 0.98,
      }
      const toolArgs = {
        planId: created.planId,
        mode: 'replace',
        segmentId: originalDining.id,
        query: '换近一点',
      }
      const message = name
        ? {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: `call_api_${modelCalls}`,
              type: 'function',
              function: { name, arguments: JSON.stringify(toolArgs) },
            }],
          }
        : { role: 'assistant', content: JSON.stringify(intent) }
      return new Response(JSON.stringify({
        id: `chatcmpl-api-${modelCalls}`,
        object: 'chat.completion',
        created: 1_750_000_000,
        model: request.model ?? modelConfig.model,
        choices: [{
          index: 0,
          finish_reason: name ? 'tool_calls' : 'stop',
          message,
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })

    const runResponse = await app.request(`/api/plans/${created.planId}/agent/runs`, {
      method: 'POST',
      body: JSON.stringify({
        baseURL: modelConfig.baseURL,
        message: '把晚饭换近一点',
        model: modelConfig.model,
        providerMode: 'auto',
        selectedSegmentId: originalDining.id,
      }),
      headers: {
        Authorization: `Bearer ${modelConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    expect(runResponse.status).toBe(200)
    const runEvents = await readSseEvents(runResponse)
    expect(runEvents.map((event) => event.type)).toContain('action.required')
    expect(runEvents.some((event) => event.type === 'agent.model.finished' || event.type === 'agent.model.error')).toBe(true)
    expect(JSON.stringify(runEvents)).not.toContain(modelConfig.apiKey)
    const actionEvent = runEvents.find((event) => event.type === 'action.required')!
    const candidateAction = expectEventAction(actionEvent, 'candidate-selection')
    expect(candidateAction.mode).toBe('replace')
    const candidate = candidateAction.candidates[0]!

    const resumeResponse = await app.request(`/api/plans/${created.planId}/agent/resume`, {
      method: 'POST',
      body: JSON.stringify({
        actionId: candidateAction.id,
        payload: { candidateId: candidate.id },
        runId: actionEvent.runId,
        baseURL: modelConfig.baseURL,
        model: modelConfig.model,
      }),
      headers: {
        Authorization: `Bearer ${modelConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    expect(resumeResponse.status).toBe(200)
    const resumeEvents = await readSseEvents(resumeResponse)
    expect(resumeEvents.map((event) => event.type)).toEqual(expect.arrayContaining([
      'interrupt.resumed',
      'plan.updated',
      'agent.finished',
    ]))
    expect(resumeEvents.find((event) => event.type === 'plan.updated')?.payload).toMatchObject({
      command: { type: 'CHOOSE_CANDIDATE' },
      patch: { operation: 'CHOOSE_CANDIDATE' },
    })

    const envelopeResponse = await app.request(`/api/plans/${created.planId}`)
    const envelope = (await envelopeResponse.json()) as { events: AgentEvent[]; plan: Plan }
    expect(envelope.plan.currentVersion).toBe(4)
    expect(envelope.plan.pendingAction).toBeUndefined()
    expect(envelope.plan.segments.find((segment) => segment.phase === 'dining')?.title).toBe(candidate.segment.title)
    expect(envelope.events.some((event) => event.type === 'action.required')).toBe(true)
    expect(envelope.events.some((event) => event.type === 'agent.finished')).toBe(true)
    expect(JSON.stringify(envelope)).not.toContain(modelConfig.apiKey)

    const runsResponse = await app.request(`/api/plans/${created.planId}/agent/runs`)
    expect(runsResponse.status).toBe(200)
    const runsBody = (await runsResponse.json()) as { runs: Array<{ id: string; inputMessage: string; status: string }> }
    expect(runsBody.runs.some((run) => run.id === actionEvent.runId && run.status === 'completed')).toBe(true)
    expect(JSON.stringify(runsBody)).not.toContain(modelConfig.apiKey)

    const traceResponse = await app.request(`/api/plans/${created.planId}/agent/runs/${actionEvent.runId}/trace`)
    expect(traceResponse.status).toBe(200)
    const traceBody = (await traceResponse.json()) as {
      trace: {
        commandWrites: Array<{ commandType: string }>
        safetyFindings: Array<{ id: string; status: string }>
        steps: Array<{ commandType?: string; toolName?: string }>
        toolCalls: Array<{ effect: string; toolName: string }>
      }
    }
    expect(traceBody.trace.toolCalls.some((call) => call.toolName === 'poi.search' && call.effect === 'read-only')).toBe(true)
    expect(traceBody.trace.commandWrites.some((write) => write.commandType === 'CHOOSE_CANDIDATE')).toBe(true)
    expect(traceBody.trace.steps.some((step) => step.toolName === 'poi.search')).toBe(true)
    expect(traceBody.trace.safetyFindings).toContainEqual(expect.objectContaining({
      id: 'secret-redaction',
      status: 'pass',
    }))
    expect(JSON.stringify(traceBody)).not.toContain(modelConfig.apiKey)
  })


  it('streams QA answer deltas over HTTP SSE without intent preflight', async () => {
    const created = await createModelPlan('晚上两个人附近吃饭')
    const fetchMock = vi.fn(async (_input: unknown, _init?: RequestInit) => new Response(chunkedStream([

      'data: {"choices":[{"delta":{"content":"我是"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" demo-chat"}}]}\n\n',
      'data: [DONE]\n\n',
    ]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await app.request(`/api/plans/${created.planId}/agent/runs`, {
      method: 'POST',
      body: JSON.stringify({
        baseURL: modelConfig.baseURL,
        message: '你是什么模型',
        model: modelConfig.model,
        providerMode: 'auto',
      }),
      headers: {
        Authorization: `Bearer ${modelConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)
    const events = await readSseEvents(response)
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining([
      'agent.started',
      'graph.node.started',
      'agent.model.started',
      'agent.message.delta',
      'agent.model.finished',
      'agent.finished',
      'run.status',
    ]))
    expect(events.filter((event) => event.type === 'agent.model.started')).toHaveLength(1)
    expect(events.find((event) => event.type === 'agent.model.started')?.payload).toMatchObject({ phase: 'answer', usedModel: true })
    expect(events.filter((event) => event.type === 'agent.message.delta').map((event) => event.message)).toEqual(['我是', ' demo-chat'])
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { stream?: boolean }
    expect(requestBody.stream).toBe(true)
    expect(JSON.stringify(events)).not.toContain(modelConfig.apiKey)
  })
  it('streams agent.error events when resume cannot apply an action', async () => {
    const created = await createModelPlan('明天下午 2 个人附近轻松玩到晚上，晚饭别太远')

    const response = await app.request(`/api/plans/${created.planId}/agent/resume`, {
      method: 'POST',
      body: JSON.stringify({
        actionId: 'action_missing',
        payload: { candidateId: 'candidate_missing' },
        runId: 'run_missing',
        baseURL: modelConfig.baseURL,
        model: modelConfig.model,
      }),
      headers: {
        Authorization: `Bearer ${modelConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)
    const events = await readSseEvents(response)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      message: 'Agent run not found',
      planId: created.planId,
      runId: 'run_missing',
      type: 'agent.error',
    })
    expect(JSON.stringify(events)).not.toContain('sk-')

    const envelopeResponse = await app.request(`/api/plans/${created.planId}`)
    const envelope = (await envelopeResponse.json()) as { events: AgentEvent[]; plan: Plan }
    expect(envelope.events.some((event) => event.type === 'agent.error')).toBe(true)
  })

  it('creates model-backed plan variants when BYOK config is supplied', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            variants: [
              {
                title: '模型方案 A',
                summary: '模型生成方案 A',
                tags: ['轻松'],
                reasons: ['匹配需求'],
                segments: [
                  { poiId: 'poi_echo_karaoke_pod', startTime: '14:00', endTime: '15:30', reason: '轻松' },
                ],
              },
              {
                title: '模型方案 B',
                summary: '模型生成方案 B',
                tags: ['近'],
                reasons: ['少绕路'],
                segments: [
                  { poiId: 'poi_sesame_family_table', startTime: '17:00', endTime: '18:10', reason: '近' },
                ],
              },
              {
                title: '模型方案 C',
                summary: '模型生成方案 C',
                tags: ['收尾'],
                reasons: ['保留选择'],
                segments: [
                  { poiId: 'poi_willow_tea_bench', startTime: '18:30', endTime: '19:30', reason: '轻松收尾' },
                ],
              },
            ],
          }),
        },
      }],
    }), { status: 200 }))

    const response = await app.request('/api/plans', {
      method: 'POST',
      body: JSON.stringify({
        prompt: '下午两个人附近轻松玩',
        modelConfigRef: 'client-byok',
        baseURL: 'https://api.example.com/v1',
        model: 'demo-chat',
      }),
      headers: {
        Authorization: 'Bearer sk-secret-for-test',
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as { plan: Plan }
    expect(body.plan.pendingAction?.kind).toBe('plan-variant-selection')
    const variantAction = expectPendingAction(body.plan.pendingAction, 'plan-variant-selection')
    expect(variantAction.variants[0]?.title).toBe('模型方案 A')
    for (const segment of variantAction.variants.flatMap((variant) => variant.segments)) {
      expect(segment.poiId).toBeTruthy()
      const detailResponse = await app.request(`/api/mock/pois/${segment.poiId}`)
      expect(detailResponse.status).toBe(200)
      const detail = (await detailResponse.json()) as { poi: { id: string; offerings: unknown[] } }
      expect(detail.poi.id).toBe(segment.poiId)
      expect(detail.poi.offerings.length).toBeGreaterThan(0)
    }
    expect(JSON.stringify(body)).not.toContain('sk-secret-for-test')
  })

  it('streams plan creation progress before the final created result', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            variants: [
              {
                title: '流式方案 A',
                summary: '边生成边展示 A',
                tags: ['进度'],
                reasons: ['先展示进度'],
                segments: [
                  { poiId: 'poi_echo_karaoke_pod', startTime: '14:00', endTime: '15:20', reason: '轻松' },
                ],
              },
              {
                title: '流式方案 B',
                summary: '边生成边展示 B',
                tags: ['备选'],
                reasons: ['保留选择'],
                segments: [
                  { poiId: 'poi_sesame_family_table', startTime: '17:00', endTime: '18:10', reason: '近' },
                ],
              },
              {
                title: '流式方案 C',
                summary: '边生成边展示 C',
                tags: ['收尾'],
                reasons: ['保留选择'],
                segments: [
                  { poiId: 'poi_willow_tea_bench', startTime: '18:30', endTime: '19:30', reason: '轻松收尾' },
                ],
              },
            ],
          }),
        },
      }],
    }), { status: 200 }))

    const response = await app.request('/api/plans/stream', {
      method: 'POST',
      body: JSON.stringify({
        prompt: '下午两个人附近轻松玩',
        modelConfigRef: 'client-byok',
        baseURL: modelConfig.baseURL,
        model: modelConfig.model,
      }),
      headers: {
        Authorization: `Bearer ${modelConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)
    const payloads = await readSsePayloads(response)
    const progressEvents = payloads.filter(isAgentEvent)
    expect(progressEvents.map((event) => event.type)).toEqual([
      'agent.started',
      'agent.model.started',
      'agent.model.finished',
      'agent.finished',
    ])
    const created = payloads.find(isPlanCreatedPayload)
    expect(created?.result.plan.pendingAction?.kind).toBe('plan-variant-selection')
    expect(created?.result.plan.pendingAction?.kind === 'plan-variant-selection'
      && created.result.plan.pendingAction.variants[0]?.title).toBe('流式方案 A')
    expect(JSON.stringify(payloads)).not.toContain(modelConfig.apiKey)

    const envelopeResponse = await app.request(`/api/plans/${created!.result.planId}`)
    const envelope = (await envelopeResponse.json()) as { events: AgentEvent[]; plan: Plan }
    expect(envelope.plan.id).toBe(created?.result.planId)
    expect(envelope.events.map((event) => event.type)).toEqual(progressEvents.map((event) => event.type))
  })
  it('does not accept model test requests without BYOK auth', async () => {
    const response = await app.request('/api/model/test', {
      method: 'POST',
      body: JSON.stringify({ baseURL: 'https://example.test/v1', model: 'demo' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).not.toContain('sk-')
  })

  it('redacts provider secrets from model test failures', async () => {
    vi.stubGlobal('fetch', async () => new Response(
      JSON.stringify({ error: { message: 'bad token Bearer abc.def and sk-secret-for-test' } }),
      { status: 401, statusText: 'Unauthorized' },
    ))

    const response = await app.request('/api/model/test', {
      method: 'POST',
      body: JSON.stringify({
        baseURL: 'https://api.example.com/v1',
        model: 'demo-chat',
      }),
      headers: {
        Authorization: 'Bearer sk-secret-for-test',
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string; ok: boolean }
    expect(body.ok).toBe(false)
    expect(body.error).toContain('HTTP 401 Unauthorized')
    expect(body.error).toContain('Bearer [redacted]')
    expect(body.error).toContain('[redacted]')
    expect(body.error).not.toContain('abc.def')
    expect(body.error).not.toContain('sk-secret-for-test')
  })
})

async function createModelPlan(prompt: string) {
  const originalFetch = globalThis.fetch
  vi.stubGlobal('fetch', async (_input: unknown, init?: RequestInit) => modelPlanResponse(init))
  try {
    const response = await app.request('/api/plans', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        modelConfigRef: 'client-byok',
        baseURL: modelConfig.baseURL,
        model: modelConfig.model,
      }),
      headers: {
        Authorization: `Bearer ${modelConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    expect(response.status).toBe(200)
    return (await response.json()) as { plan: Plan; planId: string }
  } finally {
    vi.stubGlobal('fetch', originalFetch)
  }
}

function modelPlanResponse(init?: RequestInit) {
  const request = JSON.parse(String(init?.body ?? '{}')) as { messages?: Array<{ content?: string }> }
  const userContent = request.messages?.[1]?.content
  const planning = userContent ? JSON.parse(userContent) as {
    planningContext?: { minimumSegments?: number; requiredActivities?: string[] }
    poiCandidates?: Array<{ poiId: string }>
  } : undefined
  const candidates = planning?.poiCandidates ?? []
  const requiredActivities = planning?.planningContext?.requiredActivities ?? []
  const selected: Array<{ poiId: string }> = []
  const add = (candidate: { poiId: string } | undefined) => {
    if (candidate && !selected.some((item) => item.poiId === candidate.poiId)) selected.push(candidate)
  }
  const catalogText = (candidate: { poiId: string }) => {
    const poi = getFictionalPoiById(candidate.poiId)
    return poi ? [poi.activityTitle, poi.description, poi.notes, ...poi.tags, ...poi.suitableFor].join(' ') : ''
  }
  for (const activity of requiredActivities) {
    add(candidates.find((candidate) => {
      const poi = getFictionalPoiById(candidate.poiId)
      if (activity === '用餐') return poi?.phase === 'dining'
      if (activity === '电影') return poi?.serviceCategory === 'movie'
      if (activity === '酒店住宿') return poi?.serviceCategory === 'hotel'
      if (activity === '咖啡或茶歇') return poi?.serviceCategory === 'drinks'
      if (activity === '产品演示') return /演示|展示|汇报/.test(catalogText(candidate))
      if (activity === '复盘') return /复盘|总结|回顾|下一步/.test(catalogText(candidate))
      return true
    }))
  }
  const minimumSegments = planning?.planningContext?.minimumSegments ?? 1
  for (const candidate of candidates) {
    if (selected.length >= Math.max(3, minimumSegments)) break
    add(candidate)
  }
  const segments = selected.map((candidate, index) => ({
    poiId: candidate.poiId,
    startTime: apiTestClock(14 * 60 + index * 100),
    endTime: apiTestClock(14 * 60 + index * 100 + 70),
    reason: index === 0 ? '轻松开场' : index === 1 ? '晚饭就近' : '留出复盘时间',
  }))
  return new Response(JSON.stringify({
    choices: [{
      message: {
        content: JSON.stringify({
          variants: [
            { title: '模型轻松版', summary: '轻松且路线紧凑', tags: ['轻松'], reasons: ['符合需求'], segments },
            { title: '模型稳妥版', summary: '保留更多缓冲', tags: ['稳妥'], reasons: ['减少赶路'], segments },
            { title: '模型收尾版', summary: '强调晚间收尾', tags: ['收尾'], reasons: ['保留选择'], segments },
          ],
        }),
      },
    }],
  }), { status: 200 })
}

function apiTestClock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

async function postCommand(planId: string, command: unknown) {
  const response = await app.request(`/api/plans/${planId}/commands`, {
    method: 'POST',
    body: JSON.stringify(command),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(response.status).toBe(200)
  return (await response.json()) as CommandResult
}

function expectPendingAction<K extends PendingAction['kind']>(
  action: PendingAction | undefined,
  kind: K,
) {
  expect(action?.kind).toBe(kind)
  if (!action || action.kind !== kind) throw new Error(`Expected ${kind} pending action`)
  return action as Extract<PendingAction, { kind: K }>
}

function expectEventAction<K extends PendingAction['kind']>(event: AgentEvent, kind: K) {
  const payload = event.payload
  if (!payload || typeof payload !== 'object' || !('action' in payload)) {
    throw new Error('Expected action payload')
  }
  return expectPendingAction((payload as { action?: PendingAction }).action, kind)
}

async function readSsePayloads(response: Response) {
  const text = await response.text()
  return text
    .split('\n\n')
    .map((chunk) => chunk.split('\n').find((line) => line.startsWith('data:'))?.slice('data:'.length).trim())
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line) as unknown)
}

function isAgentEvent(value: unknown): value is AgentEvent {
  return Boolean(value
    && typeof value === 'object'
    && typeof (value as AgentEvent).id === 'string'
    && typeof (value as AgentEvent).runId === 'string'
    && typeof (value as AgentEvent).planId === 'string'
    && typeof (value as AgentEvent).type === 'string')
}

function isPlanCreatedPayload(value: unknown): value is { type: 'plan.created'; result: { plan: Plan; planId: string } } {
  return Boolean(value
    && typeof value === 'object'
    && (value as { type?: unknown }).type === 'plan.created'
    && typeof (value as { result?: { planId?: unknown } }).result?.planId === 'string')
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

async function readSseEvents(response: Response) {
  const text = await response.text()
  return text
    .split('\n\n')
    .map((chunk) => chunk.split('\n').find((line) => line.startsWith('data:'))?.slice('data:'.length).trim())
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line) as AgentEvent)
}





