import { describe, expect, it } from 'vitest'
import {
  applyPlanCommand,
  attachPlanVariants,
  buildMockRouteEstimates,
  createPlanFromPrompt,
  fictionalPoiCatalog,
  getFictionalPoiById,
  getPlanRouteChoiceId,
  searchMerchantOfferings,
  searchFictionalPois,
} from '../src'

describe('PlanCommand deterministic handler', () => {
  it('reorders a segment without calling an agent and reflows times', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const moved = plan.segments[2]
    const anchor = plan.segments[0]
    expect(moved).toBeTruthy()
    expect(anchor).toBeTruthy()

    const result = applyPlanCommand(plan, {
      type: 'REORDER_SEGMENT',
      source: 'puzzle',
      segmentId: moved!.id,
      anchorSegmentId: anchor!.id,
      position: 'BEFORE',
    })

    expect(result.plan.segments[0]?.id).toBe(moved!.id)
    expect(result.plan.segments[0]?.startTime).toBe(plan.segments[0]?.startTime)
    expect(result.plan.segments[1]?.startTime).toBe(result.plan.segments[0]?.endTime)
    expect(result.plan.segments[2]?.startTime).toBe(result.plan.segments[1]?.endTime)
    expect(result.plan.segments.map((segment) => segment.durationMinutes).sort()).toEqual(plan.segments.map((segment) => segment.durationMinutes).sort())
    expect(result.version).toBe(plan.currentVersion + 1)
    expect(result.events[0]?.type).toBe('plan.updated')
  })

  it('creates a candidate-selection pending action for search replacement', () => {
    const plan = createPlanFromPrompt('晚上想吃近一点')
    const dining = plan.segments.find((segment) => segment.phase === 'dining')
    expect(dining).toBeTruthy()

    const result = applyPlanCommand(plan, {
      type: 'REPLACE_SEGMENT',
      source: 'puzzle',
      segmentId: dining!.id,
      searchQuery: '换近一点',
    })

    expect(result.plan.pendingAction?.kind).toBe('candidate-selection')
    expect(result.plan.pendingAction?.kind === 'candidate-selection' && result.plan.pendingAction.candidates.length).toBeGreaterThan(1)
  })

  it('preserves hotpot intent in seeded dining and replacement candidates', () => {
    const plan = createPlanFromPrompt('晚上两个人想吃火锅')
    const dining = plan.segments.find((segment) => segment.phase === 'dining')
    expect(dining).toBeTruthy()
    expect(plan.intent.preferences).toContain('hotpot')
    expect(`${dining!.title}${dining!.place}${dining!.reason}`).toContain('火锅')

    const result = applyPlanCommand(plan, {
      type: 'REPLACE_SEGMENT',
      source: 'agent',
      segmentId: dining!.id,
      searchQuery: '火锅',
    })

    expect(result.plan.pendingAction?.kind).toBe('candidate-selection')
    if (result.plan.pendingAction?.kind !== 'candidate-selection') throw new Error('missing candidates')
    expect(result.plan.pendingAction.searchQuery).toBe('火锅')
    expect(result.plan.pendingAction.candidates).toHaveLength(3)
    expect(result.plan.pendingAction.candidates.every((candidate) =>
      `${candidate.label}${candidate.description}${candidate.segment.title}${candidate.segment.reason}`.includes('火锅'),
    )).toBe(true)
  })

  it('blocks deleting the last executable segment', () => {
    const plan = createPlanFromPrompt('下午一个人逛逛')
    const first = plan.segments[0]
    expect(first).toBeTruthy()
    const onlyOne = { ...plan, segments: [first!] }

    expect(() =>
      applyPlanCommand(onlyOne, {
        type: 'DELETE_SEGMENT',
        source: 'puzzle',
        segmentId: first!.id,
      }),
    ).toThrow(/At least one/)
  })

  it('keeps domain seed concrete and fictional while preserving richer intent hints', () => {
    const rainy = createPlanFromPrompt('明天下雨，2 个人下午到晚上约会，室内优先，晚饭别排队')
    expect(rainy.segments).toHaveLength(3)
    expect(rainy.summary).toBe('已生成一版带具体虚构地点的可编辑计划，拼图命令会直接修改计划对象。')
    expect(rainy.segments.every((segment) => segment.poiId && segment.place.length > 2)).toBe(true)
    expect(rainy.segments.map((segment) => segment.place)).not.toContain('城市艺文空间')
    expect(rainy.intent.preferences).toEqual(expect.arrayContaining(['indoor']))

    const client = createPlanFromPrompt('周五下午接待 4 位客户，从产品演示到晚餐和简短复盘')
    expect(client.intent.headcount).toBe(4)
    expect(client.intent.preferences).toEqual(expect.arrayContaining(['business']))
    expect(client.segments).toHaveLength(3)
  })

  it('keeps the local mock POI catalog broad, structured, and fictional', () => {
    expect(fictionalPoiCatalog.length).toBeGreaterThanOrEqual(64)
    const ids = new Set(fictionalPoiCatalog.map((poi) => poi.id))
    expect(ids.size).toBe(fictionalPoiCatalog.length)
    const count = (phase: string) => fictionalPoiCatalog.filter((poi) => poi.phase === phase).length
    expect(count('activity')).toBeGreaterThanOrEqual(16)
    expect(count('dining')).toBeGreaterThanOrEqual(20)
    expect(count('leisure')).toBeGreaterThanOrEqual(18)
    expect(count('drinks')).toBeGreaterThanOrEqual(10)
    expect(fictionalPoiCatalog.every((poi) =>
      poi.lnglat.length === 2
      && poi.area
      && poi.mockSource === 'fictional-local-mock-v2'
      && poi.offerings.length > 0
      && poi.orderableItems.length > 0
      && poi.availabilitySlots.length > 0,
    )).toBe(true)
  })

  it('keeps merchant offerings broad enough for hotels, movies, and life services', () => {
    const offerings = fictionalPoiCatalog.flatMap((poi) => poi.offerings)
    const ids = new Set(offerings.map((offering) => offering.id))
    expect(fictionalPoiCatalog.filter((poi) => poi.serviceCategory === 'hotel')).toHaveLength(8)
    expect(fictionalPoiCatalog.filter((poi) => poi.serviceCategory === 'movie')).toHaveLength(8)
    expect(fictionalPoiCatalog.filter((poi) => ['retail', 'wellness', 'ticket', 'other'].includes(poi.serviceCategory)).length).toBeGreaterThanOrEqual(7)
    expect(offerings.length).toBeGreaterThanOrEqual(200)
    expect(ids.size).toBe(offerings.length)

    const hotel = fictionalPoiCatalog.find((poi) => poi.serviceCategory === 'hotel')!
    const movie = fictionalPoiCatalog.find((poi) => poi.serviceCategory === 'movie')!
    expect(hotel.offerings).toHaveLength(3)
    expect(hotel.offerings.every((offering) => offering.roomType && offering.bedType && offering.checkInTime)).toBe(true)
    expect(movie.offerings).toHaveLength(3)
    expect(movie.offerings.every((offering) => offering.filmTitle && offering.showtime && offering.runtimeMinutes)).toBe(true)
  })

  it('searches mock POIs with structured scoring instead of id-only boosts', () => {
    const quietCafe = searchFictionalPois({ phase: 'leisure', query: '加个安静咖啡', limit: 3 })
    expect(quietCafe).toHaveLength(3)
    expect(quietCafe[0]?.reasons).toEqual(expect.arrayContaining(['匹配咖啡/休息需求']))
    expect(`${quietCafe[0]?.poi.name}${quietCafe[0]?.poi.tags.join('')}`).toMatch(/咖啡|安静/)

    const hotpot = searchFictionalPois({ phase: 'dining', query: '今晚想吃火锅', limit: 3 })
    expect(hotpot.every((item) => `${item.poi.name}${item.poi.tags.join('')}`.includes('火锅'))).toBe(true)

    const hotels = searchFictionalPois({ phase: 'leisure', query: '订个安静双床酒店', serviceCategory: 'hotel', limit: 3 })
    expect(hotels).toHaveLength(3)
    expect(hotels.every((item) => item.poi.serviceCategory === 'hotel')).toBe(true)

    const movieTickets = searchMerchantOfferings({ category: 'movie', query: '买两张 IMAX 电影票', limit: 3 })
    expect(movieTickets).toHaveLength(3)
    expect(movieTickets.every((item) => item.offering.category === 'movie')).toBe(true)
  })

  it('selects service offerings through commands and snapshots them into sandbox receipts', () => {
    const plan = createPlanFromPrompt('晚上两个人看电影再住一晚')
    const moviePoi = getFictionalPoiById('poi_orbit_cinema')!
    const hotelPoi = getFictionalPoiById('poi_linen_clock_hotel')!
    const withMovie = applyPlanCommand(plan, {
      type: 'ADD_SEGMENT',
      source: 'puzzle',
      afterSegmentId: plan.segments[0]!.id,
      segment: {
        id: 'seg_movie_demo',
        phase: 'activity',
        serviceCategory: 'movie',
        title: moviePoi.activityTitle,
        place: moviePoi.name,
        startTime: '16:20',
        endTime: '18:20',
        durationMinutes: 120,
        status: '待确认',
        reason: moviePoi.description,
        budget: moviePoi.budget,
        poiId: moviePoi.id,
        lnglat: moviePoi.lnglat,
      },
    }).plan
    const withHotel = applyPlanCommand(withMovie, {
      type: 'ADD_SEGMENT',
      source: 'puzzle',
      afterSegmentId: 'seg_movie_demo',
      segment: {
        id: 'seg_hotel_demo',
        phase: 'leisure',
        serviceCategory: 'hotel',
        title: hotelPoi.activityTitle,
        place: hotelPoi.name,
        startTime: '21:30',
        endTime: '22:00',
        durationMinutes: 30,
        status: '待确认',
        reason: hotelPoi.description,
        budget: hotelPoi.budget,
        poiId: hotelPoi.id,
        lnglat: hotelPoi.lnglat,
      },
    }).plan

    const selectedMovie = applyPlanCommand(withHotel, {
      type: 'SELECT_SERVICE_ITEM',
      source: 'action-card',
      segmentId: 'seg_movie_demo',
      merchantId: moviePoi.id,
      offeringId: moviePoi.offerings[0]!.id,
      quantity: 2,
    }).plan
    const selectedHotel = applyPlanCommand(selectedMovie, {
      type: 'SELECT_SERVICE_ITEM',
      source: 'action-card',
      segmentId: 'seg_hotel_demo',
      merchantId: hotelPoi.id,
      offeringId: hotelPoi.offerings.find((offering) => `${offering.title}${offering.tags.join('')}`.includes('双床'))!.id,
      quantity: 1,
    }).plan

    expect(selectedHotel.serviceSelections).toHaveLength(2)
    const updatedQuantity = applyPlanCommand(selectedHotel, {
      type: 'UPDATE_SERVICE_ITEM_QUANTITY',
      source: 'action-card',
      selectionId: selectedHotel.serviceSelections![0]!.id,
      quantity: 3,
    }).plan
    expect(updatedQuantity.serviceSelections![0]!.quantity).toBe(3)

    const ordered = applyPlanCommand(updatedQuantity, {
      type: 'CREATE_SANDBOX_ORDER',
      source: 'puzzle',
    }).plan
    expect(ordered.sandboxOrder?.items.some((item) => item.offeringId === moviePoi.offerings[0]!.id && item.quantity === 3)).toBe(true)
    expect(ordered.sandboxOrder?.items.some((item) => item.serviceCategory === 'hotel' && item.fulfillment === 'room-night')).toBe(true)
  })

  it('builds deterministic mock routes and sandbox receipts from plan data', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const routes = buildMockRouteEstimates(plan.segments)
    expect(routes).toHaveLength(2)
    expect(routes[0]?.source).toBe('mock-route')
    expect(routes[0]?.options.map((option) => option.mode)).toEqual(['walk', 'transit', 'taxi'])

    const ordered = applyPlanCommand(plan, {
      type: 'CREATE_SANDBOX_ORDER',
      source: 'puzzle',
    })

    expect(ordered.plan.status).toBe('confirmed')
    expect(ordered.plan.sandboxOrder).toMatchObject({
      planId: plan.id,
      status: 'sandbox_generated',
    })
    expect(ordered.plan.sandboxOrder?.receiptId).toBe(`sandbox_${plan.id}_v${ordered.version}`)
    expect(ordered.plan.sandboxOrder?.merchantRefs).toHaveLength(plan.segments.filter((segment) => !segment.isTransit).length)
    expect(ordered.plan.sandboxOrder?.disclaimer).toContain('不代表真实预订')
  })

  it('chooses a plan variant through a deterministic command', () => {
    const plan = attachPlanVariants(createPlanFromPrompt('下午两个人附近轻松玩'))
    expect(plan.pendingAction?.kind).toBe('plan-variant-selection')
    if (plan.pendingAction?.kind !== 'plan-variant-selection') throw new Error('missing variants')
    const variant = plan.pendingAction.variants[1]!

    const result = applyPlanCommand(plan, {
      type: 'CHOOSE_PLAN_VARIANT',
      source: 'action-card',
      actionId: plan.pendingAction.id,
      variantId: variant.id,
    })

    expect(result.plan.summary).toBe(variant.summary)
    expect(result.plan.pendingAction).toBeUndefined()
    expect(result.plan.variantSelection?.selectedVariantId).toBe(variant.id)
    expect(result.plan.variantSelection?.variants).toHaveLength(3)
    expect(result.plan.segments[0]?.id).toBe(variant.segments[0]?.id)
    expect(result.version).toBe(plan.currentVersion + 1)

    const alternate = result.plan.variantSelection!.variants.find((item) => item.id !== variant.id)!
    const switched = applyPlanCommand(result.plan, {
      type: 'CHOOSE_PLAN_VARIANT',
      source: 'action-card',
      actionId: result.plan.variantSelection!.actionId,
      variantId: alternate.id,
    })
    expect(switched.plan.pendingAction).toBeUndefined()
    expect(switched.plan.variantSelection?.selectedVariantId).toBe(alternate.id)
    expect(switched.plan.summary).toBe(alternate.summary)
    expect(switched.plan.segments[0]?.id).toBe(alternate.segments[0]?.id)
  })

  it('stores route choices as deterministic plan commands and prunes stale routes', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const from = plan.segments[0]!
    const to = plan.segments[1]!

    const result = applyPlanCommand(plan, {
      type: 'SET_ROUTE_CHOICE',
      source: 'puzzle',
      fromSegmentId: from.id,
      toSegmentId: to.id,
      mode: 'taxi',
    })

    expect(result.version).toBe(plan.currentVersion + 1)
    expect(result.patch.summary).toBe('已更新路线选择')
    expect(result.plan.routeChoices).toEqual([expect.objectContaining({
      id: getPlanRouteChoiceId(from.id, to.id),
      fromSegmentId: from.id,
      toSegmentId: to.id,
      mode: 'taxi',
    })])

    expect(() => applyPlanCommand(result.plan, {
      type: 'SET_ROUTE_CHOICE',
      source: 'puzzle',
      fromSegmentId: from.id,
      toSegmentId: plan.segments[2]!.id,
      mode: 'walk',
    })).toThrow(/adjacent executable/)

    const reordered = applyPlanCommand(result.plan, {
      type: 'REORDER_SEGMENT',
      source: 'puzzle',
      segmentId: to.id,
      position: 'END',
    })
    expect(reordered.plan.routeChoices).toBeUndefined()
  })

  it('can clear a manually selected route choice back to recommended', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const from = plan.segments[0]!
    const to = plan.segments[1]!
    const withChoice = applyPlanCommand(plan, {
      type: 'SET_ROUTE_CHOICE',
      source: 'puzzle',
      fromSegmentId: from.id,
      toSegmentId: to.id,
      mode: 'taxi',
    }).plan

    const cleared = applyPlanCommand(withChoice, {
      type: 'CLEAR_ROUTE_CHOICE',
      source: 'puzzle',
      fromSegmentId: from.id,
      toSegmentId: to.id,
    })

    expect(cleared.patch.summary).toBe('已恢复推荐路线')
    expect(cleared.plan.routeChoices).toBeUndefined()
  })

  it('chooses add-after candidates by inserting a new segment', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const after = plan.segments[0]!
    const actionResult = applyPlanCommand(plan, {
      type: 'REFRESH_CANDIDATES',
      source: 'puzzle',
      mode: 'add-after',
      afterSegmentId: after.id,
      searchQuery: '加点别的',
    })
    expect(actionResult.plan.pendingAction?.kind).toBe('candidate-selection')
    if (actionResult.plan.pendingAction?.kind !== 'candidate-selection') throw new Error('missing candidates')
    expect(actionResult.plan.pendingAction.mode).toBe('add-after')

    const candidate = actionResult.plan.pendingAction.candidates[0]!
    const chooseResult = applyPlanCommand(actionResult.plan, {
      type: 'CHOOSE_CANDIDATE',
      source: 'action-card',
      actionId: actionResult.plan.pendingAction.id,
      candidateId: candidate.id,
    })

    const afterIndex = chooseResult.plan.segments.findIndex((segment) => segment.id === after.id)
    expect(chooseResult.plan.segments[afterIndex + 1]?.title).toBe(candidate.segment.title)
    expect(chooseResult.plan.pendingAction).toBeUndefined()
  })

  it('refreshes candidates while excluding already shown options', () => {
    const plan = createPlanFromPrompt('晚上想吃近一点')
    const dining = plan.segments.find((segment) => segment.phase === 'dining')!
    const first = applyPlanCommand(plan, {
      type: 'REPLACE_SEGMENT',
      source: 'puzzle',
      segmentId: dining.id,
      searchQuery: '近一点',
    })
    if (first.plan.pendingAction?.kind !== 'candidate-selection') throw new Error('missing candidates')
    const excluded = first.plan.pendingAction.candidates.map((candidate) => candidate.id)

    const refreshed = applyPlanCommand(first.plan, {
      type: 'REFRESH_CANDIDATES',
      source: 'action-card',
      actionId: first.plan.pendingAction.id,
      searchQuery: '安静一点',
      excludeCandidateIds: excluded,
    })

    if (refreshed.plan.pendingAction?.kind !== 'candidate-selection') throw new Error('missing refreshed candidates')
    expect(refreshed.plan.pendingAction.id).toBe(first.plan.pendingAction.id)
    expect(refreshed.plan.pendingAction.candidates.some((candidate) => excluded.includes(candidate.id))).toBe(false)
  })

  it('resets candidate exclusions when the user submits a new search requirement', () => {
    const plan = createPlanFromPrompt('晚上想吃近一点')
    const dining = plan.segments.find((segment) => segment.phase === 'dining')!
    const first = applyPlanCommand(plan, {
      type: 'REPLACE_SEGMENT',
      source: 'puzzle',
      segmentId: dining.id,
      searchQuery: '近一点',
    })
    if (first.plan.pendingAction?.kind !== 'candidate-selection') throw new Error('missing candidates')

    const refined = applyPlanCommand(first.plan, {
      type: 'REFRESH_CANDIDATES',
      source: 'action-card',
      actionId: first.plan.pendingAction.id,
      searchQuery: '近一点，室内',
    })

    if (refined.plan.pendingAction?.kind !== 'candidate-selection') throw new Error('missing refined candidates')
    expect(refined.plan.pendingAction.searchQuery).toBe('近一点，室内')
    expect(refined.plan.pendingAction.excludeCandidateIds).toEqual([])
    expect(refined.plan.pendingAction.candidates.length).toBeGreaterThan(0)
  })

  it('dismisses an active pending action without mutating the itinerary', () => {
    const plan = createPlanFromPrompt('晚上想吃近一点')
    const dining = plan.segments.find((segment) => segment.phase === 'dining')!
    const pending = applyPlanCommand(plan, {
      type: 'REPLACE_SEGMENT',
      source: 'puzzle',
      segmentId: dining.id,
      searchQuery: '近一点',
    }).plan
    if (pending.pendingAction?.kind !== 'candidate-selection') throw new Error('missing pending action')

    const dismissed = applyPlanCommand(pending, {
      type: 'DISMISS_PENDING_ACTION',
      source: 'action-card',
      actionId: pending.pendingAction.id,
    })

    expect(dismissed.patch.summary).toBe('已取消待处理选择')
    expect(dismissed.plan.pendingAction).toBeUndefined()
    expect(dismissed.plan.segments).toEqual(pending.segments)
  })

  it('blocks locked and missing-segment direct mutations at the domain boundary', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const locked = applyPlanCommand(plan, {
      type: 'LOCK_SEGMENT',
      source: 'puzzle',
      segmentId: plan.segments[0]!.id,
    }).plan

    expect(() =>
      applyPlanCommand(locked, {
        type: 'REWRITE_SEGMENT',
        source: 'puzzle',
        segmentId: plan.segments[0]!.id,
        changes: { notes: '不要改锁定节点' },
      }),
    ).toThrow(/Locked segments cannot be rewritten/)

    expect(() =>
      applyPlanCommand(plan, {
        type: 'LOCK_SEGMENT',
        source: 'puzzle',
        segmentId: 'seg_missing',
      }),
    ).toThrow(/Segment not found/)
  })

  it('normalizes invalid command segment times before writing the plan', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const target = plan.segments[0]!

    const rewritten = applyPlanCommand(plan, {
      type: 'REWRITE_SEGMENT',
      source: 'puzzle',
      segmentId: target.id,
      changes: {
        startTime: 'soon',
        endTime: 'later',
      },
    })

    expect(rewritten.plan.segments[0]).toMatchObject({
      startTime: target.startTime,
      endTime: target.endTime,
      durationMinutes: target.durationMinutes,
    })

    const added = applyPlanCommand(plan, {
      type: 'ADD_SEGMENT',
      source: 'puzzle',
      afterSegmentId: target.id,
      segment: {
        ...target,
        id: 'seg_bad_time',
        startTime: 'soon',
        endTime: 'later',
        durationMinutes: Number.NaN,
      },
    })

    const inserted = added.plan.segments.find((segment) => segment.id === 'seg_bad_time')
    expect(inserted?.startTime).toBe('12:00')
    expect(inserted?.endTime).toBe('13:00')
    expect(inserted?.durationMinutes).toBe(60)
  })

  it('rejects add-after commands with stale anchors', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')

    expect(() =>
      applyPlanCommand(plan, {
        type: 'ADD_SEGMENT',
        source: 'puzzle',
        afterSegmentId: 'seg_missing',
        segment: plan.segments[0]!,
      }),
    ).toThrow(/Anchor segment not found/)
  })
})
