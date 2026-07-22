import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFictionalPoiById } from '@planpal/domain'
import { createPlanWithVariants } from '../src'

const config = {
  baseURL: 'https://api.example.com/v1',
  apiKey: 'sk-secret-for-test',
  model: 'demo-chat',
}

const defaultPoiIds = [
  'poi_echo_karaoke_pod',
  'poi_sesame_family_table',
  'poi_willow_tea_bench',
] as const

const businessPoiIds = [
  'poi_warmup_demo_lounge',
  'poi_pearl_private_kitchen',
  'poi_maple_quiet_cafe',
] as const

describe('plan creation variants', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('grounds every initial segment in the provided POI candidate pool', async () => {
    let requestBody: Record<string, unknown> | undefined
    const response = catalogResponse(defaultPoiIds, ['轻松开始', '附近晚饭', '安静收尾'], {
      firstSegmentExtras: {
        budget: '模型伪造预算',
        lnglat: [0, 0],
        phase: 'dining',
        place: '模型伪造地点',
        serviceCategory: 'hotel',
        title: '模型伪造标题',
      },
      titlePrefix: '模型',
    })
    vi.stubGlobal('fetch', async (_input: unknown, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return modelResponse(response)
    })

    const result = await createPlanWithVariants('下午两个人附近轻松玩', config)

    expect(result.plan.pendingAction?.kind).toBe('plan-variant-selection')
    if (result.plan.pendingAction?.kind !== 'plan-variant-selection') throw new Error('expected variants')
    expect(result.plan.pendingAction.variants).toHaveLength(3)
    const firstSegment = result.plan.pendingAction.variants[0]!.segments[0]!
    const poi = getFictionalPoiById(firstSegment.poiId)
    expect(poi).toBeDefined()
    expect(firstSegment).toMatchObject({
      poiId: poi!.id,
      place: poi!.name,
      title: poi!.activityTitle,
      budget: poi!.budget,
      lnglat: poi!.lnglat,
      phase: poi!.phase,
      serviceCategory: poi!.serviceCategory,
    })
    expect(firstSegment.place).not.toBe('模型伪造地点')
    expect(firstSegment.budget).not.toBe('模型伪造预算')
    for (const variant of result.plan.pendingAction.variants) {
      for (const segment of variant.segments) {
        const catalogPoi = getFictionalPoiById(segment.poiId)
        expect(catalogPoi).toBeDefined()
        expect(catalogPoi?.offerings.length).toBeGreaterThan(0)
      }
    }
    expect(JSON.stringify(requestBody)).toContain('poiCandidates')
    expect(JSON.stringify(requestBody)).toContain(defaultPoiIds[0])
    expect(JSON.stringify(result.events)).not.toContain(config.apiKey)
    expect(result.events.some((event) => (
      event.payload
      && typeof event.payload === 'object'
      && (event.payload as { catalogGrounded?: unknown }).catalogGrounded === true
    ))).toBe(true)
  })

  it('repairs an under-expanded complex plan using only catalog POI IDs', async () => {
    let calls = 0
    vi.stubGlobal('fetch', async () => {
      calls += 1
      const content = calls === 1
        ? catalogResponse(
            ['poi_paperkite_board'],
            ['产品演示'],
            { titlePrefix: '压缩' },
          )
        : catalogResponse(
            businessPoiIds,
            ['产品演示', '商务晚餐', '简短复盘'],
            { titlePrefix: '修复' },
          )
      return modelResponse(content)
    })

    const result = await createPlanWithVariants(
      '周五下午接待 4 位客户，从产品演示到晚餐和简短复盘，路线要稳，不能太赶，预算中高。',
      config,
    )

    expect(calls).toBe(2)
    const repairStarted = result.events.find((event) => (
      event.type === 'agent.model.started'
      && event.payload
      && typeof event.payload === 'object'
      && (event.payload as { phase?: unknown }).phase === 'repair-plan'
    ))
    expect(repairStarted?.payload).toMatchObject({
      candidatePoolSize: expect.any(Number),
      minimumSegments: 3,
    })
    if (result.plan.pendingAction?.kind !== 'plan-variant-selection') throw new Error('expected variants')
    expect(result.plan.pendingAction.variants).toHaveLength(3)
    expect(result.plan.pendingAction.variants.every((variant) => variant.segments.length === 3)).toBe(true)
    expect(result.plan.pendingAction.variants.flatMap((variant) => variant.segments).every((segment) => (
      Boolean(getFictionalPoiById(segment.poiId))
    ))).toBe(true)
  })

  it('accepts three explicit activities without turning constraints into a fourth node', async () => {
    let calls = 0
    vi.stubGlobal('fetch', async () => {
      calls += 1
      return modelResponse(catalogResponse(
        businessPoiIds,
        ['产品演示', '商务晚餐', '简短复盘'],
        { titlePrefix: '商务' },
      ))
    })

    const result = await createPlanWithVariants(
      '周五下午接待 4 位客户，从产品演示到晚餐和简短复盘，路线要稳，不能太赶，预算中高。',
      config,
    )

    expect(calls).toBe(1)
    expect(result.events.some((event) => (
      event.payload
      && typeof event.payload === 'object'
      && (event.payload as { phase?: unknown }).phase === 'repair-plan'
    ))).toBe(false)
    if (result.plan.pendingAction?.kind !== 'plan-variant-selection') throw new Error('expected plan variants')
    expect(result.plan.pendingAction.variants).toHaveLength(3)
    expect(result.plan.pendingAction.variants.every((variant) => variant.segments.length === 3)).toBe(true)
  })

  it('adds every explicitly requested service category to the balanced candidate pool', async () => {
    let requestBody = ''
    vi.stubGlobal('fetch', async (_input: unknown, init?: RequestInit) => {
      requestBody = String(init?.body)
      return modelResponse(catalogResponse(
        ['poi_orbit_cinema', 'poi_linen_clock_hotel'],
        ['安排电影场次', '电影后入住酒店'],
        { titlePrefix: '电影住宿' },
      ))
    })

    const result = await createPlanWithVariants('晚上先看电影，然后住一晚酒店', config)

    const request = JSON.parse(requestBody) as { messages: Array<{ content: string }> }
    const userMessage = JSON.parse(request.messages[1]!.content) as {
      poiCandidates: Array<{ poiId: string; serviceCategory: string }>
    }
    expect(userMessage.poiCandidates.some((candidate) => candidate.poiId === 'poi_orbit_cinema')).toBe(true)
    expect(userMessage.poiCandidates.some((candidate) => candidate.poiId === 'poi_linen_clock_hotel')).toBe(true)
    expect(userMessage.poiCandidates.some((candidate) => candidate.serviceCategory === 'movie')).toBe(true)
    expect(userMessage.poiCandidates.some((candidate) => candidate.serviceCategory === 'hotel')).toBe(true)
    if (result.plan.pendingAction?.kind !== 'plan-variant-selection') throw new Error('expected variants')
    expect(result.plan.pendingAction.variants.every((variant) => (
      variant.segments.map((segment) => segment.serviceCategory).join(',') === 'movie,hotel'
    ))).toBe(true)
  })

  it('repairs unknown POI IDs and includes validation reasons in trace events', async () => {
    let calls = 0
    vi.stubGlobal('fetch', async () => {
      calls += 1
      return modelResponse(calls === 1
        ? catalogResponse(
            ['poi_not_in_catalog', defaultPoiIds[1], defaultPoiIds[2]],
            ['轻松开始', '附近晚饭', '安静收尾'],
          )
        : catalogResponse(defaultPoiIds, ['轻松开始', '附近晚饭', '安静收尾']))
    })

    const result = await createPlanWithVariants('下午两个人附近轻松玩', config)

    expect(calls).toBe(2)
    const repairEvent = result.events.find((event) => (
      event.type === 'agent.model.started'
      && event.payload
      && typeof event.payload === 'object'
      && (event.payload as { phase?: unknown }).phase === 'repair-plan'
    ))
    expect(JSON.stringify(repairEvent?.payload)).toContain('候选池外')
    if (result.plan.pendingAction?.kind !== 'plan-variant-selection') throw new Error('expected variants')
    expect(result.plan.pendingAction.variants.flatMap((variant) => variant.segments).every((segment) => (
      Boolean(getFictionalPoiById(segment.poiId))
    ))).toBe(true)
  })

  it('fails after one repair when the model keeps returning unknown POI IDs', async () => {
    let calls = 0
    vi.stubGlobal('fetch', async () => {
      calls += 1
      return modelResponse(catalogResponse(
        ['poi_not_in_catalog', defaultPoiIds[1], defaultPoiIds[2]],
        ['轻松开始', '附近晚饭', '安静收尾'],
      ))
    })

    await expect(createPlanWithVariants('下午两个人附近轻松玩', config)).rejects.toThrow('修复后仍不合法')
    expect(calls).toBe(2)
  })

  it('repairs duplicate POIs and overlapping or invalid time ranges', async () => {
    let calls = 0
    vi.stubGlobal('fetch', async () => {
      calls += 1
      if (calls === 1) {
        const invalid = catalogResponse(
          [defaultPoiIds[0], defaultPoiIds[0], defaultPoiIds[2]],
          ['轻松开始', '重复地点', '安静收尾'],
        )
        invalid.variants[0]!.segments[2]!.startTime = '14:30'
        invalid.variants[0]!.segments[2]!.endTime = '14:00'
        return modelResponse(invalid)
      }
      return modelResponse(catalogResponse(defaultPoiIds, ['轻松开始', '附近晚饭', '安静收尾']))
    })

    const result = await createPlanWithVariants('下午两个人附近轻松玩', config)

    expect(calls).toBe(2)
    if (result.plan.pendingAction?.kind !== 'plan-variant-selection') throw new Error('expected variants')
    for (const variant of result.plan.pendingAction.variants) {
      expect(new Set(variant.segments.map((segment) => segment.poiId)).size).toBe(variant.segments.length)
    }
  })

  it('redacts model-generated variant text without changing catalog authority', async () => {
    const response = catalogResponse(defaultPoiIds, [
      `活动理由 ${config.apiKey}`,
      'provider echoed Bearer abc.def',
      '安静收尾',
    ], {
      notes: `备注 ${config.apiKey}`,
      titlePrefix: `泄露 ${config.apiKey}`,
    })
    vi.stubGlobal('fetch', async () => modelResponse(response))

    const result = await createPlanWithVariants('下午两个人附近轻松玩', config)
    const action = result.plan.pendingAction

    expect(action?.kind).toBe('plan-variant-selection')
    if (action?.kind !== 'plan-variant-selection') throw new Error('expected plan variants')
    const serialized = JSON.stringify({ action, events: result.events })
    expect(serialized).not.toContain(config.apiKey)
    expect(serialized).not.toContain('Bearer abc.def')
    expect(serialized).toContain('[redacted]')
  })

  it('fails without creating local variants when the model connection fails', async () => {
    vi.stubGlobal('fetch', async () => new Response(
      JSON.stringify({ error: { message: `bad key ${config.apiKey}` } }),
      { status: 401, statusText: 'Unauthorized' },
    ))

    const events: Array<{ type: string }> = []
    await expect(createPlanWithVariants('下午两个人附近轻松玩', config, (event) => {
      events.push(event)
    })).rejects.toThrow('模型方案生成失败')

    expect(events.some((event) => event.type === 'agent.model.error')).toBe(true)
    expect(events.some((event) => event.type === 'agent.finished')).toBe(false)
    expect(JSON.stringify(events)).not.toContain(config.apiKey)
    expect(JSON.stringify(events)).toContain('[redacted]')
  })
})

type CatalogResponseOptions = {
  firstSegmentExtras?: Record<string, unknown>
  notes?: string
  titlePrefix?: string
}

function catalogResponse(
  poiIds: readonly string[],
  segmentReasons: readonly string[],
  options: CatalogResponseOptions = {},
) {
  return {
    variants: Array.from({ length: 3 }, (_, variantIndex) => ({
      title: `${options.titlePrefix ?? 'Catalog'}方案 ${variantIndex + 1}`,
      summary: '从 POI Catalog 候选池编排的方案',
      tags: ['Catalog', '可回查'],
      reasons: ['地点全部来自候选池'],
      segments: poiIds.map((poiId, segmentIndex) => ({
        poiId,
        startTime: clockFor(14 * 60 + segmentIndex * 100),
        endTime: clockFor(14 * 60 + segmentIndex * 100 + 70),
        reason: segmentReasons[segmentIndex] ?? '匹配用户需求',
        notes: options.notes ?? '模型只补充执行约束',
        ...(segmentIndex === 0 ? options.firstSegmentExtras : {}),
      })),
    })),
  }
}

function clockFor(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function modelResponse(content: unknown) {
  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(content) } }],
  }), { status: 200 })
}
