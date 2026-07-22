import type { CandidateIntent, CandidateOption, CandidatePoiPhase, MerchantServiceCategory, Plan, PlanIntent, PlanSegment, PlanVariantOption, SegmentPhase } from './types'
import { createId, nowIso } from './ids'
import { deriveCandidateSearchIntent, fictionalPoiCatalog, pickFictionalPoi, searchFictionalPois, segmentFromPoi, type CandidateSearchIntent, type FictionalPoi, type FictionalPoiSearchResult, type PoiSearchConstraints } from './poiCatalog'


export function createPlanFromPrompt(prompt: string): Plan {
  const id = createId('plan')
  const createdAt = nowIso()
  const intent: PlanIntent = {
    prompt,
    headcount: inferHeadcount(prompt),
    startTime: inferStartTime(prompt),
    endTime: inferEndTime(prompt),
    locationScope: prompt.includes('附近') || prompt.toLowerCase().includes('near') ? 'nearby' : 'city',
    preferences: inferPreferences(prompt),
  }

  const times = defaultTimeline(intent)
  const activityPoi = pickOpeningPoi(prompt)
  const diningPoi = pickDiningPoi(prompt, intent)
  const closingPoi = pickClosingPoi(prompt)

  const segments = [
    materializePoiSegment(activityPoi, times.activityStart, times.activityEnd, '先安排低负担且具体的地点，方便根据体力调整后续计划。'),
    materializePoiSegment(diningPoi, times.diningStart, times.diningEnd, '把吃饭放在中段，优先确定位置、排队和预算。'),
    materializePoiSegment(closingPoi, times.closingStart, times.closingEnd, '保留一个可取消的收尾节点，方便行程不被安排得太满。'),
  ]

  return {
    id,
    ownerMode: 'client-byok',
    title: titleFromPrompt(prompt),
    status: 'ready',
    currentVersion: 1,
    intent,
    segments,
    summary: '已生成一版带具体虚构地点的可编辑计划，拼图命令会直接修改计划对象。',
    createdAt,
    updatedAt: createdAt,
  }
}

export function createPlanVariants(prompt: string): PlanVariantOption[] {
  const base = createPlanFromPrompt(prompt)
  const diningPoi = pickDiningPoi(prompt, base.intent)
  const wantsHotpotDining = wantsHotpot(prompt)
  const relaxed = buildVariantSegments(base.intent, [
    pickPoi('poi_cloud_gallery'),
    pickPoi('poi_roost_dessert'),
    diningPoi,
    pickPoi('poi_camellia_tea'),
  ], [90, 35, 80, 70])
  const nearby = buildVariantSegments(base.intent, [
    pickPoi('poi_linden_bookshop'),
    wantsHotpotDining ? diningPoi : pickPoi('poi_fern_mall_diner'),
    pickPoi('poi_ripple_cafe'),
  ], [80, 75, 55])
  const richer = buildVariantSegments(base.intent, [
    pickPoi('poi_mint_studio'),
    pickPoi('poi_roost_dessert'),
    wantsHotpotDining ? diningPoi : pickPoi('poi_laurel_roundtable'),
    pickPoi('poi_starlamp_bar'),
  ], [100, 35, 90, 75])
  const relaxedSummary = wantsHotpotDining
    ? `用${relaxed[0]?.place ?? '室内活动'}开场，中间留${relaxed[1]?.place ?? '缓冲点'}，再去${diningPoi.name}吃火锅。`
    : '用云朵小展厅开场，中间留甜品缓冲，晚餐和夜坐都更稳。'
  const nearbySummary = wantsHotpotDining
    ? `${nearby[0]?.place ?? '前置节点'}、${diningPoi.name}和${nearby[2]?.place ?? '收尾点'}集中在同一片区。`
    : '椴树慢读店、蕨叶商场餐室和涟漪咖啡角集中在同一片区。'
  const richerSummary = wantsHotpotDining
    ? `${richer[0]?.place ?? '互动活动'}做主活动，${richer[1]?.place ?? '缓冲点'}做缓冲，再到${diningPoi.name}吃火锅。`
    : '薄荷巷手作局做主活动，栖木甜品工坊做缓冲，再到圆桌晚餐收束。'

  return [
    {
      id: createId('variant'),
      title: wantsHotpotDining ? '轻松火锅版' : '轻松稳妥版',
      summary: relaxedSummary,
      tags: wantsHotpotDining ? ['火锅', '少折腾', '可调整'] : ['轻松', '少折腾', '可调整'],
      segments: relaxed,
      score: 0.94,
      reasons: ['具体地点可核对', '每段之间有缓冲', '适合边走边调整'],
    },
    {
      id: createId('variant'),
      title: wantsHotpotDining ? '近距离火锅版' : '近距离少绕路版',
      summary: nearbySummary,
      tags: wantsHotpotDining ? ['火锅', '少绕路', '路线短'] : ['近一点', '少绕路', '路线短'],
      segments: nearby,
      score: 0.9,
      reasons: ['移动距离更短', '室内动线更确定', '适合不想折腾'],
    },
    {
      id: createId('variant'),
      title: wantsHotpotDining ? '互动火锅版' : '互动记忆点版',
      summary: richerSummary,
      tags: wantsHotpotDining ? ['火锅', '互动', '有空档'] : ['互动', '记忆点', '有空档'],
      segments: richer,
      score: 0.86,
      reasons: ['有更明确的体验节点', '保留甜品缓冲', '适合生日或约会'],
    },
  ]
}

export function createPlanVariantAction(prompt: string): Plan['pendingAction'] {
  const variants = createPlanVariants(prompt)
  return {
    id: createId('action'),
    kind: 'plan-variant-selection',
    title: '选择一个方案方向',
    description: 'PlanPal 先给出几个方向，选择后会把对应节点写入拼图。',
    variants,
  }
}

export function attachPlanVariants(plan: Plan, variants = createPlanVariants(plan.intent.prompt)): Plan {
  const actionId = createId('action')
  const title = '选择一个方案方向'
  const description = 'PlanPal 先给出几个方向，选择后会把对应节点写入拼图。'
  return {
    ...plan,
    summary: '已生成几个带具体虚构地点的可选方向，选择一个后进入可编辑拼图。',
    pendingAction: {
      id: actionId,
      kind: 'plan-variant-selection',
      title,
      description,
      variants,
    },
    variantSelection: {
      actionId,
      title,
      description,
      variants,
    },
  }
}

export function createReplacementCandidates(
  plan: Plan,
  segmentId: string,
  query = '',
  excludeCandidateIds: string[] = [],
  candidateIntent?: CandidateIntent,
): CandidateOption[] {
  const target = plan.segments.find((segmentItem) => segmentItem.id === segmentId)
  if (!target || target.isTransit || target.phase === 'transit') return []
  const candidateTarget = target as PlanSegment & { phase: CandidatePoiPhase }
  const intent = createCandidateIntent(plan, segmentId, query, candidateIntent)
  const excluded = [...new Set([
    ...excludeCandidateIds,
    ...(candidateTarget.poiId ? [candidateTarget.poiId] : []),
  ])]
  return createCandidatesForReplacementIntent(plan, candidateTarget, intent, excluded, {
    startTime: candidateTarget.startTime,
    endTime: candidateTarget.endTime,
    status: '待确认',
  })
}

export function createCandidateIntent(
  plan: Plan,
  segmentId: string,
  query = '',
  requested?: CandidateIntent,
): CandidateIntent {
  const target = plan.segments.find((segment) => segment.id === segmentId)
  if (!target || target.isTransit || target.phase === 'transit') {
    throw new Error('Candidate target must be an executable segment')
  }
  const requestedPhases = requested?.desiredPhases.filter(isCandidatePoiPhase) ?? []
  const requestedExcluded = requested?.excludedPhases.filter(isCandidatePoiPhase) ?? []
  const crossTypePlay = isCrossTypePlayRequest(query, target.phase)
  const replacementScope = requested?.replacementScope ?? (crossTypePlay ? 'cross-type' : 'same-type')
  const desiredPhases = uniqueCandidatePhases(
    requestedPhases.length
      ? requestedPhases
      : replacementScope === 'cross-type' && crossTypePlay
        ? ['activity', 'leisure']
        : [target.phase],
  )
  const excludedPhases = uniqueCandidatePhases([
    ...requestedExcluded,
    ...(replacementScope === 'cross-type' ? [target.phase] : []),
  ]).filter((phase) => !desiredPhases.includes(phase))
  const parsed = deriveCandidateSearchIntent(query, {
    mode: 'replace',
    phase: replacementScope === 'same-type' ? target.phase : undefined,
    serviceCategory: replacementScope === 'same-type' ? target.serviceCategory : undefined,
  })
  return {
    operation: requested?.operation ?? 'replace',
    replacementScope,
    targetSegmentId: segmentId,
    desiredPhases: desiredPhases.filter((phase) => !excludedPhases.includes(phase)),
    excludedPhases,
    query: requested?.query.trim() || query.trim(),
    hardConstraints: {
      startTime: target.startTime,
      endTime: target.endTime,
      locked: false,
      catalogOnly: true,
    },
    softPreferences: {
      ...requested?.softPreferences,
      distance: requested?.softPreferences.distance ?? (queryRequestsNearby(query) ? 'nearby' : undefined),
      tags: [...new Set([
        ...(requested?.softPreferences.tags ?? []),
        ...parsed.requestedTags,
      ])],
    },
  }
}

export function createAddSegmentCandidates(
  plan: Plan,
  afterSegmentId: string | null | undefined,
  query = '',
  excludeCandidateIds: string[] = [],
): CandidateOption[] {
  const after = afterSegmentId ? plan.segments.find((segmentItem) => segmentItem.id === afterSegmentId) : undefined
  const next = after ? plan.segments[plan.segments.findIndex((segmentItem) => segmentItem.id === after.id) + 1] : undefined
  const normalized = query.toLowerCase()
  const serviceCategory = inferServiceCategoryFromQuery(query)
  const phase: SegmentPhase = serviceCategory === 'hotel'
    ? 'leisure'
    : serviceCategory === 'movie'
      ? 'activity'
      : query.includes('吃') || query.includes('饭') || wantsDiningPreference(query)
    ? 'dining'
    : query.includes('喝') || query.includes('酒') || normalized.includes('drink')
      ? 'drinks'
      : 'leisure'
  const startTime = after?.endTime ?? plan.intent.startTime
  const endTime = next?.startTime && minutesBetween(startTime, next.startTime) >= 45 ? next.startTime : addMinutes(startTime, 45)
  return createCandidatesForPhase(phase, query, excludeCandidateIds, {
    startTime,
    endTime,
    status: '待确认',
  }, serviceCategory, 'add-after', {
    timeWindow: { startTime, endTime },
    headcount: plan.intent.headcount,
    nearLnglat: after?.lnglat,
    maxDistanceKm: queryRequestsNearby(query) ? 3 : undefined,
  })
}

type ContextualPoiResult = FictionalPoiSearchResult & {
  contextualScore: number
  intent: CandidateSearchIntent
  routeDeltaKm?: number
}

function createCandidatesForReplacementIntent(
  plan: Plan,
  target: PlanSegment & { phase: CandidatePoiPhase },
  candidateIntent: CandidateIntent,
  excludeCandidateIds: string[],
  defaults: Partial<PlanSegment>,
): CandidateOption[] {
  const targetIndex = plan.segments.findIndex((segment) => segment.id === target.id)
  const previous = plan.segments.slice(0, targetIndex).reverse().find((segment) => !segment.isTransit && segment.lnglat)
  const next = plan.segments.slice(targetIndex + 1).find((segment) => !segment.isTransit && segment.lnglat)
  const baselineDistance = routeContextDistance(previous?.lnglat, target.lnglat, next?.lnglat)
  const durationMinutes = minutesBetween(candidateIntent.hardConstraints.startTime, candidateIntent.hardConstraints.endTime)
  const serviceCategory = candidateIntent.replacementScope === 'same-type'
    ? inferServiceCategoryFromQuery(candidateIntent.query) ?? target.serviceCategory
    : undefined

  const ranked = candidateIntent.desiredPhases.flatMap((phase): ContextualPoiResult[] => {
    const intent = deriveCandidateSearchIntent(candidateIntent.query, { mode: 'replace', phase, serviceCategory })
    return searchFictionalPois({
      phase,
      query: candidateIntent.query,
      excludePoiIds: excludeCandidateIds,
      intent,
      limit: 12,
      serviceCategory,
      timeWindow: {
        startTime: candidateIntent.hardConstraints.startTime,
        endTime: candidateIntent.hardConstraints.endTime,
      },
      requireFullTimeWindow: true,
      durationMinutes,
      durationToleranceMinutes: 30,
      headcount: plan.intent.headcount,
      requiredTags: explicitCandidateRequiredTags(candidateIntent.query),
      nearLnglat: target.lnglat,
      maxDistanceKm: candidateIntent.softPreferences.distance === 'nearby' ? 3 : undefined,
    })
      .filter(({ poi }) => candidateIntent.replacementScope !== 'cross-type' || allowsCrossTypePoi(poi, candidateIntent.query))
      .map((result) => {
        const candidateDistance = routeContextDistance(previous?.lnglat, result.poi.lnglat, next?.lnglat)
        const routeDeltaKm = baselineDistance !== undefined && candidateDistance !== undefined
          ? candidateDistance - baselineDistance
          : undefined
        const routeAdjustment = routeDeltaKm === undefined ? 0 : Math.max(-10, Math.min(20, routeDeltaKm * 5))
        return {
          ...result,
          contextualScore: result.score - routeAdjustment,
          intent,
          routeDeltaKm,
        }
      })
  }).sort((left, right) => right.contextualScore - left.contextualScore || left.poi.id.localeCompare(right.poi.id))

  const selected = selectPhaseDiverse(ranked, candidateIntent.desiredPhases, 3)
  return selected.map((result, index) => ({
    id: result.poi.id,
    label: result.poi.name,
    description: result.poi.description,
    score: normalizeCandidateScore(result.contextualScore, index),
    reasons: uniqueReasons([
      candidateIntent.replacementScope === 'cross-type'
        ? `${phaseName(target.phase)}改为${candidateIntent.desiredPhases.map(phaseName).join('/')}`
        : '',
      `完整覆盖 ${candidateIntent.hardConstraints.startTime}-${candidateIntent.hardConstraints.endTime}`,
      routeImpactLine(result.routeDeltaKm),
      budgetImpactLine(target.budget, result.poi.budget),
      ...candidateReasonLines(result.intent, result.poi, result.reasons),
      ...result.reasons,
    ]),
    segment: {
      ...defaults,
      phase: result.poi.phase,
      title: result.poi.activityTitle,
      place: result.poi.name,
      reason: result.poi.description,
      budget: result.poi.budget,
      notes: result.poi.notes,
      poiId: result.poi.id,
      serviceCategory: result.poi.serviceCategory,
      lnglat: result.poi.lnglat,
    },
  }))
}

function selectPhaseDiverse(results: ContextualPoiResult[], phases: CandidatePoiPhase[], limit: number) {
  const selected: ContextualPoiResult[] = []
  const selectedIds = new Set<string>()
  if (phases.length > 1) {
    for (const phase of phases) {
      const match = results.find((result) => result.poi.phase === phase && !selectedIds.has(result.poi.id))
      if (!match) continue
      selected.push(match)
      selectedIds.add(match.poi.id)
      if (selected.length >= limit) return selected
    }
  }
  for (const result of results) {
    if (selectedIds.has(result.poi.id)) continue
    selected.push(result)
    selectedIds.add(result.poi.id)
    if (selected.length >= limit) break
  }
  return selected
}

function createCandidatesForPhase(
  phase: SegmentPhase,
  query = '',
  excludeCandidateIds: string[] = [],
  defaults: Partial<PlanSegment> = {},
  serviceCategory?: MerchantServiceCategory,
  mode?: 'replace' | 'add-after',
  constraints: PoiSearchConstraints & { nearLnglat?: [number, number] } = {},
): CandidateOption[] {
  const intent = deriveCandidateSearchIntent(query, { mode, phase, serviceCategory })
  const results = searchFictionalPois({
    phase,
    query,
    excludePoiIds: excludeCandidateIds,
    intent,
    limit: 3,
    serviceCategory,
    ...constraints,
    timeWindow: intent.constraints.timeWindow ?? constraints.timeWindow,
    headcount: intent.constraints.headcount ?? constraints.headcount,
  })

  return results.map(({ poi, score, reasons }, index) => ({
    id: poi.id,
    label: poi.name,
    description: poi.description,
    score: normalizeCandidateScore(score, index),
    reasons: uniqueReasons([
      ...candidateReasonLines(intent, poi, reasons),
      ...reasons,
    ]),
    segment: {
      ...defaults,
      phase: poi.phase,
      title: poi.activityTitle,
      place: poi.name,
      reason: poi.description,
      budget: poi.budget,
      notes: poi.notes,
      poiId: poi.id,
      serviceCategory: poi.serviceCategory,
      lnglat: poi.lnglat,
    },
  }))
}

function queryRequestsNearby(query: string) {
  const normalized = query.toLowerCase()
  return query.includes('附近') || query.includes('就近') || query.includes('少绕路') || normalized.includes('near')
}

function isCrossTypePlayRequest(query: string, sourcePhase: SegmentPhase) {
  if (sourcePhase !== 'dining') return false
  const normalized = query.toLowerCase()
  const rejectsDining = containsAnyText(normalized, ['不吃饭', '不吃了', '不吃东西', '不去餐厅', '取消吃饭', '不吃午饭', '不吃晚饭'])
  const wantsPlay = containsAnyText(normalized, ['去玩', '玩点', '活动', '逛逛', '体验', '休闲', '娱乐', 'something fun'])
  return rejectsDining && wantsPlay
}

function allowsCrossTypePoi(poi: FictionalPoi, query: string) {
  const explicitHotel = containsAnyText(query.toLowerCase(), ['酒店', '住宿', '住一晚', 'hotel'])
  const explicitRetail = containsAnyText(query.toLowerCase(), ['购物', '礼物', '买点', '花店', '写真'])
  if (poi.serviceCategory === 'hotel') return explicitHotel
  if (poi.serviceCategory === 'retail') return explicitRetail
  return poi.serviceCategory !== 'dining' && poi.serviceCategory !== 'drinks'
}

function uniqueCandidatePhases(phases: SegmentPhase[]): CandidatePoiPhase[] {
  return [...new Set(phases.filter(isCandidatePoiPhase))]
}

function isCandidatePoiPhase(phase: SegmentPhase): phase is CandidatePoiPhase {
  return phase !== 'transit'
}

function phaseName(phase: CandidatePoiPhase) {
  if (phase === 'activity') return '活动'
  if (phase === 'dining') return '用餐'
  if (phase === 'drinks') return '小酌'
  return '休闲'
}

function routeContextDistance(
  previous: [number, number] | undefined,
  current: [number, number] | undefined,
  next: [number, number] | undefined,
) {
  if (!current || (!previous && !next)) return undefined
  return (previous ? coordinateDistanceKm(previous, current) : 0)
    + (next ? coordinateDistanceKm(current, next) : 0)
}

function coordinateDistanceKm(from: [number, number], to: [number, number]) {
  const radians = Math.PI / 180
  const deltaLatitude = (to[1] - from[1]) * radians
  const deltaLongitude = (to[0] - from[0]) * radians
  const leftLatitude = from[1] * radians
  const rightLatitude = to[1] * radians
  const haversine = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(deltaLongitude / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function routeImpactLine(deltaKm: number | undefined) {
  if (deltaKm === undefined) return ''
  if (Math.abs(deltaKm) < 0.15) return '前后路线与原安排基本相当'
  if (deltaKm < 0) return `前后路线预计少 ${Math.abs(deltaKm).toFixed(1)}km`
  return `前后路线预计多 ${deltaKm.toFixed(1)}km`
}

function budgetImpactLine(sourceBudget: string, candidateBudget: string) {
  const source = budgetMidpoint(sourceBudget)
  const candidate = budgetMidpoint(candidateBudget)
  if (source === undefined || candidate === undefined) return `预算参考 ${candidateBudget}`
  const difference = candidate - source
  if (Math.abs(difference) < 10) return '预算与原节点接近'
  return difference < 0
    ? `人均预算约减少 CNY ${Math.round(Math.abs(difference))}`
    : `人均预算约增加 CNY ${Math.round(difference)}`
}

function budgetMidpoint(value: string) {
  const numbers = [...value.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0])).filter(Number.isFinite)
  if (numbers.length === 0) return undefined
  return numbers.length === 1 ? numbers[0] : (numbers[0]! + numbers[1]!) / 2
}

function containsAnyText(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

function explicitCandidateRequiredTags(query: string) {
  if (containsAnyText(query, ['火锅', '涮锅', '涮肉', 'hotpot'])) return ['火锅']
  if (containsAnyText(query, ['串串', '签签', '钵钵'])) return ['串串']
  if (containsAnyText(query, ['川菜', '湘菜', '川湘'])) return ['川湘']
  if (!containsAnyText(query, ['不吃辣', '不要辣', '不辣', '清淡', '少辣'])
    && containsAnyText(query, ['想吃辣', '吃辣', '辣的', '辣味', '麻辣', '香辣'])) return ['辣味']
  return []
}

function buildVariantSegments(intent: PlanIntent, pois: FictionalPoi[], durations: number[]) {
  const start = intent.startTime
  let cursor = start
  return pois.map((poi, index) => {
    const duration = durations[index] ?? 60
    const startTime = cursor
    const endTime = addMinutes(startTime, duration)
    cursor = addMinutes(endTime, index === pois.length - 1 ? 0 : 20)
    return materializePoiSegment(poi, startTime, endTime)
  })
}

function materializePoiSegment(poi: FictionalPoi, startTime: string, endTime: string, reason?: string): PlanSegment {
  return {
    id: createId('seg'),
    ...segmentFromPoi(poi, {
      startTime,
      endTime,
      reason,
    }),
  }
}

function defaultTimeline(intent: PlanIntent) {
  const activityStart = intent.startTime
  const activityEnd = addMinutes(activityStart, 120)
  const diningStart = addMinutes(activityEnd, 60)
  const diningEnd = addMinutes(diningStart, 80)
  const closingStart = addMinutes(diningEnd, 20)
  const inferredEnd = toMinutes(intent.endTime) > toMinutes(closingStart) + 30 ? intent.endTime : addMinutes(closingStart, 90)
  return {
    activityStart,
    activityEnd,
    diningStart,
    diningEnd,
    closingStart,
    closingEnd: inferredEnd,
  }
}

function pickOpeningPoi(prompt: string) {
  if (prompt.includes('客户') || prompt.includes('商务')) return pickPoi('poi_paperkite_board')
  if (prompt.includes('安静')) return pickPoi('poi_linden_bookshop')
  if (prompt.includes('室内') || prompt.includes('雨')) return pickPoi('poi_cloud_gallery')
  if (prompt.includes('生日') || prompt.includes('亲子') || prompt.includes('惊喜')) return pickPoi('poi_mint_studio')
  return pickFictionalPoi('activity', 0)
}

function pickDiningPoi(prompt: string, intent: PlanIntent) {
  if (wantsHotpot(prompt)) {
    if (intent.headcount >= 5) return pickPoi('poi_pine_twinpot')
    if (prompt.includes('预算') || prompt.includes('别太贵')) return pickPoi('poi_mist_littlepot')
    return pickPoi('poi_copper_cloud_hotpot')
  }
  if (prompt.includes('客户') || prompt.includes('商务')) return pickPoi('poi_pearl_private_kitchen')
  if (intent.headcount >= 5 || prompt.includes('生日') || prompt.includes('惊喜')) return pickPoi('poi_laurel_roundtable')
  if (prompt.includes('预算') || prompt.includes('别太贵')) return pickPoi('poi_saffron_noodle')
  if (prompt.includes('室内') || prompt.includes('雨')) return pickPoi('poi_fern_mall_diner')
  return pickPoi('poi_laurel_roundtable')
}

function pickClosingPoi(prompt: string) {
  if (prompt.includes('安静') || prompt.includes('不喝酒') || prompt.includes('亲子')) return pickPoi('poi_camellia_tea')
  if (prompt.includes('生日') || prompt.includes('甜品')) return pickPoi('poi_roost_dessert')
  return pickPoi('poi_starlamp_bar')
}

function pickPoi(id: string) {
  return fictionalPoiCatalog.find((poi) => poi.id === id) ?? fictionalPoiCatalog[0]!
}

function uniqueReasons(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function candidateReasonLines(intent: CandidateSearchIntent, poi: FictionalPoi, searchReasons: string[]) {
  const lines: string[] = []
  if (intent.positiveTags.includes('辣味') && isSpicyPoi(poi)) lines.push('匹配辣味需求')
  if (intent.positiveTags.includes('川湘') && poiHasAny(poi, ['川湘', '川菜', '湘菜', '麻辣', '香辣'])) lines.push('匹配川湘口味')
  if (intent.positiveTags.includes('串串') && poiHasAny(poi, ['串串', '签签', '钵钵'])) lines.push('匹配串串需求')
  if (intent.negativeTags.includes('辣味') && isMildPoi(poi)) lines.push('匹配不辣/少辣要求')
  if (intent.positiveTags.includes('火锅') && isHotpotPoi(poi)) lines.push('匹配火锅需求')
  if (intent.positiveTags.includes('亲子') && poiHasAny(poi, ['亲子', '家庭', '儿童', '儿童椅'])) lines.push('考虑亲子友好')
  if (intent.positiveTags.includes('商务') && (poiHasAny(poi, ['商务', '包间', '投屏']) || poi.noiseLevel === 'quiet')) lines.push('考虑商务确定性')
  if (intent.positiveTags.includes('安静') && poi.noiseLevel !== 'lively') lines.push('匹配安静/聊天需求')
  if (intent.positiveTags.includes('预算可控') && poi.priceLevel <= 2) lines.push('考虑预算可控')
  if (intent.positiveTags.includes('室内') && poi.indoorScore >= 4) lines.push('匹配室内/天气约束')

  const risk = candidateRiskLine(intent, poi)
  const tradeoff = candidateTradeoffLine(intent, poi)
  const fallbackReason = searchReasons.find((reason) => reason !== '匹配当前阶段') ?? '匹配当前阶段'
  return uniqueReasons([
    ...lines,
    tradeoff,
    risk,
    lines.length ? '' : fallbackReason,
    poi.description,
  ])
}

function candidateRiskLine(intent: CandidateSearchIntent, poi: FictionalPoi) {
  if (intent.negativeTags.includes('辣味') && isSpicyPoi(poi) && !isMildPoi(poi)) return '重辣风险，不符合不吃辣约束'
  if (intent.positiveTags.includes('亲子') && isSpicyPoi(poi) && !isMildPoi(poi)) return '口味偏重，带孩子需备注少辣'
  if (intent.positiveTags.includes('商务') && poi.noiseLevel === 'lively') return '噪音较高，不适合商务'
  if (intent.positiveTags.includes('安静') && poi.noiseLevel === 'lively') return '热闹场景，聊天风险较高'
  if (poi.queueRisk === 'high') return '热门时段排队风险较高'
  return ''
}

function candidateTradeoffLine(intent: CandidateSearchIntent, poi: FictionalPoi) {
  if (intent.positiveTags.includes('亲子') && isMildPoi(poi)) return '家庭场景有少辣备注'
  if (intent.positiveTags.includes('辣味') && isMildPoi(poi) && !isSpicyPoi(poi)) return '口味更稳，但辣味记忆点较弱'
  if (intent.positiveTags.includes('预算可控') && poi.priceLevel >= 3) return '预算较高，需要权衡价格'
  if (intent.positiveTags.includes('商务') && poi.reservationMode === 'required') return '需要提前预约确认'
  return ''
}

function normalizeCandidateScore(score: number, index: number) {
  const normalized = 0.62 + Math.min(0.35, Math.max(0, score - 80) / 140)
  return Math.max(0.62, Math.min(0.97, normalized - index * 0.015))
}

function wantsDiningPreference(value: string) {
  const normalized = value.toLowerCase()
  return wantsHotpot(value)
    || value.includes('餐厅')
    || value.includes('晚餐')
    || value.includes('午餐')
    || value.includes('辣')
    || value.includes('麻辣')
    || value.includes('川菜')
    || value.includes('湘菜')
    || value.includes('川湘')
    || value.includes('串串')
    || value.includes('签签')
    || value.includes('清淡')
    || value.includes('不吃辣')
    || value.includes('少辣')
    || normalized.includes('dinner')
}

function wantsHotpot(value: string) {
  const normalized = value.toLowerCase()
  return value.includes('火锅')
    || value.includes('涮锅')
    || value.includes('涮肉')
    || value.includes('锅底')
    || normalized.includes('hotpot')
}

function isHotpotPoi(poi: FictionalPoi) {
  return poi.tags.some((tag) => tag.includes('火锅'))
    || poi.name.includes('火锅')
    || poi.activityTitle.includes('火锅')
    || poi.description.includes('火锅')
}

function isSpicyPoi(poi: FictionalPoi) {
  return poiHasAny(poi, ['辣味', '麻辣', '香辣', '重口', '川湘', '川菜', '湘菜', '串串', '签签', '钵钵'])
}

function isMildPoi(poi: FictionalPoi) {
  return poiHasAny(poi, ['不辣', '无辣', '少辣', '微辣', '清淡', '低刺激'])
}

function poiHasAny(poi: FictionalPoi, needles: string[]) {
  const haystack = [
    poi.name,
    poi.activityTitle,
    poi.description,
    poi.notes,
    ...poi.tags,
    ...poi.sceneTags,
    ...poi.suitableFor,
    ...poi.avoidFor,
  ].join(' ')
  return needles.some((needle) => haystack.includes(needle))
}

function inferServiceCategoryFromQuery(value: string): MerchantServiceCategory | undefined {
  const normalized = value.toLowerCase()
  if (value.includes('酒店') || value.includes('住宿') || value.includes('住一晚') || value.includes('住一夜') || normalized.includes('hotel')) return 'hotel'
  if (value.includes('电影') || value.includes('影院') || normalized.includes('movie') || normalized.includes('cinema') || normalized.includes('imax')) return 'movie'
  if (value.includes('spa') || value.includes('按摩') || value.includes('瑜伽') || value.includes('放松')) return 'wellness'
  if (value.includes('票') || normalized.includes('ticket')) return 'ticket'
  if (value.includes('花') || value.includes('礼物') || value.includes('写真')) return 'retail'
  return undefined
}

function inferHeadcount(prompt: string) {
  const match = /(\d+)\s*(人|个人|位|名)/.exec(prompt)
  return match?.[1] ? Number.parseInt(match[1], 10) : 2
}

function inferStartTime(prompt: string) {
  if (prompt.includes('上午')) return '10:00'
  if (prompt.includes('中午')) return '12:00'
  if (prompt.includes('晚上')) return '18:00'
  return '14:00'
}

function inferEndTime(prompt: string) {
  if (prompt.includes('晚上')) return '21:30'
  if (prompt.includes('上午')) return '13:00'
  return '20:30'
}

function inferPreferences(prompt: string) {
  const normalized = prompt.toLowerCase()
  return [
    prompt.includes('近') ? 'nearby' : null,
    prompt.includes('轻松') ? 'relaxed' : null,
    prompt.includes('室内') || prompt.includes('雨') ? 'indoor' : null,
    prompt.includes('安静') ? 'quiet' : null,
    prompt.includes('客户') || prompt.includes('商务') || normalized.includes('client') ? 'business' : null,
    prompt.includes('亲子') || prompt.includes('孩子') ? 'family' : null,
    prompt.includes('生日') || prompt.includes('惊喜') ? 'celebration' : null,
    prompt.includes('预算') || prompt.includes('别太贵') ? 'budget-aware' : null,
    wantsHotpot(prompt) ? 'hotpot' : null,
  ].filter((item): item is string => Boolean(item))
}

function titleFromPrompt(prompt: string) {
  const clean = prompt.trim().replace(/\s+/g, ' ')
  return clean.length > 22 ? `${clean.slice(0, 22)}...` : clean || '新的 PlanPal 计划'
}

function minutesBetween(start: string, end: string) {
  return Math.max(30, toMinutes(end) - toMinutes(start))
}

function toMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10)
}

function addMinutes(value: string, minutes: number) {
  const total = Math.max(0, Math.min(24 * 60, toMinutes(value) + minutes))
  const hour = Math.floor(total / 60)
  const minute = total % 60
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}
