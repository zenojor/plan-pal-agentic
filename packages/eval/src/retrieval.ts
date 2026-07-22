import {
  fictionalPoiCatalog,
  getFictionalPoiById,
  searchFictionalPois,
  type FictionalPoi,
  type FictionalPoiSearchInput,
  type FictionalPoiSearchResult,
} from '../../domain/src/index.ts'

export type RetrievalEvalResult = {
  id: string
  title: string
  tags: string[]
  passed: boolean
  checks: Array<{ label: string; passed: boolean; detail: string }>
}

type RetrievalEvalCase = {
  id: string
  title: string
  input: FictionalPoiSearchInput
  minResults?: number
  precisionAt?: number
  relevant: (poi: FictionalPoi) => boolean
  hardConstraint?: (poi: FictionalPoi) => boolean
  minimumDistinctAreas?: number
}

const spicySignals = ['辣味', '麻辣', '香辣', '川湘', '川菜', '湘菜', '串串', '签签', '钵钵', '火锅']

export function runRetrievalEval(): RetrievalEvalResult[] {
  return retrievalEvalCases.map(runCase)
}

const retrievalEvalCases: RetrievalEvalCase[] = [
  {
    id: 'retrieval-spicy-lunch',
    title: '中午辣味餐饮同时满足口味和营业时间',
    input: { phase: 'dining', query: '我中午想吃辣', limit: 3 },
    minResults: 3,
    precisionAt: 3,
    relevant: (poi) => poi.phase === 'dining' && hasAnyText(poi, spicySignals),
    hardConstraint: (poi) => overlapsAny(poi, '11:00', '14:00'),
  },
  {
    id: 'retrieval-no-spicy',
    title: '忌辣是硬约束而不是降权提示',
    input: { phase: 'dining', query: '中午不吃辣，想清淡一点', limit: 5 },
    minResults: 1,
    relevant: (poi) => !hasAnyText(poi, spicySignals) || hasAnyText(poi, ['不辣', '清淡', '可调辣度']),
    hardConstraint: (poi) => overlapsAny(poi, '11:00', '14:00')
      && (!hasAnyText(poi, spicySignals) || hasAnyText(poi, ['不辣', '清淡', '可调辣度'])),
  },
  {
    id: 'retrieval-rainy-indoor',
    title: '雨天室内活动只返回天气稳定候选',
    input: { phase: 'activity', query: '下雨天想找室内活动', limit: 5 },
    minResults: 3,
    relevant: (poi) => poi.indoorScore >= 4,
    hardConstraint: (poi) => poi.indoorScore >= 4,
  },
  {
    id: 'retrieval-quiet-chat',
    title: '安静聊天排除热闹场所',
    input: { query: '找个安静能聊天的地方', quietOnly: true, limit: 5 },
    minResults: 3,
    relevant: (poi) => poi.noiseLevel !== 'lively',
    hardConstraint: (poi) => poi.noiseLevel !== 'lively',
  },
  {
    id: 'retrieval-eight-people',
    title: '八人聚餐按结构化容量过滤',
    input: { phase: 'dining', query: '我们八个人吃饭，最好多人友好', limit: 5 },
    minResults: 1,
    relevant: (poi) => poi.capacityRange.max >= 8,
    hardConstraint: (poi) => poi.capacityRange.max >= 8,
  },
  {
    id: 'retrieval-hotel-category',
    title: '酒店需求限定到酒店服务类目',
    input: { query: '订个安静双床酒店', serviceCategory: 'hotel', limit: 5 },
    minResults: 3,
    relevant: (poi) => poi.serviceCategory === 'hotel',
    hardConstraint: (poi) => poi.serviceCategory === 'hotel',
  },
  {
    id: 'retrieval-movie-category',
    title: '电影需求限定到电影服务类目',
    input: { query: '晚上看电影', serviceCategory: 'movie', limit: 5 },
    minResults: 3,
    relevant: (poi) => poi.serviceCategory === 'movie',
    hardConstraint: (poi) => poi.serviceCategory === 'movie' && overlapsAny(poi, '17:00', '22:00'),
  },
  {
    id: 'retrieval-budget-cap',
    title: '价格等级上限是硬过滤',
    input: { query: '预算有限，别太贵', maxPriceLevel: 1, limit: 8 },
    minResults: 3,
    relevant: (poi) => poi.priceLevel <= 1,
    hardConstraint: (poi) => poi.priceLevel <= 1,
  },
  {
    id: 'retrieval-required-tag',
    title: '必需标签不会被文本相关性覆盖',
    input: { phase: 'activity', requiredTags: ['亲子'], query: '周末带孩子玩', limit: 5 },
    minResults: 2,
    relevant: (poi) => hasAnyText(poi, ['亲子', '儿童', '家庭']),
    hardConstraint: (poi) => hasAnyText(poi, ['亲子']),
  },
  {
    id: 'retrieval-excluded-poi',
    title: '已排除 POI 不会重新进入候选',
    input: { phase: 'dining', query: '吃火锅', excludePoiIds: ['poi_copper_cloud_hotpot'], limit: 5 },
    minResults: 1,
    relevant: (poi) => poi.id !== 'poi_copper_cloud_hotpot' && hasAnyText(poi, ['火锅']),
    hardConstraint: (poi) => poi.id !== 'poi_copper_cloud_hotpot',
  },
  {
    id: 'retrieval-distance-radius',
    title: '明确距离半径不会返回圈外地点',
    input: {
      nearLnglat: fictionalPoiCatalog[0]!.lnglat,
      maxDistanceKm: 0.35,
      limit: 8,
    },
    minResults: 1,
    relevant: (poi) => distanceKm(fictionalPoiCatalog[0]!.lnglat, poi.lnglat) <= 0.35,
    hardConstraint: (poi) => distanceKm(fictionalPoiCatalog[0]!.lnglat, poi.lnglat) <= 0.35,
  },
  {
    id: 'retrieval-diversity',
    title: '通用活动候选避免被单一区域垄断',
    input: { phase: 'activity', query: '下午找个轻松活动', limit: 6 },
    minResults: 6,
    relevant: (poi) => poi.phase === 'activity',
    hardConstraint: (poi) => poi.phase === 'activity' && overlapsAny(poi, '13:00', '18:00'),
    minimumDistinctAreas: 4,
  },
]

function runCase(evalCase: RetrievalEvalCase): RetrievalEvalResult {
  const results = searchFictionalPois(evalCase.input)
  const minResults = evalCase.minResults ?? 1
  const precisionAt = Math.min(evalCase.precisionAt ?? Math.min(3, results.length), results.length)
  const precisionSlice = results.slice(0, precisionAt)
  const relevantCount = precisionSlice.filter((result) => evalCase.relevant(result.poi)).length
  const precision = precisionAt > 0 ? relevantCount / precisionAt : 0
  const hardConstraintFailures = results.filter((result) => evalCase.hardConstraint && !evalCase.hardConstraint(result.poi))
  const distinctAreas = new Set(results.map((result) => result.poi.area)).size
  const checks = [
    check('minimum_results', results.length >= minResults, `expected >=${minResults}, got ${results.length}`),
    check(
      'catalog_grounded',
      results.every((result) => getFictionalPoiById(result.poi.id) === result.poi),
      `${results.length} returned POIs checked against catalog object identity`,
    ),
    check(
      `precision_at_${precisionAt || 1}`,
      precisionAt > 0 && precision === 1,
      `${relevantCount}/${precisionAt || 1} relevant; ids=${ids(results)}`,
    ),
    check(
      'hard_constraint_violations',
      hardConstraintFailures.length === 0,
      hardConstraintFailures.length === 0 ? '0 violations' : `violations=${ids(hardConstraintFailures)}`,
    ),
  ]
  if (evalCase.minimumDistinctAreas) {
    checks.push(check(
      'result_diversity',
      distinctAreas >= evalCase.minimumDistinctAreas,
      `${distinctAreas} distinct areas among ${results.length} results`,
    ))
  }
  return {
    id: evalCase.id,
    title: evalCase.title,
    tags: ['retrieval', 'catalog', 'deterministic'],
    passed: checks.every((item) => item.passed),
    checks,
  }
}

function hasAnyText(poi: FictionalPoi, signals: string[]) {
  const text = [
    poi.name,
    poi.activityTitle,
    poi.description,
    poi.notes,
    ...poi.tags,
    ...poi.sceneTags,
    ...poi.suitableFor,
  ].join(' ').toLowerCase()
  return signals.some((signal) => text.includes(signal.toLowerCase()))
}

function overlapsAny(poi: FictionalPoi, startTime: string, endTime: string) {
  return poi.openWindows.some((window) => overlaps(window.startTime, window.endTime, startTime, endTime))
}

function overlaps(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  const interval = (start: string, end: string): [number, number] => {
    const startMinutes = minutes(start)
    let endMinutes = minutes(end)
    if (endMinutes <= startMinutes) endMinutes += 1440
    return [startMinutes, endMinutes]
  }
  const left = interval(leftStart, leftEnd)
  const right = interval(rightStart, rightEnd)
  return [0, 1440].some((leftOffset) => [0, 1440].some((rightOffset) =>
    left[0] + leftOffset < right[1] + rightOffset && right[0] + rightOffset < left[1] + leftOffset,
  ))
}

function minutes(value: string) {
  const [hours, minute] = value.split(':').map(Number)
  return hours! * 60 + minute!
}

function distanceKm(from: [number, number], to: [number, number]) {
  const radians = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const deltaLat = radians(to[1] - from[1])
  const deltaLng = radians(to[0] - from[0])
  const lat1 = radians(from[1])
  const lat2 = radians(to[1])
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function ids(results: FictionalPoiSearchResult[]) {
  return results.map((result) => result.poi.id).join(',') || 'none'
}

function check(label: string, passed: boolean, detail: string) {
  return { label, passed, detail }
}
