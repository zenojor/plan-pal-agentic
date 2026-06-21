import { describe, expect, it } from 'vitest'
import { applyPlanCommand, attachPlanVariants, createPlanFromPrompt, getPlanRouteChoiceId } from '../src'

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
    const shown = first.plan.pendingAction.candidates.map((candidate) => candidate.id)

    const refined = applyPlanCommand(first.plan, {
      type: 'REFRESH_CANDIDATES',
      source: 'action-card',
      actionId: first.plan.pendingAction.id,
      searchQuery: '近一点，室内',
    })

    if (refined.plan.pendingAction?.kind !== 'candidate-selection') throw new Error('missing refined candidates')
    expect(refined.plan.pendingAction.searchQuery).toBe('近一点，室内')
    expect(refined.plan.pendingAction.candidates.some((candidate) => shown.includes(candidate.id))).toBe(true)
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
