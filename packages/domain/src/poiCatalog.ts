import type { PlanSegment, SegmentPhase } from './types'

export type FictionalPoi = {
  id: string
  name: string
  phase: Exclude<SegmentPhase, 'transit'>
  activityTitle: string
  description: string
  budget: string
  lnglat: [number, number]
  notes: string
  address: string
  hours: string
  booking: string
  queue: string
  confidence: string
  contact: string
  tags: string[]
}

export const fictionalPoiCatalog: FictionalPoi[] = [
  {
    id: 'poi_mint_studio',
    name: '薄荷巷手作局',
    phase: 'activity',
    activityTitle: '手作体验',
    description: '室内手作空间，互动感强，适合轻松开场。',
    budget: 'CNY 90-180/人',
    lnglat: [121.4755, 31.2311],
    notes: '需要确认当日材料和场次，适合约会、生日或亲子。',
    address: '梧桐里 18 号 2F',
    hours: '13:00-21:00',
    booking: '建议提前 2 小时确认场次',
    queue: '低峰通常无需排队',
    confidence: 'Mock 可信度 88%',
    contact: '虚构电话 021-0000-1801',
    tags: ['室内', '互动', '低体力'],
  },
  {
    id: 'poi_cloud_gallery',
    name: '云朵小展厅',
    phase: 'activity',
    activityTitle: '小型展览',
    description: '小体量室内展，天气不确定时更稳。',
    budget: 'CNY 60-120/人',
    lnglat: [121.4737, 31.2304],
    notes: '场次短、移动少，适合作为开场。',
    address: '青桐路 7 号 B1',
    hours: '10:30-20:30',
    booking: '建议查看当日入场规则',
    queue: '热门时段可能排队 10 分钟',
    confidence: 'Mock 可信度 84%',
    contact: '虚构电话 021-0000-1707',
    tags: ['室内优先', '天气稳定'],
  },
  {
    id: 'poi_paperkite_board',
    name: '纸鸢桌游茶室',
    phase: 'activity',
    activityTitle: '桌游轻体验',
    description: '多人参与感强，适合需要明确互动的安排。',
    budget: 'CNY 80-260/人',
    lnglat: [121.4764, 31.2324],
    notes: '商务时检查投屏，聚会时检查人数上限。',
    address: '星桥弄 22 号 3F',
    hours: '12:00-23:00',
    booking: '多人建议提前预约桌位',
    queue: '周末晚高峰需预留 15 分钟',
    confidence: 'Mock 可信度 81%',
    contact: '虚构电话 021-0000-2233',
    tags: ['多人', '可预约', '互动'],
  },
  {
    id: 'poi_linden_bookshop',
    name: '椴树慢读店',
    phase: 'activity',
    activityTitle: '书店慢逛',
    description: '安静、自由度高，适合降低噪音和体力消耗。',
    budget: 'CNY 0-80/人',
    lnglat: [121.4772, 31.2321],
    notes: '适合填补空档，不强制消费。',
    address: '栗子街 9 号',
    hours: '10:00-22:00',
    booking: '无需预约',
    queue: '通常不用排队',
    confidence: 'Mock 可信度 86%',
    contact: '虚构电话 021-0000-0909',
    tags: ['安静', '低消费', '自由'],
  },
  {
    id: 'poi_laurel_roundtable',
    name: '月桂圆桌小馆',
    phase: 'dining',
    activityTitle: '圆桌聚餐',
    description: '圆桌座位适合多人聊天，也方便安排惊喜。',
    budget: 'CNY 140-260/人',
    lnglat: [121.4774, 31.2324],
    notes: '适合生日、团队晚餐和 5 人以上。',
    address: '月桂里 6 号 1F',
    hours: '11:30-14:00 / 17:00-22:00',
    booking: '建议提前 30-60 分钟确认座位',
    queue: '饭点建议预留 15-25 分钟',
    confidence: 'Mock 可信度 83%',
    contact: '虚构电话 021-0000-0606',
    tags: ['用餐', '多人友好', '可预约'],
  },
  {
    id: 'poi_copper_cloud_hotpot',
    name: '铜锅云汤火锅社',
    phase: 'dining',
    activityTitle: '火锅晚餐',
    description: '鸳鸯锅和小锅都能安排，适合明确想吃火锅的晚上。',
    budget: 'CNY 120-220/人',
    lnglat: [121.4768, 31.2317],
    notes: '适合 2-4 人，建议提前确认锅底和等位。',
    address: '云汤街 8 号 2F',
    hours: '11:30-14:00 / 17:00-23:00',
    booking: '晚高峰建议提前 30 分钟留座',
    queue: '饭点通常排队 10-20 分钟',
    confidence: 'Mock 可信度 86%',
    contact: '虚构电话 021-0000-0808',
    tags: ['火锅', '鸳鸯锅', '多人', '可预约'],
  },
  {
    id: 'poi_pine_twinpot',
    name: '松子鸳鸯火锅屋',
    phase: 'dining',
    activityTitle: '火锅聚餐',
    description: '圆桌锅位更好聊天，适合多人火锅和口味分歧。',
    budget: 'CNY 150-280/人',
    lnglat: [121.4783, 31.2327],
    notes: '适合 4 人以上聚餐，可提前备注清淡锅底。',
    address: '松子里 19 号 1F',
    hours: '11:00-14:30 / 16:30-23:30',
    booking: '多人建议提前预约圆桌',
    queue: '热门时段需预留 20-30 分钟',
    confidence: 'Mock 可信度 84%',
    contact: '虚构电话 021-0000-1919',
    tags: ['火锅', '鸳鸯锅', '多人友好', '可预约'],
  },
  {
    id: 'poi_mist_littlepot',
    name: '雾岛小火锅台',
    phase: 'dining',
    activityTitle: '小火锅晚餐',
    description: '一人一锅更好控节奏，临时想吃火锅也不容易拖太久。',
    budget: 'CNY 85-150/人',
    lnglat: [121.4741, 31.2309],
    notes: '适合 1-3 人，翻台较快，预算更可控。',
    address: '雾岛弄 4 号 B1',
    hours: '10:30-22:30',
    booking: '通常无需预约，可电话确认等位',
    queue: '晚餐高峰约 5-15 分钟',
    confidence: 'Mock 可信度 81%',
    contact: '虚构电话 021-0000-0404',
    tags: ['火锅', '小锅', '预算可控', '翻台快'],
  },
  {
    id: 'poi_saffron_noodle',
    name: '藏红花小面馆',
    phase: 'dining',
    activityTitle: '预算晚餐',
    description: '成本低、翻台快，不拖累复杂计划。',
    budget: 'CNY 45-80/人',
    lnglat: [121.4728, 31.2299],
    notes: '适合预算敏感或临时变更。',
    address: '杏仁巷 3 号',
    hours: '10:30-21:30',
    booking: '无需预约',
    queue: '饭点排队约 5-15 分钟',
    confidence: 'Mock 可信度 79%',
    contact: '虚构电话 021-0000-0303',
    tags: ['预算可控', '翻台快'],
  },
  {
    id: 'poi_pearl_private_kitchen',
    name: '珍珠埠私房菜',
    phase: 'dining',
    activityTitle: '包间晚餐',
    description: '可提前确认座位，适合高确定性安排。',
    budget: 'CNY 160-300/人',
    lnglat: [121.4801, 31.2334],
    notes: '适合商务、生日或不想等位的晚餐。',
    address: '珍珠埠 12 号',
    hours: '17:00-22:30',
    booking: '建议提前预约包间',
    queue: '预约后排队风险低',
    confidence: 'Mock 可信度 82%',
    contact: '虚构电话 021-0000-1212',
    tags: ['包间', '商务', '高确定性'],
  },
  {
    id: 'poi_fern_mall_diner',
    name: '蕨叶商场餐室',
    phase: 'dining',
    activityTitle: '室内晚餐',
    description: '商场内动线确定，天气影响更小。',
    budget: 'CNY 100-180/人',
    lnglat: [121.4792, 31.233],
    notes: '雨天可减少户外移动。',
    address: '雨棚广场 L4-18',
    hours: '11:00-22:00',
    booking: '可电话确认等位',
    queue: '饭点约 10-20 分钟',
    confidence: 'Mock 可信度 80%',
    contact: '虚构电话 021-0000-4018',
    tags: ['室内', '路线确定'],
  },
  {
    id: 'poi_roost_dessert',
    name: '栖木甜品工坊',
    phase: 'leisure',
    activityTitle: '甜品休息',
    description: '轻松停靠点，适合吸收时间误差。',
    budget: 'CNY 35-75/人',
    lnglat: [121.4749, 31.231],
    notes: '可作为休息、等人或切蛋糕前的缓冲。',
    address: '栖木弄 5 号',
    hours: '12:00-22:00',
    booking: '通常无需预约',
    queue: '下午茶时段可能排队 10 分钟',
    confidence: 'Mock 可信度 87%',
    contact: '虚构电话 021-0000-0505',
    tags: ['甜品', '休息', '缓冲'],
  },
  {
    id: 'poi_ripple_cafe',
    name: '涟漪咖啡角',
    phase: 'leisure',
    activityTitle: '咖啡小坐',
    description: '方便等待或调整后续安排。',
    budget: 'CNY 35-70/人',
    lnglat: [121.4748, 31.231],
    notes: '适合作为 Agent 插入的缓冲节点。',
    address: '青桐路 11 号转角',
    hours: '08:30-21:00',
    booking: '无需预约',
    queue: '通常不用排队',
    confidence: 'Mock 可信度 82%',
    contact: '虚构电话 021-0000-1111',
    tags: ['咖啡', '等待', '缓冲'],
  },
  {
    id: 'poi_starlamp_bar',
    name: '星灯清吧',
    phase: 'drinks',
    activityTitle: '小酌收尾',
    description: '收尾氛围轻松，适合可取消的夜间节点。',
    budget: 'CNY 70-130/人',
    lnglat: [121.481, 31.233],
    notes: '不默认真实预订，出发前需确认营业。',
    address: '星灯路 2 号 2F',
    hours: '18:00-01:00',
    booking: '如需卡座建议提前确认',
    queue: '低峰通常不用排队',
    confidence: 'Mock 可信度 76%',
    contact: '虚构电话 021-0000-0202',
    tags: ['收尾', '夜间', '可取消'],
  },
  {
    id: 'poi_camellia_tea',
    name: '山茶夜茶铺',
    phase: 'drinks',
    activityTitle: '茶饮夜坐',
    description: '不喝酒也能坐一会儿，夜间刺激更低。',
    budget: 'CNY 35-70/人',
    lnglat: [121.4798, 31.2329],
    notes: '适合亲子以外的轻松收尾。',
    address: '山茶弄 16 号',
    hours: '13:00-23:30',
    booking: '无需预约',
    queue: '周末晚间可能排队 5-10 分钟',
    confidence: 'Mock 可信度 78%',
    contact: '虚构电话 021-0000-1616',
    tags: ['茶饮', '低刺激', '夜坐'],
  },
]

export function getFictionalPoiById(poiId: string | undefined) {
  return poiId ? fictionalPoiCatalog.find((poi) => poi.id === poiId) : undefined
}

export function getFictionalPoiByName(name: string | undefined) {
  return name ? fictionalPoiCatalog.find((poi) => poi.name === name) : undefined
}

export function getFictionalPoisByPhase(phase: SegmentPhase) {
  return fictionalPoiCatalog.filter((poi) => poi.phase === normalizePoiPhase(phase))
}

export function pickFictionalPoi(phase: SegmentPhase, index = 0) {
  const pool = getFictionalPoisByPhase(phase)
  return pool[Math.max(0, index) % pool.length] ?? fictionalPoiCatalog[0]!
}

export function isGenericPlaceName(value: string | undefined) {
  const text = value?.trim() ?? ''
  if (!text) return true
  return genericPlacePatterns.some((pattern) => pattern.test(text))
}

export function segmentFromPoi(
  poi: FictionalPoi,
  input: {
    endTime: string
    reason?: string
    startTime: string
    status?: string
  },
): Omit<PlanSegment, 'id'> {
  return {
    phase: poi.phase,
    title: poi.activityTitle,
    place: poi.name,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: minutesBetween(input.startTime, input.endTime),
    status: input.status ?? '待确认',
    reason: input.reason ?? poi.description,
    budget: poi.budget,
    notes: poi.notes,
    poiId: poi.id,
    lnglat: poi.lnglat,
  }
}

function normalizePoiPhase(phase: SegmentPhase): Exclude<SegmentPhase, 'transit'> {
  return phase === 'transit' ? 'leisure' : phase
}

function minutesBetween(start: string, end: string) {
  return Math.max(30, toMinutes(end) - toMinutes(start))
}

function toMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10)
}

const genericPlacePatterns = [
  /城市艺文空间/,
  /风味餐厅/,
  /近距离风味餐厅/,
  /附近可选/,
  /附近可选小店/,
  /小型展览/,
  /室内展览/,
  /轻松简餐/,
  /低排队餐厅/,
  /清吧$/,
  /安静清吧/,
  /书店慢逛/,
  /手作体验/,
  /咖啡小坐/,
  /茶饮夜坐/,
  /小馆$/,
  /餐厅$/,
  /体验店$/,
  /休息点$/,
]
