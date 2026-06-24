import type { MerchantOffering, MerchantServiceCategory, PlanSegment, SegmentPhase } from './types'

export type FictionalPoiPhase = Exclude<SegmentPhase, 'transit'>
export type MockNoiseLevel = 'quiet' | 'moderate' | 'lively'
export type MockQueueRisk = 'low' | 'medium' | 'high'
export type MockReservationMode = 'none' | 'walk-in' | 'recommended' | 'required'
export type MockPriceLevel = 1 | 2 | 3 | 4

export type PoiOrderableItem = {
  id: string
  label: string
  priceCny: number
  category: string
}

export type FictionalPoi = {
  id: string
  name: string
  phase: FictionalPoiPhase
  serviceCategory: MerchantServiceCategory
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
  area: string
  sceneTags: string[]
  suitableFor: string[]
  avoidFor: string[]
  capacity: string
  noiseLevel: MockNoiseLevel
  indoorScore: number
  queueRisk: MockQueueRisk
  reservationMode: MockReservationMode
  mockRating: number
  priceLevel: MockPriceLevel
  durationRangeMinutes: [number, number]
  bestTimeWindows: string[]
  routeHints: string[]
  offerings: MerchantOffering[]
  orderableItems: PoiOrderableItem[]
  availabilitySlots: string[]
  mockSource: string
}

export type FictionalPoiSearchResult = {
  poi: FictionalPoi
  score: number
  reasons: string[]
}

export type CandidateSearchMode = 'replace' | 'add-after'

export type CandidateSearchContext = {
  mode?: CandidateSearchMode
  phase?: SegmentPhase
  serviceCategory?: MerchantServiceCategory
}

export type CandidateSearchIntent = {
  query: string
  normalizedQuery: string
  targetPhase?: SegmentPhase
  serviceCategory?: MerchantServiceCategory
  positiveTags: string[]
  negativeTags: string[]
  hardConstraints: string[]
  softPreferences: string[]
  requestedTags: string[]
  confidence: number
  summary: string
  rankingSignals: string[]
}

export type CandidateSearchIntentSummary = Pick<
  CandidateSearchIntent,
  | 'targetPhase'
  | 'serviceCategory'
  | 'positiveTags'
  | 'negativeTags'
  | 'hardConstraints'
  | 'softPreferences'
  | 'confidence'
  | 'summary'
  | 'rankingSignals'
>

export type FictionalPoiSearchInput = {
  area?: string
  excludePoiIds?: string[]
  intent?: CandidateSearchIntent
  limit?: number
  maxPriceLevel?: number
  nearLnglat?: [number, number]
  phase?: SegmentPhase
  query?: string
  serviceCategory?: MerchantServiceCategory
  tags?: string[]
}

export type MerchantOfferingSearchInput = {
  availableAt?: string
  category?: MerchantServiceCategory
  limit?: number
  merchantId?: string
  query?: string
  tags?: string[]
}

export type MerchantOfferingSearchResult = {
  merchant: FictionalPoi
  offering: MerchantOffering
  score: number
  reasons: string[]
}

type CompactPoiSeed = {
  id: string
  name: string
  phase: FictionalPoiPhase
  title: string
  area: string
  description: string
  budget: string
  lnglat: [number, number]
  notes: string
  tags: string[]
  serviceCategory?: MerchantServiceCategory
  address?: string
  hours?: string
  booking?: string
  queue?: string
  confidence?: string
  contact?: string
  sceneTags?: string[]
  suitableFor?: string[]
  avoidFor?: string[]
  capacity?: string
  noiseLevel?: MockNoiseLevel
  indoorScore?: number
  queueRisk?: MockQueueRisk
  reservationMode?: MockReservationMode
  mockRating?: number
  priceLevel?: MockPriceLevel
  durationRangeMinutes?: [number, number]
  bestTimeWindows?: string[]
  routeHints?: string[]
  offerings?: MerchantOffering[]
  orderableItems?: PoiOrderableItem[]
  availabilitySlots?: string[]
}

const defaultHours: Record<FictionalPoiPhase, string> = {
  activity: '10:30-21:30',
  dining: '11:00-14:00 / 17:00-22:30',
  drinks: '18:00-00:30',
  leisure: '10:00-22:00',
}

const baseFictionalPoiCatalog: FictionalPoi[] = [
  seed({
    id: 'poi_mint_studio',
    name: '薄荷巷手作局',
    phase: 'activity',
    title: '手作体验',
    area: '梧桐里',
    description: '室内手作空间，互动感强，适合轻松开场。',
    budget: 'CNY 90-180/人',
    lnglat: [121.4755, 31.2311],
    notes: '需要确认当日材料和场次，适合约会、生日或亲子。',
    tags: ['室内', '互动', '低体力', '亲子', '生日'],
    address: '梧桐里 18 号 2F',
    hours: '13:00-21:00',
    booking: '建议提前 2 小时确认场次',
    queue: '低峰通常无需排队',
    confidence: 'Mock 可信度 88%',
    contact: '虚构电话 021-0000-1801',
    suitableFor: ['约会', '生日', '亲子', '轻松开场'],
    indoorScore: 5,
    reservationMode: 'recommended',
    durationRangeMinutes: [75, 120],
  }),
  seed({
    id: 'poi_cloud_gallery',
    name: '云朵小展厅',
    phase: 'activity',
    title: '小型展览',
    area: '青桐路',
    description: '小体量室内展，天气不确定时更稳。',
    budget: 'CNY 60-120/人',
    lnglat: [121.4737, 31.2304],
    notes: '场次短、移动少，适合作为开场。',
    tags: ['室内优先', '天气稳定', '展览', '低体力'],
    address: '青桐路 7 号 B1',
    hours: '10:30-20:30',
    booking: '建议查看当日入场规则',
    queue: '热门时段可能排队 10 分钟',
    confidence: 'Mock 可信度 84%',
    contact: '虚构电话 021-0000-1707',
    indoorScore: 5,
    durationRangeMinutes: [45, 90],
  }),
  seed({
    id: 'poi_paperkite_board',
    name: '纸鸢桌游茶室',
    phase: 'activity',
    title: '桌游轻体验',
    area: '星桥弄',
    description: '多人参与感强，适合需要明确互动的安排。',
    budget: 'CNY 80-260/人',
    lnglat: [121.4764, 31.2324],
    notes: '商务时检查投屏，聚会时检查人数上限。',
    tags: ['多人', '可预约', '互动', '商务', '室内'],
    address: '星桥弄 22 号 3F',
    hours: '12:00-23:00',
    booking: '多人建议提前预约桌位',
    queue: '周末晚高峰需预留 15 分钟',
    confidence: 'Mock 可信度 81%',
    contact: '虚构电话 021-0000-2233',
    suitableFor: ['朋友聚会', '客户破冰', '团队复盘'],
    reservationMode: 'recommended',
    noiseLevel: 'moderate',
    indoorScore: 5,
    durationRangeMinutes: [90, 150],
  }),
  seed({
    id: 'poi_linden_bookshop',
    name: '椴树慢读店',
    phase: 'activity',
    title: '书店慢逛',
    area: '栗子街',
    description: '安静、自由度高，适合降低噪音和体力消耗。',
    budget: 'CNY 0-80/人',
    lnglat: [121.4772, 31.2321],
    notes: '适合填补空档，不强制消费。',
    tags: ['安静', '低消费', '自由', '室内', '低刺激'],
    address: '栗子街 9 号',
    hours: '10:00-22:00',
    booking: '无需预约',
    queue: '通常不用排队',
    confidence: 'Mock 可信度 86%',
    contact: '虚构电话 021-0000-0909',
    suitableFor: ['安静约会', '独处', '低预算'],
    noiseLevel: 'quiet',
    indoorScore: 5,
    priceLevel: 1,
  }),
  seed({
    id: 'poi_riverprint_walk',
    name: '河岸拓印工坊',
    phase: 'activity',
    title: '拓印体验',
    area: '河岸街',
    description: '半开放体验空间，有作品带走，拍照和互动都比较自然。',
    budget: 'CNY 70-150/人',
    lnglat: [121.4821, 31.2319],
    notes: '雨天会转到室内桌台，适合 2-4 人。',
    tags: ['手作', '拍照', '互动', '室内备选'],
    suitableFor: ['约会', '朋友', '纪念日'],
    indoorScore: 4,
  }),
  seed({
    id: 'poi_echo_karaoke_pod',
    name: '回声小唱舱',
    phase: 'activity',
    title: '轻量唱歌',
    area: '雨棚广场',
    description: '小包厢唱歌，不需要撑满一整晚，适合饭前热身。',
    budget: 'CNY 60-120/人',
    lnglat: [121.4796, 31.2335],
    notes: '建议确认包厢人数和最低消费。',
    tags: ['室内', '包厢', '夜间', '多人'],
    suitableFor: ['生日', '朋友聚会'],
    avoidFor: ['需要安静交谈'],
    noiseLevel: 'lively',
    indoorScore: 5,
    reservationMode: 'recommended',
  }),
  seed({
    id: 'poi_bamboo_photo_room',
    name: '竹影写真小间',
    phase: 'activity',
    title: '拍照体验',
    area: '青桐路',
    description: '自助写真和小道具齐全，适合想增加记忆点。',
    budget: 'CNY 80-160/人',
    lnglat: [121.4745, 31.2309],
    notes: '妆造不是默认包含，需提前确认。',
    tags: ['拍照', '室内', '约会', '生日'],
    suitableFor: ['约会', '生日', '闺蜜'],
    indoorScore: 5,
    reservationMode: 'recommended',
  }),
  seed({
    id: 'poi_glass_greenhouse',
    name: '玻璃温室植物站',
    phase: 'activity',
    title: '植物温室',
    area: '梧桐里',
    description: '轻量观赏型活动，室内绿植多，节奏很慢。',
    budget: 'CNY 50-100/人',
    lnglat: [121.4761, 31.2305],
    notes: '适合雨天和低体力，但热门拍照点会稍拥挤。',
    tags: ['室内', '拍照', '低体力', '雨天'],
    suitableFor: ['约会', '亲子', '轻松下午'],
    indoorScore: 5,
  }),
  seed({
    id: 'poi_switch_escape',
    name: '拨片谜题屋',
    phase: 'activity',
    title: '轻解谜',
    area: '星桥弄',
    description: '短时长解谜房，目标清晰，适合想要更强互动。',
    budget: 'CNY 120-220/人',
    lnglat: [121.477, 31.2329],
    notes: '不适合怕密闭或不想费脑的用户。',
    tags: ['室内', '互动', '多人', '刺激'],
    suitableFor: ['朋友聚会', '团队破冰'],
    avoidFor: ['低刺激', '亲子低龄'],
    reservationMode: 'required',
    noiseLevel: 'lively',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_warmup_demo_lounge',
    name: '暖场演示客厅',
    phase: 'activity',
    title: '产品演示',
    area: '雨棚广场',
    description: '带投屏和白板的轻会议空间，适合客户接待开场。',
    budget: 'CNY 100-220/人',
    lnglat: [121.4787, 31.2332],
    notes: '建议提前确认投屏线和茶水。',
    tags: ['商务', '投屏', '室内', '可预约', '安静'],
    suitableFor: ['客户接待', '商务复盘'],
    noiseLevel: 'quiet',
    indoorScore: 5,
    reservationMode: 'required',
  }),
  seed({
    id: 'poi_silver_arcade',
    name: '银币游戏厅',
    phase: 'activity',
    title: '轻游戏',
    area: '河岸街',
    description: '复古街机和抓拍点多，适合把气氛拉起来。',
    budget: 'CNY 60-140/人',
    lnglat: [121.4813, 31.2326],
    notes: '噪音偏高，不适合需要认真聊天。',
    tags: ['互动', '拍照', '夜间', '朋友'],
    suitableFor: ['朋友聚会', '轻松约会'],
    avoidFor: ['商务', '安静'],
    noiseLevel: 'lively',
    indoorScore: 4,
  }),
  seed({
    id: 'poi_little_theater_lab',
    name: '小幕实验剧场',
    phase: 'activity',
    title: '短剧场',
    area: '栗子街',
    description: '短场演出，安排感强，适合想要一个明确主活动。',
    budget: 'CNY 120-260/人',
    lnglat: [121.4782, 31.2315],
    notes: '严格按场次入场，迟到容错低。',
    tags: ['室内', '场次', '约会', '文化'],
    suitableFor: ['约会', '纪念日'],
    avoidFor: ['时间不确定'],
    reservationMode: 'required',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_crayon_parent_lab',
    name: '蜡笔亲子实验室',
    phase: 'activity',
    title: '亲子小实验',
    area: '雨棚广场',
    description: '安全系数高、主持人带流程，适合带孩子的下午。',
    budget: 'CNY 80-180/人',
    lnglat: [121.4799, 31.2341],
    notes: '建议确认适龄范围和是否需要家长陪同。',
    tags: ['亲子', '室内', '低体力', '互动'],
    suitableFor: ['亲子', '家庭'],
    indoorScore: 5,
    reservationMode: 'recommended',
  }),
  seed({
    id: 'poi_inkstone_calligraphy',
    name: '墨石写字间',
    phase: 'activity',
    title: '书法小课',
    area: '青桐路',
    description: '安静慢节奏体验，适合需要降噪和沉浸感。',
    budget: 'CNY 70-140/人',
    lnglat: [121.4732, 31.2298],
    notes: '不适合赶时间，体验节奏偏慢。',
    tags: ['安静', '室内', '文化', '低刺激'],
    suitableFor: ['安静约会', '长辈', '低体力'],
    noiseLevel: 'quiet',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_rooftop_skyline_spot',
    name: '天台边框观景点',
    phase: 'activity',
    title: '城市观景',
    area: '河岸街',
    description: '视野开阔，适合晴天拍照和短暂停留。',
    budget: 'CNY 0-50/人',
    lnglat: [121.483, 31.2331],
    notes: '雨天和大风天不建议安排。',
    tags: ['拍照', '户外', '低消费', '晴天'],
    suitableFor: ['拍照', '短停'],
    avoidFor: ['雨天', '恐高'],
    indoorScore: 1,
    priceLevel: 1,
  }),
  seed({
    id: 'poi_soft_sports_studio',
    name: '软垫运动社',
    phase: 'activity',
    title: '轻运动',
    area: '梧桐里',
    description: '低强度运动和拉伸，适合想让行程更有活力。',
    budget: 'CNY 90-180/人',
    lnglat: [121.4759, 31.2318],
    notes: '需确认是否需要换鞋和储物柜。',
    tags: ['室内', '运动', '低强度', '预约'],
    suitableFor: ['朋友', '健康主题'],
    avoidFor: ['正装商务'],
    reservationMode: 'recommended',
    indoorScore: 5,
  }),

  seed({
    id: 'poi_laurel_roundtable',
    name: '月桂圆桌小馆',
    phase: 'dining',
    title: '圆桌聚餐',
    area: '月桂里',
    description: '圆桌座位适合多人聊天，也方便安排惊喜。',
    budget: 'CNY 140-260/人',
    lnglat: [121.4774, 31.2324],
    notes: '适合生日、团队晚餐和 5 人以上。',
    tags: ['用餐', '多人友好', '可预约', '生日'],
    address: '月桂里 6 号 1F',
    hours: '11:30-14:00 / 17:00-22:00',
    booking: '建议提前 30-60 分钟确认座位',
    queue: '饭点建议预留 15-25 分钟',
    confidence: 'Mock 可信度 83%',
    contact: '虚构电话 021-0000-0606',
    reservationMode: 'recommended',
  }),
  seed({
    id: 'poi_copper_cloud_hotpot',
    name: '铜锅云汤火锅社',
    phase: 'dining',
    title: '火锅晚餐',
    area: '云汤街',
    description: '麻辣和番茄鸳鸯锅都能安排，适合明确想吃火锅或辣味的晚上。',
    budget: 'CNY 120-220/人',
    lnglat: [121.4768, 31.2317],
    notes: '适合 2-4 人，建议提前确认锅底和等位。',
    tags: ['火锅', '鸳鸯锅', '辣味', '麻辣', '川湘', '多人', '可预约'],
    address: '云汤街 8 号 2F',
    hours: '11:30-14:00 / 17:00-23:00',
    booking: '晚高峰建议提前 30 分钟留座',
    queue: '饭点通常排队 10-20 分钟',
    confidence: 'Mock 可信度 86%',
    contact: '虚构电话 021-0000-0808',
    reservationMode: 'recommended',
    noiseLevel: 'lively',
  }),
  seed({
    id: 'poi_pine_twinpot',
    name: '松子鸳鸯火锅屋',
    phase: 'dining',
    title: '火锅聚餐',
    area: '松子里',
    description: '圆桌锅位更好聊天，适合多人火锅和口味分歧。',
    budget: 'CNY 150-280/人',
    lnglat: [121.4783, 31.2327],
    notes: '适合 4 人以上聚餐，可提前备注清淡锅底。',
    tags: ['火锅', '鸳鸯锅', '少辣', '多人友好', '可预约'],
    address: '松子里 19 号 1F',
    hours: '11:00-14:30 / 16:30-23:30',
    booking: '多人建议提前预约圆桌',
    queue: '热门时段需预留 20-30 分钟',
    confidence: 'Mock 可信度 84%',
    contact: '虚构电话 021-0000-1919',
    reservationMode: 'recommended',
    noiseLevel: 'lively',
  }),
  seed({
    id: 'poi_mist_littlepot',
    name: '雾岛小火锅台',
    phase: 'dining',
    title: '小火锅晚餐',
    area: '雾岛弄',
    description: '一人一锅更好控节奏，临时想吃火锅也不容易拖太久。',
    budget: 'CNY 85-150/人',
    lnglat: [121.4741, 31.2309],
    notes: '适合 1-3 人，翻台较快，预算更可控。',
    tags: ['火锅', '小锅', '辣味', '预算可控', '翻台快'],
    address: '雾岛弄 4 号 B1',
    hours: '10:30-22:30',
    booking: '通常无需预约，可电话确认等位',
    queue: '晚餐高峰约 5-15 分钟',
    confidence: 'Mock 可信度 81%',
    contact: '虚构电话 021-0000-0404',
    priceLevel: 2,
  }),
  seed({
    id: 'poi_saffron_noodle',
    name: '藏红花小面馆',
    phase: 'dining',
    title: '预算晚餐',
    area: '杏仁巷',
    description: '麻辣小面和清汤小碗都有，成本低、翻台快，不拖累复杂计划。',
    budget: 'CNY 45-80/人',
    lnglat: [121.4728, 31.2299],
    notes: '默认偏麻辣，也可备注清汤；适合预算敏感或临时变更。',
    tags: ['预算可控', '翻台快', '低消费', '辣味', '麻辣', '川湘'],
    address: '杏仁巷 3 号',
    hours: '10:30-21:30',
    booking: '无需预约',
    queue: '饭点排队约 5-15 分钟',
    confidence: 'Mock 可信度 79%',
    contact: '虚构电话 021-0000-0303',
    priceLevel: 1,
  }),
  seed({
    id: 'poi_pearl_private_kitchen',
    name: '珍珠埠私房菜',
    phase: 'dining',
    title: '包间晚餐',
    area: '珍珠埠',
    description: '可提前确认座位，适合高确定性安排。',
    budget: 'CNY 160-300/人',
    lnglat: [121.4801, 31.2334],
    notes: '适合商务、生日或不想等位的晚餐。',
    tags: ['包间', '商务', '高确定性', '可预约'],
    address: '珍珠埠 12 号',
    hours: '17:00-22:30',
    booking: '建议提前预约包间',
    queue: '预约后排队风险低',
    confidence: 'Mock 可信度 82%',
    contact: '虚构电话 021-0000-1212',
    reservationMode: 'required',
    noiseLevel: 'quiet',
  }),
  seed({
    id: 'poi_fern_mall_diner',
    name: '蕨叶商场餐室',
    phase: 'dining',
    title: '室内晚餐',
    area: '雨棚广场',
    description: '商场内动线确定，天气影响更小。',
    budget: 'CNY 100-180/人',
    lnglat: [121.4792, 31.233],
    notes: '雨天可减少户外移动。',
    tags: ['室内', '路线确定', '雨天', '商场'],
    address: '雨棚广场 L4-18',
    hours: '11:00-22:00',
    booking: '可电话确认等位',
    queue: '饭点约 10-20 分钟',
    confidence: 'Mock 可信度 80%',
    contact: '虚构电话 021-0000-4018',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_wheat_light_bistro',
    name: '麦光小酒馆餐室',
    phase: 'dining',
    title: '轻西餐',
    area: '河岸街',
    description: '灯光舒服、菜品稳，适合约会或不想太吵的晚餐。',
    budget: 'CNY 130-240/人',
    lnglat: [121.4816, 31.2321],
    notes: '窗边桌需要提前备注。',
    tags: ['约会', '安静', '可预约', '西餐'],
    suitableFor: ['约会', '纪念日'],
    noiseLevel: 'quiet',
    reservationMode: 'recommended',
  }),
  seed({
    id: 'poi_sesame_family_table',
    name: '芝麻家宴桌',
    phase: 'dining',
    title: '家庭聚餐',
    area: '梧桐里',
    description: '菜量友好、儿童椅充足，适合家庭和亲子。',
    budget: 'CNY 90-170/人',
    lnglat: [121.4762, 31.2314],
    notes: '建议确认儿童椅和少油少辣备注。',
    tags: ['亲子', '家庭', '儿童椅', '少辣', '多人友好', '可预约'],
    suitableFor: ['亲子', '家庭', '长辈'],
    reservationMode: 'recommended',
  }),
  seed({
    id: 'poi_blueprint_client_room',
    name: '蓝图会客餐厅',
    phase: 'dining',
    title: '商务简餐',
    area: '雨棚广场',
    description: '半包厢和投屏位可选，适合客户会后吃饭。',
    budget: 'CNY 150-260/人',
    lnglat: [121.479, 31.2338],
    notes: '需要提前确认发票和包厢。',
    tags: ['商务', '包间', '安静', '可预约'],
    suitableFor: ['客户接待', '商务复盘'],
    noiseLevel: 'quiet',
    reservationMode: 'required',
  }),
  seed({
    id: 'poi_green_pepper_skewer',
    name: '青椒签签铺',
    phase: 'dining',
    title: '热闹串串',
    area: '星桥弄',
    description: '麻辣串串和小签签上菜快，氛围热闹、成本可控，适合朋友局。',
    budget: 'CNY 70-130/人',
    lnglat: [121.4769, 31.2322],
    notes: '噪音较高，不适合商务；带孩子建议换少辣锅或避开晚高峰。',
    tags: ['串串', '辣味', '麻辣', '川湘', '预算可控', '朋友', '夜间', '热闹'],
    suitableFor: ['朋友聚会', '临时晚饭'],
    avoidFor: ['商务', '安静', '亲子低龄'],
    noiseLevel: 'lively',
  }),
  seed({
    id: 'poi_cedar_veggie_kitchen',
    name: '雪松蔬食厨房',
    phase: 'dining',
    title: '清淡蔬食',
    area: '栗子街',
    description: '口味清淡，适合有人不吃辣或想降低负担。',
    budget: 'CNY 90-160/人',
    lnglat: [121.4779, 31.2318],
    notes: '适合长辈和低刺激需求。',
    tags: ['清淡', '不辣', '少辣', '安静', '低刺激', '素食'],
    suitableFor: ['长辈', '低刺激', '不吃辣'],
    noiseLevel: 'quiet',
  }),
  seed({
    id: 'poi_orange_duck_rice',
    name: '橙皮鸭饭所',
    phase: 'dining',
    title: '快节奏正餐',
    area: '青桐路',
    description: '上菜快、座位周转快，适合计划被压缩时使用。',
    budget: 'CNY 55-95/人',
    lnglat: [121.4739, 31.2301],
    notes: '饭点会排队，但翻台很快。',
    tags: ['翻台快', '预算可控', '近距离'],
    priceLevel: 1,
  }),
  seed({
    id: 'poi_crystal_rice_roll',
    name: '水晶肠粉铺',
    phase: 'dining',
    title: '轻量晚餐',
    area: '雾岛弄',
    description: '轻量、低预算，适合不想吃太撑。',
    budget: 'CNY 40-75/人',
    lnglat: [121.4743, 31.2307],
    notes: '适合作为火锅以外的清爽备选。',
    tags: ['预算可控', '轻食', '翻台快'],
    priceLevel: 1,
  }),
  seed({
    id: 'poi_northwind_bbq_table',
    name: '北风烤肉桌',
    phase: 'dining',
    title: '烤肉聚餐',
    area: '河岸街',
    description: '香辣烤肉和桌面互动强，适合朋友和生日，但排队风险偏高。',
    budget: 'CNY 130-230/人',
    lnglat: [121.4824, 31.2327],
    notes: '建议提前确认油烟和等位；聊天场景要避开高峰。',
    tags: ['多人', '生日', '热闹', '可预约', '辣味', '香辣', '川湘'],
    suitableFor: ['朋友聚会', '生日'],
    queueRisk: 'high',
    noiseLevel: 'lively',
  }),
  seed({
    id: 'poi_morning_glory_canteen',
    name: '牵牛花食堂',
    phase: 'dining',
    title: '轻松家常菜',
    area: '梧桐里',
    description: '稳定家常菜，适合没有明确口味偏好时兜底。',
    budget: 'CNY 80-140/人',
    lnglat: [121.4752, 31.2308],
    notes: '适合 2-4 人，口味选择广。',
    tags: ['家常', '稳定', '预算可控'],
  }),
  seed({
    id: 'poi_sandglass_sushi',
    name: '沙漏寿司吧',
    phase: 'dining',
    title: '吧台寿司',
    area: '星桥弄',
    description: '小座位、节奏明确，适合两人约会。',
    budget: 'CNY 180-320/人',
    lnglat: [121.4762, 31.233],
    notes: '人数多不适合，吧台位建议预约。',
    tags: ['约会', '吧台', '安静', '可预约'],
    suitableFor: ['两人约会', '纪念日'],
    avoidFor: ['多人'],
    reservationMode: 'required',
    priceLevel: 4,
    noiseLevel: 'quiet',
  }),
  seed({
    id: 'poi_harbor_noodle_house',
    name: '港湾汤面屋',
    phase: 'dining',
    title: '暖汤面',
    area: '河岸街',
    description: '暖汤和小菜稳定，雨天或低体力时很稳。',
    budget: 'CNY 55-100/人',
    lnglat: [121.481, 31.2315],
    notes: '适合雨天临时换餐。',
    tags: ['雨天', '预算可控', '翻台快', '低刺激'],
    priceLevel: 1,
  }),
  seed({
    id: 'poi_plum_private_table',
    name: '梅影小包间',
    phase: 'dining',
    title: '安静包间',
    area: '栗子街',
    description: '包间安静，适合需要认真聊天或长辈局。',
    budget: 'CNY 160-280/人',
    lnglat: [121.4785, 31.2312],
    notes: '需要提前确认最低消费。',
    tags: ['包间', '安静', '长辈', '商务'],
    suitableFor: ['长辈', '商务', '安静聚餐'],
    reservationMode: 'required',
    noiseLevel: 'quiet',
  }),
  seed({
    id: 'poi_chili_free_corner',
    name: '不辣角落餐铺',
    phase: 'dining',
    title: '无辣晚餐',
    area: '雨棚广场',
    description: '无辣选项多，适合口味限制比较多的一桌。',
    budget: 'CNY 80-150/人',
    lnglat: [121.4803, 31.2332],
    notes: '可备注少油少盐。',
    tags: ['清淡', '无辣', '不辣', '少辣', '亲子', '室内'],
    suitableFor: ['亲子', '不吃辣', '长辈'],
    indoorScore: 5,
  }),
  seed({
    id: 'poi_pebble_pizza',
    name: '卵石披萨铺',
    phase: 'dining',
    title: '披萨简餐',
    area: '青桐路',
    description: '点单简单、分享方便，适合临时多人。',
    budget: 'CNY 70-130/人',
    lnglat: [121.4747, 31.2303],
    notes: '大桌有限，建议提前确认。',
    tags: ['多人友好', '分享', '预算可控'],
  }),
  seed({
    id: 'poi_lantern_late_diner',
    name: '纸灯夜食堂',
    phase: 'dining',
    title: '夜间简餐',
    area: '星桥弄',
    description: '营业到较晚，适合计划拖延后的兜底晚餐。',
    budget: 'CNY 60-120/人',
    lnglat: [121.4776, 31.2333],
    notes: '夜间可用，但不适合亲子。',
    tags: ['夜间', '兜底', '翻台快'],
    suitableFor: ['夜间', '临时变更'],
    avoidFor: ['亲子低龄'],
  }),

  seed({
    id: 'poi_roost_dessert',
    name: '栖木甜品工坊',
    phase: 'leisure',
    title: '甜品休息',
    area: '栖木弄',
    description: '轻松停靠点，适合吸收时间误差。',
    budget: 'CNY 35-75/人',
    lnglat: [121.4749, 31.231],
    notes: '可作为休息、等人或切蛋糕前的缓冲。',
    tags: ['甜品', '休息', '缓冲', '生日'],
    address: '栖木弄 5 号',
    hours: '12:00-22:00',
    booking: '通常无需预约',
    queue: '下午茶时段可能排队 10 分钟',
    confidence: 'Mock 可信度 87%',
    contact: '虚构电话 021-0000-0505',
  }),
  seed({
    id: 'poi_ripple_cafe',
    name: '涟漪咖啡角',
    phase: 'leisure',
    title: '咖啡小坐',
    area: '青桐路',
    description: '方便等待或调整后续安排。',
    budget: 'CNY 35-70/人',
    lnglat: [121.4748, 31.231],
    notes: '适合作为 Agent 插入的缓冲节点。',
    tags: ['咖啡', '等待', '缓冲', '安静'],
    address: '青桐路 11 号转角',
    hours: '08:30-21:00',
    booking: '无需预约',
    queue: '通常不用排队',
    confidence: 'Mock 可信度 82%',
    contact: '虚构电话 021-0000-1111',
    noiseLevel: 'quiet',
  }),
  seed({
    id: 'poi_marble_photo_corner',
    name: '大理石街角镜',
    phase: 'leisure',
    title: '拍照停靠',
    area: '河岸街',
    description: '街角装置适合 15-30 分钟拍照，不拉长行程。',
    budget: 'CNY 0-30/人',
    lnglat: [121.4827, 31.232],
    notes: '雨天可改去室内拍照点。',
    tags: ['拍照', '低消费', '短停', '户外'],
    priceLevel: 1,
    indoorScore: 1,
  }),
  seed({
    id: 'poi_willow_tea_bench',
    name: '柳荫茶座',
    phase: 'leisure',
    title: '茶座休息',
    area: '梧桐里',
    description: '比咖啡更低刺激，适合聊天和恢复体力。',
    budget: 'CNY 30-65/人',
    lnglat: [121.4757, 31.2319],
    notes: '不喝酒、低刺激收尾也可用。',
    tags: ['茶饮', '安静', '低刺激', '缓冲'],
    noiseLevel: 'quiet',
  }),
  seed({
    id: 'poi_clockwork_arcade_cafe',
    name: '发条咖啡机',
    phase: 'leisure',
    title: '咖啡休息',
    area: '星桥弄',
    description: '有少量小游戏和插座，适合等人或复盘。',
    budget: 'CNY 35-85/人',
    lnglat: [121.4767, 31.2328],
    notes: '座位有限，大桌需要确认。',
    tags: ['咖啡', '插座', '缓冲', '朋友'],
  }),
  seed({
    id: 'poi_rainproof_mall_lounge',
    name: '雨棚广场休息廊',
    phase: 'leisure',
    title: '室内缓冲',
    area: '雨棚广场',
    description: '室内公共休息点，雨天和路线延迟时很稳。',
    budget: 'CNY 0-40/人',
    lnglat: [121.4794, 31.2332],
    notes: '不强制消费，适合临时等待。',
    tags: ['室内', '雨天', '低消费', '等待'],
    priceLevel: 1,
    indoorScore: 5,
  }),
  seed({
    id: 'poi_postcard_shop',
    name: '邮票明信片铺',
    phase: 'leisure',
    title: '小店慢逛',
    area: '栗子街',
    description: '小而明确的慢逛点，适合买个小纪念。',
    budget: 'CNY 20-80/人',
    lnglat: [121.4774, 31.2316],
    notes: '适合插入在两段之间。',
    tags: ['低消费', '纪念', '安静', '小店'],
    noiseLevel: 'quiet',
    priceLevel: 1,
  }),
  seed({
    id: 'poi_breeze_record_shop',
    name: '微风唱片阁',
    phase: 'leisure',
    title: '唱片慢逛',
    area: '青桐路',
    description: '能聊天也能各自逛，适合安静但不冷场的空档。',
    budget: 'CNY 0-120/人',
    lnglat: [121.4735, 31.2307],
    notes: '适合音乐偏好明确的人。',
    tags: ['安静', '小店', '低消费', '约会'],
    noiseLevel: 'quiet',
  }),
  seed({
    id: 'poi_cake_slice_bar',
    name: '一片蛋糕吧',
    phase: 'leisure',
    title: '蛋糕切片',
    area: '月桂里',
    description: '生日或饭后甜点都能接上，停留时间可控。',
    budget: 'CNY 45-90/人',
    lnglat: [121.4777, 31.2322],
    notes: '热门款可能售罄，适合做可替换节点。',
    tags: ['甜品', '生日', '缓冲', '饭后'],
  }),
  seed({
    id: 'poi_sunprint_station',
    name: '日晒蓝图小站',
    phase: 'leisure',
    title: '短手作',
    area: '河岸街',
    description: '30-45 分钟的小体验，适合不想大幅改计划时加入。',
    budget: 'CNY 40-95/人',
    lnglat: [121.482, 31.2317],
    notes: '晴天效果更好，雨天有室内替代材料。',
    tags: ['手作', '短停', '拍照', '缓冲'],
    indoorScore: 3,
  }),
  seed({
    id: 'poi_maple_quiet_cafe',
    name: '枫糖静咖',
    phase: 'leisure',
    title: '安静咖啡',
    area: '梧桐里',
    description: '低噪音、座位间距较大，适合认真聊天。',
    budget: 'CNY 40-90/人',
    lnglat: [121.4751, 31.2316],
    notes: '适合商务前后的小复盘。',
    tags: ['咖啡', '安静', '商务', '插座'],
    suitableFor: ['商务复盘', '安静约会'],
    noiseLevel: 'quiet',
  }),
  seed({
    id: 'poi_child_friendly_playcorner',
    name: '软糖亲子角',
    phase: 'leisure',
    title: '亲子缓冲',
    area: '雨棚广场',
    description: '孩子能短暂停留，大人也能休息。',
    budget: 'CNY 30-80/人',
    lnglat: [121.4801, 31.2339],
    notes: '适合家庭计划中吸收误差。',
    tags: ['亲子', '室内', '低体力', '缓冲'],
    indoorScore: 5,
  }),
  seed({
    id: 'poi_moonmilk_dessert',
    name: '月乳甜汤铺',
    phase: 'leisure',
    title: '甜汤休息',
    area: '雾岛弄',
    description: '温热甜汤，雨天和夜间都比较舒服。',
    budget: 'CNY 28-60/人',
    lnglat: [121.474, 31.2304],
    notes: '适合火锅后降刺激。',
    tags: ['甜品', '夜间', '低刺激', '预算可控'],
    priceLevel: 1,
  }),
  seed({
    id: 'poi_tiny_flower_market',
    name: '小枝花市',
    phase: 'leisure',
    title: '花市慢逛',
    area: '栗子街',
    description: '轻量拍照和买花，适合作为惊喜前置。',
    budget: 'CNY 30-120/人',
    lnglat: [121.4781, 31.231],
    notes: '雨天也可逛，但部分摊位会提前收。',
    tags: ['拍照', '生日', '小店', '约会'],
    indoorScore: 3,
  }),
  seed({
    id: 'poi_shelter_reading_bar',
    name: '雨棚阅读吧',
    phase: 'leisure',
    title: '阅读休息',
    area: '雨棚广场',
    description: '室内安静角落，适合等车、等位和临时复盘。',
    budget: 'CNY 0-50/人',
    lnglat: [121.4795, 31.2336],
    notes: '非强消费点，适合兜底。',
    tags: ['室内', '安静', '等待', '低消费'],
    priceLevel: 1,
    noiseLevel: 'quiet',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_spark_photo_booth',
    name: '火花贴纸相馆',
    phase: 'leisure',
    title: '贴纸拍照',
    area: '星桥弄',
    description: '快速出片，适合饭后或收尾前加一点记忆点。',
    budget: 'CNY 30-80/人',
    lnglat: [121.4772, 31.2328],
    notes: '高峰可能排队，但单次很快。',
    tags: ['拍照', '夜间', '短停', '朋友'],
  }),
  seed({
    id: 'poi_brown_sugar_cart',
    name: '黑糖热饮车',
    phase: 'leisure',
    title: '热饮短停',
    area: '河岸街',
    description: '无需坐下的短暂停靠，适合路线中补一口热饮。',
    budget: 'CNY 18-35/人',
    lnglat: [121.4818, 31.2324],
    notes: '天气差时不建议特意绕路。',
    tags: ['热饮', '低消费', '短停', '路线'],
    priceLevel: 1,
    indoorScore: 1,
  }),
  seed({
    id: 'poi_terrace_daylight',
    name: '日光露台座',
    phase: 'leisure',
    title: '露台小坐',
    area: '梧桐里',
    description: '晴天氛围好，适合下午放松。',
    budget: 'CNY 45-95/人',
    lnglat: [121.476, 31.232],
    notes: '雨天需切换到室内备选。',
    tags: ['露台', '拍照', '约会', '晴天'],
    avoidFor: ['雨天'],
    indoorScore: 2,
  }),
  seed({
    id: 'poi_stationery_corner',
    name: '方格文具角',
    phase: 'leisure',
    title: '文具慢逛',
    area: '青桐路',
    description: '低成本、低体力、容易跳过的小店。',
    budget: 'CNY 0-60/人',
    lnglat: [121.4731, 31.2302],
    notes: '适合填补 20-40 分钟。',
    tags: ['小店', '低消费', '安静', '短停'],
    priceLevel: 1,
    noiseLevel: 'quiet',
  }),

  seed({
    id: 'poi_starlamp_bar',
    name: '星灯清吧',
    phase: 'drinks',
    title: '小酌收尾',
    area: '星灯路',
    description: '收尾氛围轻松，适合可取消的夜间节点。',
    budget: 'CNY 70-130/人',
    lnglat: [121.481, 31.233],
    notes: '不默认真实预订，出发前需确认营业。',
    tags: ['收尾', '夜间', '可取消', '小酌'],
    address: '星灯路 2 号 2F',
    hours: '18:00-01:00',
    booking: '如需卡座建议提前确认',
    queue: '低峰通常不用排队',
    confidence: 'Mock 可信度 76%',
    contact: '虚构电话 021-0000-0202',
  }),
  seed({
    id: 'poi_camellia_tea',
    name: '山茶夜茶铺',
    phase: 'drinks',
    title: '茶饮夜坐',
    area: '山茶弄',
    description: '不喝酒也能坐一会儿，夜间刺激更低。',
    budget: 'CNY 35-70/人',
    lnglat: [121.4798, 31.2329],
    notes: '适合亲子以外的轻松收尾。',
    tags: ['茶饮', '低刺激', '夜坐', '不喝酒', '安静'],
    address: '山茶弄 16 号',
    hours: '13:00-23:30',
    booking: '无需预约',
    queue: '周末晚间可能排队 5-10 分钟',
    confidence: 'Mock 可信度 78%',
    contact: '虚构电话 021-0000-1616',
    noiseLevel: 'quiet',
  }),
  seed({
    id: 'poi_amber_mocktail',
    name: '琥珀无酒精吧',
    phase: 'drinks',
    title: '无酒精收尾',
    area: '河岸街',
    description: '无酒精特调，适合有人不喝酒但还想夜坐。',
    budget: 'CNY 55-110/人',
    lnglat: [121.4822, 31.233],
    notes: '适合低刺激夜间收尾。',
    tags: ['不喝酒', '无酒精', '夜间', '低刺激'],
    suitableFor: ['不喝酒', '约会', '低刺激'],
    noiseLevel: 'moderate',
  }),
  seed({
    id: 'poi_cedar_whisky_room',
    name: '雪松威士忌室',
    phase: 'drinks',
    title: '安静小酌',
    area: '栗子街',
    description: '座位少、声音低，适合认真聊天的夜间收束。',
    budget: 'CNY 120-240/人',
    lnglat: [121.4789, 31.2315],
    notes: '不适合亲子和预算敏感计划。',
    tags: ['安静', '小酌', '夜间', '可预约'],
    suitableFor: ['约会', '商务轻收尾'],
    avoidFor: ['亲子', '预算敏感'],
    reservationMode: 'recommended',
    noiseLevel: 'quiet',
    priceLevel: 4,
  }),
  seed({
    id: 'poi_lime_music_bar',
    name: '青柠现场吧',
    phase: 'drinks',
    title: '现场音乐',
    area: '星桥弄',
    description: '氛围更热闹，适合朋友局最后一站。',
    budget: 'CNY 90-180/人',
    lnglat: [121.4779, 31.2336],
    notes: '噪音高，不适合商务或安静需求。',
    tags: ['夜间', '音乐', '朋友', '热闹'],
    suitableFor: ['朋友聚会'],
    avoidFor: ['商务', '安静'],
    noiseLevel: 'lively',
  }),
  seed({
    id: 'poi_white_peach_soda',
    name: '白桃气泡铺',
    phase: 'drinks',
    title: '轻饮收尾',
    area: '雨棚广场',
    description: '商场内轻饮，末段不想喝酒时很稳。',
    budget: 'CNY 30-65/人',
    lnglat: [121.4804, 31.2335],
    notes: '适合亲子以外的低刺激计划，也可打包带走。',
    tags: ['不喝酒', '商场', '低刺激', '预算可控'],
    indoorScore: 5,
    priceLevel: 1,
  }),
  seed({
    id: 'poi_velvet_rooftop',
    name: '丝绒天台吧',
    phase: 'drinks',
    title: '露台小酌',
    area: '河岸街',
    description: '夜景感更强，适合晴天和纪念日。',
    budget: 'CNY 110-220/人',
    lnglat: [121.4832, 31.2334],
    notes: '雨天应换室内收尾。',
    tags: ['夜景', '约会', '小酌', '拍照'],
    suitableFor: ['约会', '纪念日'],
    avoidFor: ['雨天'],
    indoorScore: 2,
    priceLevel: 3,
  }),
  seed({
    id: 'poi_jasmine_late_tea',
    name: '茉莉深夜茶室',
    phase: 'drinks',
    title: '深夜茶室',
    area: '梧桐里',
    description: '营业较晚但刺激低，适合聊天型收尾。',
    budget: 'CNY 45-85/人',
    lnglat: [121.4753, 31.2323],
    notes: '适合不想喝酒、不想太吵的晚上。',
    tags: ['茶饮', '夜间', '安静', '不喝酒'],
    noiseLevel: 'quiet',
  }),
  seed({
    id: 'poi_neon_dessert_bar',
    name: '霓虹甜酒铺',
    phase: 'drinks',
    title: '甜酒收尾',
    area: '星桥弄',
    description: '甜口饮品和小甜点，适合生日后的轻收尾。',
    budget: 'CNY 70-150/人',
    lnglat: [121.4774, 31.2337],
    notes: '有无酒精版本，但需现场确认。',
    tags: ['生日', '夜间', '甜品', '小酌'],
    suitableFor: ['生日', '朋友'],
  }),
  seed({
    id: 'poi_quiet_hotel_lounge',
    name: '静栖大堂吧',
    phase: 'drinks',
    title: '大堂吧收尾',
    area: '雨棚广场',
    description: '安静、座位稳定，适合商务或长辈收尾。',
    budget: 'CNY 90-180/人',
    lnglat: [121.4791, 31.234],
    notes: '价格偏高，但确定性好。',
    tags: ['商务', '安静', '夜间', '高确定性'],
    suitableFor: ['商务', '长辈', '安静聊天'],
    noiseLevel: 'quiet',
    reservationMode: 'recommended',
    priceLevel: 3,
  }),
]

const lifeServicePoiCatalog: FictionalPoi[] = [
  seed({
    id: 'poi_linen_clock_hotel',
    name: '亚麻时钟旅店',
    phase: 'leisure',
    serviceCategory: 'hotel',
    title: '安静住宿',
    area: '雨棚广场',
    description: '虚构精品旅店，强调安静和晚到容错，适合把夜间计划闭环。',
    budget: 'CNY 420-760/晚',
    lnglat: [121.4795, 31.2342],
    notes: '适合夜间收束后的模拟入住，不代表真实房态。',
    tags: ['酒店', '住宿', '安静', '大床', '双床', '夜间'],
    reservationMode: 'required',
    noiseLevel: 'quiet',
    indoorScore: 5,
    priceLevel: 3,
    durationRangeMinutes: [480, 720],
  }),
  seed({
    id: 'poi_cedar_courtyard_hotel',
    name: '雪松内院酒店',
    phase: 'leisure',
    serviceCategory: 'hotel',
    title: '内院酒店',
    area: '梧桐里',
    description: '虚构内院型酒店，动线短，适合家庭或长辈同行。',
    budget: 'CNY 520-880/晚',
    lnglat: [121.4758, 31.2308],
    notes: '模拟房型包含亲子和双床选项。',
    tags: ['酒店', '住宿', '亲子', '家庭', '双床', '安静'],
    suitableFor: ['家庭', '长辈', '亲子'],
    reservationMode: 'required',
    noiseLevel: 'quiet',
    indoorScore: 5,
    priceLevel: 3,
  }),
  seed({
    id: 'poi_rainbell_business_hotel',
    name: '雨铃商务酒店',
    phase: 'leisure',
    serviceCategory: 'hotel',
    title: '商务住宿',
    area: '雨棚广场',
    description: '虚构商务酒店，靠近会客区，适合客户接待后的模拟入住。',
    budget: 'CNY 560-980/晚',
    lnglat: [121.4788, 31.2336],
    notes: '可模拟发票备注和早餐选项。',
    tags: ['酒店', '商务', '住宿', '早餐', '大床', '双床'],
    suitableFor: ['商务', '客户接待'],
    reservationMode: 'required',
    noiseLevel: 'quiet',
    indoorScore: 5,
    priceLevel: 4,
  }),
  seed({
    id: 'poi_moonbay_micro_hotel',
    name: '月湾微旅舍',
    phase: 'leisure',
    serviceCategory: 'hotel',
    title: '预算住宿',
    area: '杏仁巷',
    description: '虚构小体量旅舍，预算友好，适合临时过夜备选。',
    budget: 'CNY 260-480/晚',
    lnglat: [121.4729, 31.2301],
    notes: '房间更紧凑，适合预算敏感计划。',
    tags: ['酒店', '住宿', '预算可控', '临时备选', '大床'],
    reservationMode: 'recommended',
    priceLevel: 2,
    indoorScore: 5,
  }),
  seed({
    id: 'poi_glassharbor_view_hotel',
    name: '玻璃港景观酒店',
    phase: 'leisure',
    serviceCategory: 'hotel',
    title: '景观住宿',
    area: '河岸街',
    description: '虚构景观酒店，适合纪念日和拍照需求。',
    budget: 'CNY 680-1280/晚',
    lnglat: [121.4828, 31.2332],
    notes: '景观房为模拟库存，不能代表真实可订。',
    tags: ['酒店', '住宿', '景观', '拍照', '约会', '大床'],
    suitableFor: ['约会', '纪念日'],
    reservationMode: 'required',
    priceLevel: 4,
    indoorScore: 5,
  }),
  seed({
    id: 'poi_paperplane_family_inn',
    name: '纸飞机亲子公寓',
    phase: 'leisure',
    serviceCategory: 'hotel',
    title: '亲子公寓',
    area: '雨棚广场',
    description: '虚构亲子公寓，空间更大，适合带孩子的模拟住宿。',
    budget: 'CNY 480-820/晚',
    lnglat: [121.4801, 31.2344],
    notes: '可模拟儿童用品备注。',
    tags: ['酒店', '住宿', '亲子', '家庭', '双床', '儿童'],
    suitableFor: ['亲子', '家庭'],
    reservationMode: 'required',
    indoorScore: 5,
    priceLevel: 3,
  }),
  seed({
    id: 'poi_blueprint_aparthotel',
    name: '蓝图公寓酒店',
    phase: 'leisure',
    serviceCategory: 'hotel',
    title: '公寓酒店',
    area: '星桥弄',
    description: '虚构公寓式酒店，可模拟洗衣和长住友好配置。',
    budget: 'CNY 450-780/晚',
    lnglat: [121.4776, 31.2331],
    notes: '适合跨天计划或商务短住。',
    tags: ['酒店', '住宿', '商务', '长住', '大床', '双床'],
    suitableFor: ['商务', '跨天计划'],
    reservationMode: 'required',
    indoorScore: 5,
    priceLevel: 3,
  }),
  seed({
    id: 'poi_silent_reef_hotel',
    name: '静礁睡眠酒店',
    phase: 'leisure',
    serviceCategory: 'hotel',
    title: '睡眠酒店',
    area: '栗子街',
    description: '虚构睡眠主题酒店，强调低噪音和遮光。',
    budget: 'CNY 500-900/晚',
    lnglat: [121.4775, 31.2316],
    notes: '适合对安静敏感的模拟住宿。',
    tags: ['酒店', '住宿', '安静', '低刺激', '大床'],
    suitableFor: ['安静需求', '低刺激'],
    reservationMode: 'required',
    noiseLevel: 'quiet',
    indoorScore: 5,
    priceLevel: 3,
  }),
  seed({
    id: 'poi_orbit_cinema',
    name: '轨道影厅',
    phase: 'activity',
    serviceCategory: 'movie',
    title: '电影场次',
    area: '雨棚广场',
    description: '虚构影院，场次密集，适合雨天室内安排。',
    budget: 'CNY 58-108/人',
    lnglat: [121.4796, 31.2334],
    notes: '所有片名和场次均为 mock。',
    tags: ['电影', '影院', 'IMAX', '雨天', '室内'],
    reservationMode: 'recommended',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_magnolia_cinema',
    name: '木兰光影馆',
    phase: 'activity',
    serviceCategory: 'movie',
    title: '电影约会',
    area: '梧桐里',
    description: '虚构小型影院，偏安静，适合约会或低刺激安排。',
    budget: 'CNY 48-98/人',
    lnglat: [121.4754, 31.2312],
    notes: '可模拟情侣座和普通座。',
    tags: ['电影', '影院', '约会', '安静', '室内'],
    suitableFor: ['约会', '低刺激'],
    noiseLevel: 'quiet',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_skyline_imax_house',
    name: '天幕 IMAX 屋',
    phase: 'activity',
    serviceCategory: 'movie',
    title: 'IMAX 电影',
    area: '河岸街',
    description: '虚构大屏影厅，适合明确想看 IMAX 的用户。',
    budget: 'CNY 88-138/人',
    lnglat: [121.4826, 31.2329],
    notes: 'IMAX 标识为 mock 演示字段。',
    tags: ['电影', '影院', 'IMAX', '大屏', '夜间'],
    reservationMode: 'recommended',
    indoorScore: 5,
    priceLevel: 3,
  }),
  seed({
    id: 'poi_marble_arthouse',
    name: '大理石艺术影院',
    phase: 'activity',
    serviceCategory: 'movie',
    title: '艺术电影',
    area: '栗子街',
    description: '虚构艺术影院，片单更小众，适合文化主题行程。',
    budget: 'CNY 55-105/人',
    lnglat: [121.4772, 31.2314],
    notes: '适合不赶时间的室内主活动。',
    tags: ['电影', '影院', '艺术片', '文化', '安静'],
    noiseLevel: 'quiet',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_little_comet_cinema',
    name: '小彗星亲子影厅',
    phase: 'activity',
    serviceCategory: 'movie',
    title: '亲子电影',
    area: '雨棚广场',
    description: '虚构亲子影厅，场次更早，适合家庭雨天备选。',
    budget: 'CNY 45-90/人',
    lnglat: [121.4802, 31.234],
    notes: '模拟儿童票和亲子套票。',
    tags: ['电影', '影院', '亲子', '家庭', '雨天'],
    suitableFor: ['亲子', '家庭'],
    indoorScore: 5,
  }),
  seed({
    id: 'poi_midnight_reel',
    name: '午夜胶片厅',
    phase: 'activity',
    serviceCategory: 'movie',
    title: '夜场电影',
    area: '星桥弄',
    description: '虚构夜场影院，适合晚饭后的轻量收束。',
    budget: 'CNY 50-100/人',
    lnglat: [121.4778, 31.2335],
    notes: '夜场需关注散场交通，仍为 mock 信息。',
    tags: ['电影', '影院', '夜间', '室内'],
    indoorScore: 5,
  }),
  seed({
    id: 'poi_sunroom_cinema',
    name: '日光厅微影院',
    phase: 'activity',
    serviceCategory: 'movie',
    title: '微影院',
    area: '青桐路',
    description: '虚构微影院，厅小人少，适合安静看电影。',
    budget: 'CNY 48-88/人',
    lnglat: [121.4738, 31.2308],
    notes: '模拟小厅座位，不代表真实座位表。',
    tags: ['电影', '影院', '安静', '小厅', '室内'],
    noiseLevel: 'quiet',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_copper_star_cinema',
    name: '铜星杜比影城',
    phase: 'activity',
    serviceCategory: 'movie',
    title: '杜比电影',
    area: '月桂里',
    description: '虚构杜比影城，音效更强，适合作为明确主活动。',
    budget: 'CNY 78-128/人',
    lnglat: [121.4777, 31.2323],
    notes: '声效强，不适合低刺激用户。',
    tags: ['电影', '影院', '杜比', '大屏', '夜间'],
    avoidFor: ['低刺激'],
    noiseLevel: 'lively',
    indoorScore: 5,
    priceLevel: 3,
  }),
  seed({
    id: 'poi_petal_letter_florist',
    name: '花笺礼物铺',
    phase: 'leisure',
    serviceCategory: 'retail',
    title: '花礼自提',
    area: '梧桐里',
    description: '虚构花礼店，适合生日、纪念日或临时惊喜。',
    budget: 'CNY 88-260/份',
    lnglat: [121.4757, 31.2313],
    notes: '模拟花束和贺卡，不产生真实配送。',
    tags: ['花礼', '礼物', '生日', '约会', '自提'],
    suitableFor: ['生日', '纪念日', '约会'],
    priceLevel: 2,
  }),
  seed({
    id: 'poi_bamboo_portrait_service',
    name: '竹影快照服务台',
    phase: 'activity',
    serviceCategory: 'retail',
    title: '写真服务',
    area: '青桐路',
    description: '虚构快照服务台，可作为拍照需求的服务项补充。',
    budget: 'CNY 99-299/套',
    lnglat: [121.4746, 31.231],
    notes: '模拟成片和相框服务。',
    tags: ['写真', '拍照', '礼物', '纪念日', '室内'],
    suitableFor: ['约会', '闺蜜', '生日'],
    reservationMode: 'recommended',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_warmstone_spa',
    name: '暖石放松所',
    phase: 'leisure',
    serviceCategory: 'wellness',
    title: 'SPA 放松',
    area: '栗子街',
    description: '虚构放松服务，适合高体力活动后的缓冲。',
    budget: 'CNY 168-398/人',
    lnglat: [121.4771, 31.2319],
    notes: '模拟技师和时段，不代表真实预约。',
    tags: ['SPA', '放松', '安静', '雨天', '室内'],
    noiseLevel: 'quiet',
    reservationMode: 'required',
    indoorScore: 5,
    priceLevel: 3,
  }),
  seed({
    id: 'poi_leaf_ticket_booth',
    name: '叶片票务小站',
    phase: 'activity',
    serviceCategory: 'ticket',
    title: '活动票务',
    area: '雨棚广场',
    description: '虚构票务小站，提供展览、亲子和短演出票的 mock 选项。',
    budget: 'CNY 40-180/张',
    lnglat: [121.4798, 31.2337],
    notes: '仅用于演示票种选择。',
    tags: ['票务', '展览', '亲子', '场次', '雨天'],
    reservationMode: 'recommended',
    indoorScore: 5,
  }),
  seed({
    id: 'poi_locker_cloud_station',
    name: '云柜行李站',
    phase: 'leisure',
    serviceCategory: 'other',
    title: '行李寄存',
    area: '星桥弄',
    description: '虚构行李寄存站，适合跨天或拖箱计划。',
    budget: 'CNY 10-38/件',
    lnglat: [121.4772, 31.233],
    notes: '模拟寄存，不代表真实柜位。',
    tags: ['寄存', '行李', '预算可控', '临时备选'],
    priceLevel: 1,
    indoorScore: 5,
  }),
  seed({
    id: 'poi_crystal_bakery_box',
    name: '水晶烘焙盒',
    phase: 'leisure',
    serviceCategory: 'retail',
    title: '烘焙礼盒',
    area: '月桂里',
    description: '虚构烘焙礼盒店，适合餐后带走或生日补充。',
    budget: 'CNY 48-168/份',
    lnglat: [121.4778, 31.2325],
    notes: '模拟礼盒库存和自提时段。',
    tags: ['甜品', '礼盒', '生日', '自提', '预算可控'],
    priceLevel: 2,
  }),
  seed({
    id: 'poi_slowpulse_yoga',
    name: '慢拍瑜伽预约室',
    phase: 'activity',
    serviceCategory: 'wellness',
    title: '瑜伽预约',
    area: '梧桐里',
    description: '虚构轻瑜伽服务，适合健康主题或低强度活动。',
    budget: 'CNY 88-220/人',
    lnglat: [121.4759, 31.2319],
    notes: '模拟课程席位，不代表真实排课。',
    tags: ['瑜伽', '运动', '低强度', '预约', '室内'],
    reservationMode: 'required',
    indoorScore: 5,
  }),
]

export const fictionalPoiCatalog: FictionalPoi[] = [
  ...baseFictionalPoiCatalog,
  ...lifeServicePoiCatalog,
]

export function deriveCandidateSearchIntent(query = '', context: CandidateSearchContext = {}): CandidateSearchIntent {
  const normalizedQuery = normalizeSearchText(query)
  const positiveTags: string[] = []
  const negativeTags: string[] = []
  const hardConstraints: string[] = []
  const softPreferences: string[] = []

  const noSpicy = hasNoSpicyIntent(normalizedQuery)
  const spicy = !noSpicy && hasSpicyIntent(normalizedQuery)
  if (spicy) {
    positiveTags.push('辣味')
    softPreferences.push('偏辣口味')
  }
  if (!noSpicy && containsAnyText(normalizedQuery, ['川菜', '湘菜', '川湘'])) {
    positiveTags.push('川湘', '辣味')
    softPreferences.push('川湘口味')
  }
  if (!noSpicy && containsAnyText(normalizedQuery, ['串串', '签签', '钵钵'])) {
    positiveTags.push('串串', '辣味')
    softPreferences.push('串串/小签签')
  }
  if (noSpicy) {
    positiveTags.push('不辣', '清淡')
    negativeTags.push('辣味')
    hardConstraints.push('避免重辣')
  }
  if (containsAnyText(normalizedQuery, ['火锅', '涮锅', '涮肉', '锅底', 'hotpot'])) {
    positiveTags.push('火锅')
    softPreferences.push('火锅')
  }
  if (containsAnyText(normalizedQuery, ['亲子', '孩子', '儿童', '家庭', 'family'])) {
    positiveTags.push('亲子')
    softPreferences.push('亲子友好')
  }
  if (containsAnyText(normalizedQuery, ['商务', '客户', 'client'])) {
    positiveTags.push('商务')
    softPreferences.push('商务确定性')
  }
  if (containsAnyText(normalizedQuery, ['安静', '聊天', '能聊', '好聊', 'quiet'])) {
    positiveTags.push('安静')
    softPreferences.push('适合聊天')
    if (containsAnyText(normalizedQuery, ['安静', '能聊天', '好聊天'])) hardConstraints.push('控制噪音')
  }
  if (containsAnyText(normalizedQuery, ['预算', '便宜', '别太贵', '低预算'])) {
    positiveTags.push('预算可控')
    softPreferences.push('预算可控')
  }
  if (containsAnyText(normalizedQuery, ['室内', '雨', 'indoor'])) {
    positiveTags.push('室内')
    hardConstraints.push('室内/天气稳定')
  }
  if (containsAnyText(normalizedQuery, ['夜', '晚', 'night'])) {
    positiveTags.push('夜间')
    softPreferences.push('适配夜间时段')
  }

  const inferredTags = inferQueryTags(normalizedQuery)
  const requestedTags = uniqueCompact([...inferredTags, ...positiveTags])
  const targetPhase = context.phase ?? inferIntentPhase(normalizedQuery, requestedTags, context.serviceCategory)
  const serviceCategory = context.serviceCategory ?? inferIntentServiceCategory(normalizedQuery)
  const signalCount = requestedTags.length + negativeTags.length + hardConstraints.length + softPreferences.length
  const confidence = normalizedQuery
    ? Math.min(0.96, Math.max(0.48, 0.52 + signalCount * 0.07 + (targetPhase ? 0.08 : 0)))
    : 0.32
  const summaryParts = [
    targetPhase ? `目标 ${targetPhase}` : '目标待推断',
    requestedTags.length ? `偏好 ${requestedTags.join('/')}` : '',
    negativeTags.length ? `避开 ${negativeTags.join('/')}` : '',
    hardConstraints.length ? `约束 ${hardConstraints.join('/')}` : '',
  ].filter(Boolean)

  return {
    query,
    normalizedQuery,
    targetPhase,
    serviceCategory,
    positiveTags: uniqueCompact(positiveTags),
    negativeTags: uniqueCompact(negativeTags),
    hardConstraints: uniqueCompact(hardConstraints),
    softPreferences: uniqueCompact(softPreferences),
    requestedTags,
    confidence: Number(confidence.toFixed(2)),
    summary: summaryParts.join('；') || '没有明确候选偏好',
    rankingSignals: uniqueCompact([
      context.mode ? `mode:${context.mode}` : '',
      targetPhase ? `phase:${targetPhase}` : '',
      serviceCategory ? `service:${serviceCategory}` : '',
      ...requestedTags.map((tag) => `boost:${tag}`),
      ...negativeTags.map((tag) => `penalty:${tag}`),
      ...hardConstraints.map((item) => `hard:${item}`),
    ]),
  }
}

export function summarizeCandidateSearchIntent(intent: CandidateSearchIntent): CandidateSearchIntentSummary {
  return {
    targetPhase: intent.targetPhase,
    serviceCategory: intent.serviceCategory,
    positiveTags: intent.positiveTags,
    negativeTags: intent.negativeTags,
    hardConstraints: intent.hardConstraints,
    softPreferences: intent.softPreferences,
    confidence: intent.confidence,
    summary: intent.summary,
    rankingSignals: intent.rankingSignals,
  }
}

export function searchFictionalPois(input: FictionalPoiSearchInput): FictionalPoiSearchResult[] {
  const phase = input.phase ? normalizePoiPhase(input.phase) : undefined
  const normalizedQuery = normalizeSearchText(input.query)
  const intent = input.intent ?? deriveCandidateSearchIntent(input.query, {
    phase: input.phase,
    serviceCategory: input.serviceCategory,
  })
  const requestedTags = uniqueCompact([
    ...intent.requestedTags,
    ...(input.tags ?? []).map(normalizeSearchText).filter(Boolean),
  ])
  const excluded = new Set(input.excludePoiIds ?? [])
  const limit = Math.max(1, Math.min(50, input.limit ?? 20))

  const scored = fictionalPoiCatalog
    .filter((poi) => !phase || poi.phase === phase)
    .filter((poi) => !input.serviceCategory || poi.serviceCategory === input.serviceCategory)
    .filter((poi) => !excluded.has(poi.id))
    .filter((poi) => !input.area || normalizeSearchText(poi.area).includes(normalizeSearchText(input.area)))
    .filter((poi) => !input.maxPriceLevel || poi.priceLevel <= input.maxPriceLevel)
    .map((poi, index) => scorePoi(poi, index, { ...input, intent, normalizedQuery, requestedTags }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.poi.id.localeCompare(right.poi.id))

  return scored.slice(0, limit)
}

export function getFictionalPoiById(poiId: string | undefined) {
  return poiId ? fictionalPoiCatalog.find((poi) => poi.id === poiId) : undefined
}

export function getFictionalPoiByName(name: string | undefined) {
  return name ? fictionalPoiCatalog.find((poi) => poi.name === name) : undefined
}

export function getMerchantOfferingById(merchantId: string | undefined, offeringId: string | undefined) {
  const merchant = getFictionalPoiById(merchantId)
  return merchant && offeringId ? merchant.offerings.find((offering) => offering.id === offeringId) : undefined
}

export function getMerchantOfferings(merchantId: string | undefined) {
  return getFictionalPoiById(merchantId)?.offerings ?? []
}

export function searchMerchantOfferings(input: MerchantOfferingSearchInput): MerchantOfferingSearchResult[] {
  const normalizedQuery = normalizeSearchText(input.query)
  const requestedTags = [
    ...inferQueryTags(normalizedQuery),
    ...(input.tags ?? []).map(normalizeSearchText).filter(Boolean),
  ]
  const limit = Math.max(1, Math.min(80, input.limit ?? 20))
  return fictionalPoiCatalog
    .filter((merchant) => !input.merchantId || merchant.id === input.merchantId)
    .flatMap((merchant, merchantIndex) =>
      merchant.offerings
        .filter((offering) => !input.category || offering.category === input.category)
        .filter((offering) => !input.availableAt || offering.availabilitySlots.includes(input.availableAt) || offering.showtime === input.availableAt)
        .map((offering, offeringIndex) => scoreOffering(merchant, offering, merchantIndex, offeringIndex, {
          normalizedQuery,
          requestedTags,
        })),
    )
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.offering.id.localeCompare(right.offering.id))
    .slice(0, limit)
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
    serviceCategory: poi.serviceCategory,
    lnglat: poi.lnglat,
  }
}

function seed(seedInput: CompactPoiSeed): FictionalPoi {
  const stableIndex = stablePoiIndex(seedInput.id)
  const priceLevel = seedInput.priceLevel ?? inferPriceLevel(seedInput.budget)
  const queueRisk = seedInput.queueRisk ?? inferQueueRisk(seedInput.queue ?? '', seedInput.tags)
  const reservationMode = seedInput.reservationMode ?? inferReservationMode(seedInput.booking ?? '', seedInput.tags)
  const indoorScore = seedInput.indoorScore ?? inferIndoorScore(seedInput.tags)
  const noiseLevel = seedInput.noiseLevel ?? inferNoiseLevel(seedInput.tags)
  const serviceCategory = seedInput.serviceCategory ?? defaultServiceCategory(seedInput.phase, seedInput.tags)
  const availabilitySlots = seedInput.availabilitySlots ?? defaultAvailabilitySlots(seedInput.phase, serviceCategory)
  const offerings = seedInput.offerings ?? defaultOfferings({
    id: seedInput.id,
    name: seedInput.name,
    phase: seedInput.phase,
    serviceCategory,
    title: seedInput.title,
    description: seedInput.description,
    priceLevel,
    tags: seedInput.tags,
    availabilitySlots,
  })
  return {
    id: seedInput.id,
    name: seedInput.name,
    phase: seedInput.phase,
    serviceCategory,
    activityTitle: seedInput.title,
    description: seedInput.description,
    budget: seedInput.budget,
    lnglat: seedInput.lnglat,
    notes: seedInput.notes,
    address: seedInput.address ?? `${seedInput.area} ${12 + stableIndex} 号`,
    hours: seedInput.hours ?? defaultHours[seedInput.phase],
    booking: seedInput.booking ?? bookingText(reservationMode),
    queue: seedInput.queue ?? queueText(queueRisk),
    confidence: seedInput.confidence ?? `Mock 可信度 ${80 + stableIndex % 10}%`,
    contact: seedInput.contact ?? `虚构电话 021-0000-${String(1000 + stableIndex).slice(-4)}`,
    tags: seedInput.tags,
    area: seedInput.area,
    sceneTags: seedInput.sceneTags ?? uniqueCompact([...seedInput.tags, seedInput.area]),
    suitableFor: seedInput.suitableFor ?? defaultSuitableFor(seedInput.phase, seedInput.tags),
    avoidFor: seedInput.avoidFor ?? defaultAvoidFor(seedInput.tags),
    capacity: seedInput.capacity ?? defaultCapacity(seedInput.phase, seedInput.tags),
    noiseLevel,
    indoorScore,
    queueRisk,
    reservationMode,
    mockRating: seedInput.mockRating ?? Number((4.1 + (stableIndex % 8) * 0.1).toFixed(1)),
    priceLevel,
    durationRangeMinutes: seedInput.durationRangeMinutes ?? defaultDuration(seedInput.phase),
    bestTimeWindows: seedInput.bestTimeWindows ?? defaultBestTimeWindows(seedInput.phase),
    routeHints: seedInput.routeHints ?? [`${seedInput.area} mock 片区`, indoorScore >= 4 ? '雨天路线较稳' : '天气差时需准备备选'],
    offerings,
    orderableItems: seedInput.orderableItems ?? offeringsToOrderableItems(offerings),
    availabilitySlots,
    mockSource: 'fictional-local-mock-v2',
  }
}

function scorePoi(
  poi: FictionalPoi,
  index: number,
  input: FictionalPoiSearchInput & { intent: CandidateSearchIntent; normalizedQuery: string; requestedTags: string[] },
): FictionalPoiSearchResult {
  let score = 100 - index * 0.05
  const reasons = new Set<string>(['匹配当前阶段'])
  const haystack = normalizeSearchText([
    poi.id,
    poi.name,
    poi.activityTitle,
    poi.description,
    poi.notes,
    poi.area,
    poi.serviceCategory,
    ...poi.tags,
    ...poi.sceneTags,
    ...poi.suitableFor,
    ...poi.offerings.flatMap((offering) => [
      offering.title,
      offering.description,
      offering.category,
      offering.unit,
      offering.roomType,
      offering.bedType,
      offering.filmTitle,
      offering.screenType,
      offering.seatClass,
      offering.language,
      ...offering.tags,
    ]),
  ].join(' '))

  if (input.normalizedQuery) {
    const queryTokens = tokenize(input.normalizedQuery)
    const directHits = queryTokens.filter((token) => haystack.includes(token))
    score += directHits.length * 9
    if (directHits.length > 0) reasons.add('匹配文字需求')
  }

  for (const tag of input.requestedTags) {
    if (!tag) continue
    if (isStrongIntentTag(tag)) {
      if (hasStrongPoiSignal(poi, tag)) {
        score += 22
        reasons.add(reasonForTag(tag))
      }
      continue
    }
    if (haystack.includes(normalizeSearchText(tag))) {
      score += 18
      reasons.add(reasonForTag(tag))
    }
  }

  for (const strongTag of ['火锅', '咖啡', '不喝酒', '酒店', '住宿', '电影', '影院', '双床', '大床', 'IMAX']) {
    if (input.requestedTags.includes(strongTag) && !hasStrongPoiSignal(poi, strongTag)) {
      score -= 110
    }
  }

  if (input.intent.positiveTags.includes('辣味')) {
    if (hasSpicyPoiSignal(poi)) {
      score += 34
      reasons.add('匹配辣味需求')
    } else {
      score -= 34
    }
  }
  if (input.intent.positiveTags.includes('川湘')) {
    if (hasTagLike(poi, ['川湘', '川菜', '湘菜', '麻辣', '香辣'])) {
      score += 24
      reasons.add('匹配川湘口味')
    } else {
      score -= 8
    }
  }
  if (input.intent.positiveTags.includes('串串')) {
    if (hasTagLike(poi, ['串串', '签签', '钵钵'])) {
      score += 30
      reasons.add('匹配串串需求')
    } else {
      score -= 10
    }
  }
  if (input.intent.negativeTags.includes('辣味')) {
    if (hasSpicyPoiSignal(poi) && !hasNoSpicyPoiSignal(poi)) {
      score -= 72
      reasons.add('避开重辣风险')
    } else {
      score += 28
      reasons.add('匹配不辣/少辣要求')
    }
  }
  if (input.intent.positiveTags.includes('亲子')) {
    if (hasTagLike(poi, ['亲子', '家庭', '儿童', '儿童椅'])) {
      score += 22
      reasons.add('考虑亲子友好')
    } else {
      score -= 8
    }
    if (hasSpicyPoiSignal(poi) && !hasNoSpicyPoiSignal(poi)) {
      score -= 14
      reasons.add('口味偏重，带孩子需备注少辣')
    }
  }
  if (input.intent.positiveTags.includes('商务')) {
    if (hasTagLike(poi, ['商务', '包间', '投屏']) || poi.noiseLevel === 'quiet') {
      score += 22
      reasons.add('考虑商务确定性')
    }
    if (poi.noiseLevel === 'lively' || hasTagLike(poi, ['热闹'])) {
      score -= 24
      reasons.add('噪音较高，不适合商务')
    }
  }
  if (input.intent.positiveTags.includes('安静')) {
    score += poi.noiseLevel === 'quiet' ? 24 : poi.noiseLevel === 'moderate' ? 6 : -22
    reasons.add(poi.noiseLevel === 'lively' ? '热闹场景，聊天风险较高' : '匹配安静/聊天需求')
  }

  if (input.normalizedQuery.includes('近') || input.normalizedQuery.includes('near')) {
    score += 8
    reasons.add('匹配近距离偏好')
  }
  if (input.nearLnglat) {
    const distance = distanceKm(input.nearLnglat, poi.lnglat)
    score += Math.max(0, 24 - distance * 8)
    if (distance <= 1.2) reasons.add('距离当前节点较近')
  }
  if (input.normalizedQuery.includes('预算') || input.normalizedQuery.includes('便宜') || input.normalizedQuery.includes('别太贵')) {
    score += Math.max(0, 16 - poi.priceLevel * 3)
    reasons.add('考虑预算可控')
  }
  if (input.normalizedQuery.includes('室内') || input.normalizedQuery.includes('雨') || input.normalizedQuery.includes('indoor')) {
    score += poi.indoorScore * 5
    reasons.add('匹配室内/天气约束')
  }
  if (input.normalizedQuery.includes('安静') || input.normalizedQuery.includes('quiet')) {
    score += poi.noiseLevel === 'quiet' ? 24 : poi.noiseLevel === 'moderate' ? 8 : -10
    reasons.add('匹配安静要求')
  }
  if (input.normalizedQuery.includes('不喝酒') || input.normalizedQuery.includes('无酒精')) {
    score += haystack.includes('不喝酒') || haystack.includes('无酒精') || haystack.includes('茶饮') ? 22 : -8
    reasons.add('考虑无酒精选项')
  }
  if (input.normalizedQuery.includes('夜') || input.normalizedQuery.includes('晚')) {
    score += haystack.includes('夜间') || poi.phase === 'drinks' ? 10 : 0
    reasons.add('适配夜间时段')
  }
  if (poi.queueRisk === 'low') score += 5
  if (poi.reservationMode === 'required' && input.normalizedQuery.includes('临时')) score -= 10
  if (poi.reservationMode !== 'none' && input.normalizedQuery.includes('可预约')) score += 9
  if (poi.mockRating >= 4.6) score += 4

  return {
    poi,
    score,
    reasons: [...reasons].slice(0, 6),
  }
}

function scoreOffering(
  merchant: FictionalPoi,
  offering: MerchantOffering,
  merchantIndex: number,
  offeringIndex: number,
  input: { normalizedQuery: string; requestedTags: string[] },
): MerchantOfferingSearchResult {
  let score = 100 - merchantIndex * 0.04 - offeringIndex * 0.02
  const reasons = new Set<string>(['匹配服务目录'])
  const haystack = normalizeSearchText([
    merchant.id,
    merchant.name,
    merchant.activityTitle,
    merchant.description,
    merchant.notes,
    merchant.area,
    merchant.serviceCategory,
    offering.id,
    offering.title,
    offering.description,
    offering.category,
    offering.unit,
    offering.fulfillment,
    offering.roomType,
    offering.bedType,
    offering.filmTitle,
    offering.showtime,
    offering.screenType,
    offering.seatClass,
    offering.language,
    ...(offering.amenities ?? []),
    ...offering.tags,
    ...merchant.tags,
    ...merchant.sceneTags,
    ...merchant.suitableFor,
  ].join(' '))

  if (input.normalizedQuery) {
    const queryTokens = tokenize(input.normalizedQuery)
    const directHits = queryTokens.filter((token) => haystack.includes(token))
    score += directHits.length * 12
    if (directHits.length > 0) reasons.add('匹配文字需求')
  }

  for (const tag of input.requestedTags) {
    if (!tag) continue
    if (haystack.includes(normalizeSearchText(tag))) {
      score += 20
      reasons.add(reasonForTag(tag))
    }
  }

  if (input.normalizedQuery.includes('酒店') || input.normalizedQuery.includes('住宿') || input.normalizedQuery.includes('住一')) {
    score += offering.category === 'hotel' ? 42 : -36
    if (offering.category === 'hotel') reasons.add('匹配住宿需求')
  }
  if (input.normalizedQuery.includes('电影') || input.normalizedQuery.includes('影院') || input.normalizedQuery.includes('imax')) {
    score += offering.category === 'movie' ? 42 : -36
    if (offering.category === 'movie') reasons.add('匹配电影/场次需求')
  }
  if (input.normalizedQuery.includes('双床')) {
    score += offering.bedType?.includes('双床') ? 34 : offering.category === 'hotel' ? -12 : 0
    if (offering.bedType?.includes('双床')) reasons.add('匹配房型偏好')
  }
  if (input.normalizedQuery.includes('大床')) {
    score += offering.bedType?.includes('大床') ? 30 : offering.category === 'hotel' ? -8 : 0
    if (offering.bedType?.includes('大床')) reasons.add('匹配房型偏好')
  }
  if (input.normalizedQuery.includes('两张') || input.normalizedQuery.includes('2张')) {
    score += offering.category === 'movie' || offering.category === 'ticket' ? 8 : 0
  }
  if (input.normalizedQuery.includes('预算') || input.normalizedQuery.includes('便宜') || input.normalizedQuery.includes('别太贵')) {
    score += Math.max(0, 18 - Math.round(offering.priceCny / 45))
    reasons.add('考虑预算可控')
  }
  if (input.normalizedQuery.includes('安静')) {
    score += merchant.noiseLevel === 'quiet' ? 16 : merchant.noiseLevel === 'lively' ? -10 : 4
    reasons.add('匹配安静要求')
  }
  if (input.normalizedQuery.includes('亲子') || input.normalizedQuery.includes('孩子')) {
    score += haystack.includes('亲子') || haystack.includes('儿童') || haystack.includes('家庭') ? 18 : 0
    reasons.add('考虑亲子友好')
  }
  if (input.normalizedQuery.includes('雨') || input.normalizedQuery.includes('室内')) {
    score += merchant.indoorScore * 3
    reasons.add('匹配室内/天气约束')
  }
  if (merchant.reservationMode === 'required') score += 3

  return {
    merchant,
    offering,
    score,
    reasons: [...reasons].slice(0, 5),
  }
}

function isStrongIntentTag(tag: string) {
  return ['火锅', '咖啡', '不喝酒', '酒店', '住宿', '电影', '影院', '双床', '大床', 'IMAX', '辣味', '不辣'].includes(tag)
}

function hasStrongPoiSignal(poi: FictionalPoi, tag: string) {
  const normalized = normalizeSearchText(tag)
  const core = normalizeSearchText([
    poi.name,
    poi.activityTitle,
    poi.serviceCategory,
    ...poi.tags,
    ...poi.sceneTags,
    ...poi.offerings.flatMap((offering) => [
      offering.title,
      offering.category,
      offering.roomType,
      offering.bedType,
      offering.filmTitle,
      offering.screenType,
      offering.seatClass,
      ...offering.tags,
    ]),
  ].join(' '))
  if (tag === '住宿') return poi.serviceCategory === 'hotel' || core.includes('酒店') || core.includes('住宿')
  if (tag === '影院') return poi.serviceCategory === 'movie' || core.includes('电影') || core.includes('影院')
  if (tag === '辣味') return hasSpicyPoiSignal(poi)
  if (tag === '不辣') return hasNoSpicyPoiSignal(poi)
  return core.includes(normalized)
}

function inferQueryTags(query: string) {
  const tags: string[] = []
  if (hasNoSpicyIntent(query)) {
    tags.push('不辣', '清淡')
  } else {
    if (hasSpicyIntent(query)) tags.push('辣味')
    if (containsAnyText(query, ['川菜', '湘菜', '川湘'])) tags.push('川湘')
    if (containsAnyText(query, ['串串', '签签', '钵钵'])) tags.push('串串')
  }
  const mapping: Array<[string[], string]> = [
    [['咖啡', 'coffee'], '咖啡'],
    [['甜品', '蛋糕'], '甜品'],
    [['拍照', '写真', 'photo'], '拍照'],
    [['火锅', '涮锅', '涮肉', 'hotpot'], '火锅'],
    [['亲子', '孩子', 'family'], '亲子'],
    [['商务', '客户', 'client'], '商务'],
    [['包间'], '包间'],
    [['室内', '雨', 'indoor'], '室内'],
    [['安静', 'quiet'], '安静'],
    [['不喝酒', '无酒精'], '不喝酒'],
    [['夜', '晚', 'night'], '夜间'],
    [['预算', '便宜', '别太贵'], '预算可控'],
    [['酒店', '住宿', '住一晚', '住一夜', 'hotel'], '酒店'],
    [['大床', 'king', 'queen'], '大床'],
    [['双床', 'twin'], '双床'],
    [['电影', '影院', 'movie', 'cinema'], '电影'],
    [['imax', 'IMAX', '巨幕'], 'IMAX'],
    [['票', '门票', 'ticket'], '票务'],
    [['spa', '按摩', '放松'], 'SPA'],
    [['花', '花束', '礼物'], '花礼'],
  ]
  for (const [needles, tag] of mapping) {
    if (needles.some((needle) => query.includes(needle))) tags.push(tag)
  }
  return uniqueCompact(tags)
}

function reasonForTag(tag: string) {
  if (tag.includes('咖啡')) return '匹配咖啡/休息需求'
  if (tag.includes('甜品')) return '匹配甜品缓冲需求'
  if (tag.includes('拍照')) return '匹配拍照记忆点'
  if (tag.includes('火锅')) return '匹配火锅需求'
  if (tag.includes('辣味')) return '匹配辣味需求'
  if (tag.includes('川湘')) return '匹配川湘口味'
  if (tag.includes('串串')) return '匹配串串需求'
  if (tag.includes('不辣') || tag.includes('无辣') || tag.includes('清淡')) return '匹配不辣/少辣要求'
  if (tag.includes('亲子')) return '考虑亲子友好'
  if (tag.includes('商务')) return '考虑商务确定性'
  if (tag.includes('预算')) return '考虑预算可控'
  if (tag.includes('酒店') || tag.includes('住宿')) return '匹配住宿需求'
  if (tag.includes('电影') || tag.includes('影院') || tag.includes('IMAX')) return '匹配电影/场次需求'
  if (tag.includes('双床') || tag.includes('大床')) return '匹配房型偏好'
  if (tag.includes('票务')) return '匹配票务需求'
  return `匹配标签：${tag}`
}

function normalizePoiPhase(phase: SegmentPhase): FictionalPoiPhase {
  return phase === 'transit' ? 'leisure' : phase
}

function inferIntentPhase(
  query: string,
  requestedTags: string[],
  serviceCategory: MerchantServiceCategory | undefined,
): SegmentPhase | undefined {
  if (serviceCategory === 'hotel') return 'leisure'
  if (serviceCategory === 'movie' || serviceCategory === 'ticket') return 'activity'
  if (containsAnyText(query, ['饭', '吃', '餐厅', '晚餐', '午餐', 'dinner']) || requestedTags.some((tag) => ['辣味', '川湘', '串串', '不辣', '清淡', '火锅'].includes(tag))) return 'dining'
  if (containsAnyText(query, ['喝', '酒', '清吧', 'bar', 'drink'])) return 'drinks'
  if (serviceCategory) return 'leisure'
  return undefined
}

function inferIntentServiceCategory(query: string): MerchantServiceCategory | undefined {
  if (containsAnyText(query, ['酒店', '住宿', '住一晚', '住一夜', '双床', '大床', 'hotel'])) return 'hotel'
  if (containsAnyText(query, ['电影', '影院', 'imax', 'movie', 'cinema'])) return 'movie'
  if (containsAnyText(query, ['票', '门票', 'ticket'])) return 'ticket'
  if (containsAnyText(query, ['spa', '按摩', '瑜伽', '放松'])) return 'wellness'
  if (containsAnyText(query, ['花', '花束', '礼物', '写真'])) return 'retail'
  return undefined
}

function hasNoSpicyIntent(value: string) {
  return containsAnyText(value, ['不吃辣', '不能吃辣', '不要辣', '别太辣', '不辣', '无辣', '少辣', '微辣', '清淡'])
}

function hasSpicyIntent(value: string) {
  return containsAnyText(value, ['想吃辣', '吃辣', '辣的', '辣味', '麻辣', '香辣', '重口', '川菜', '湘菜', '川湘', '串串', '签签', '钵钵'])
}

function hasSpicyPoiSignal(poi: FictionalPoi) {
  return hasTagLike(poi, ['辣味', '麻辣', '香辣', '重口', '川湘', '川菜', '湘菜', '串串', '签签', '钵钵'])
}

function hasNoSpicyPoiSignal(poi: FictionalPoi) {
  return hasTagLike(poi, ['不辣', '无辣', '少辣', '微辣', '清淡', '低刺激'])
}

function hasTagLike(poi: FictionalPoi, needles: string[]) {
  const core = normalizeSearchText([
    poi.name,
    poi.activityTitle,
    poi.description,
    poi.notes,
    ...poi.tags,
    ...poi.sceneTags,
    ...poi.suitableFor,
    ...poi.avoidFor,
  ].join(' '))
  return needles.some((needle) => core.includes(normalizeSearchText(needle)))
}

function containsAnyText(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(normalizeSearchText(needle)))
}

function normalizeSearchText(value: string | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function tokenize(value: string) {
  return value
    .split(/[\s,，。；;、/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 12)
}

function minutesBetween(start: string, end: string) {
  return Math.max(30, toMinutes(end) - toMinutes(start))
}

function toMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10)
}

function inferPriceLevel(budget: string): MockPriceLevel {
  const numbers = budget.match(/\d+/g)?.map((item) => Number.parseInt(item, 10)) ?? []
  const high = Math.max(...numbers, 0)
  if (high <= 80) return 1
  if (high <= 160) return 2
  if (high <= 260) return 3
  return 4
}

function inferQueueRisk(queue: string, tags: string[]): MockQueueRisk {
  const text = `${queue} ${tags.join(' ')}`
  if (text.includes('高') || text.includes('20-30') || text.includes('排队风险偏高')) return 'high'
  if (text.includes('排队') || text.includes('10-20') || text.includes('热门')) return 'medium'
  return 'low'
}

function inferReservationMode(booking: string, tags: string[]): MockReservationMode {
  const text = `${booking} ${tags.join(' ')}`
  if (text.includes('必须') || text.includes('required') || text.includes('包间')) return 'required'
  if (text.includes('建议') || text.includes('预约') || text.includes('可预约')) return 'recommended'
  if (text.includes('无需预约')) return 'none'
  return 'walk-in'
}

function inferIndoorScore(tags: string[]) {
  const text = tags.join(' ')
  if (text.includes('室内') || text.includes('商场') || text.includes('雨天')) return 5
  if (text.includes('室内备选')) return 4
  if (text.includes('露台') || text.includes('户外')) return 2
  return 3
}

function inferNoiseLevel(tags: string[]): MockNoiseLevel {
  const text = tags.join(' ')
  if (text.includes('安静') || text.includes('低刺激') || text.includes('商务')) return 'quiet'
  if (text.includes('热闹') || text.includes('音乐') || text.includes('游戏')) return 'lively'
  return 'moderate'
}

function bookingText(mode: MockReservationMode) {
  if (mode === 'required') return '建议提前预约，现场座位不保证'
  if (mode === 'recommended') return '建议提前电话确认'
  if (mode === 'none') return '通常无需预约'
  return '可现场确认'
}

function queueText(risk: MockQueueRisk) {
  if (risk === 'high') return '热门时段需预留 20-30 分钟'
  if (risk === 'medium') return '高峰约 10-20 分钟'
  return '低峰通常不用排队'
}

function defaultSuitableFor(phase: FictionalPoiPhase, tags: string[]) {
  const values = [
    tags.includes('商务') ? '商务' : '',
    tags.includes('亲子') ? '亲子' : '',
    tags.includes('生日') ? '生日' : '',
    tags.includes('拍照') ? '拍照' : '',
    phase === 'dining' ? '正餐' : phase === 'drinks' ? '夜间收尾' : phase === 'leisure' ? '机动缓冲' : '轻量活动',
  ]
  return uniqueCompact(values)
}

function defaultAvoidFor(tags: string[]) {
  const values = [
    tags.includes('热闹') || tags.includes('音乐') ? '需要安静交谈' : '',
    tags.includes('户外') || tags.includes('露台') ? '雨天' : '',
    tags.includes('小酌') ? '亲子低龄' : '',
  ]
  return uniqueCompact(values)
}

function defaultCapacity(phase: FictionalPoiPhase, tags: string[]) {
  if (tags.includes('多人友好') || tags.includes('多人')) return '2-8 人'
  if (tags.includes('包间')) return '4-10 人'
  if (phase === 'drinks') return '2-6 人'
  return '1-4 人'
}

function defaultDuration(phase: FictionalPoiPhase): [number, number] {
  if (phase === 'activity') return [60, 120]
  if (phase === 'dining') return [60, 100]
  if (phase === 'drinks') return [45, 90]
  return [20, 60]
}

function defaultBestTimeWindows(phase: FictionalPoiPhase) {
  if (phase === 'dining') return ['11:30-13:30', '17:30-20:30']
  if (phase === 'drinks') return ['19:30-23:30']
  if (phase === 'leisure') return ['14:00-17:30', '19:00-21:00']
  return ['10:30-12:00', '14:00-18:00']
}

function defaultServiceCategory(phase: FictionalPoiPhase, tags: string[]): MerchantServiceCategory {
  const text = tags.join(' ').toLowerCase()
  if (text.includes('酒店') || text.includes('住宿')) return 'hotel'
  if (text.includes('电影') || text.includes('影院') || text.includes('imax')) return 'movie'
  if (text.includes('spa') || text.includes('瑜伽') || text.includes('放松')) return 'wellness'
  if (text.includes('票务') || text.includes('门票')) return 'ticket'
  if (text.includes('礼物') || text.includes('花礼') || text.includes('自提')) return 'retail'
  if (phase === 'dining') return 'dining'
  if (phase === 'drinks') return 'drinks'
  if (phase === 'activity') return 'activity'
  return 'other'
}

function defaultOfferings(input: {
  id: string
  name: string
  phase: FictionalPoiPhase
  serviceCategory: MerchantServiceCategory
  title: string
  description: string
  priceLevel: MockPriceLevel
  tags: string[]
  availabilitySlots: string[]
}): MerchantOffering[] {
  const base = input.priceLevel * 30
  if (input.serviceCategory === 'hotel') {
    return [
      {
        id: `${input.id}_room_queen`,
        merchantId: input.id,
        category: 'hotel',
        title: '舒睡大床房',
        description: `${input.name} 的 mock 大床房，适合两人安静入住。`,
        priceCny: Math.max(298, base * 8),
        unit: '晚',
        durationMinutes: 720,
        availabilitySlots: ['今晚 20:00', '明天 14:00', '周末 15:00'],
        tags: uniqueCompact([...input.tags, '大床', '住宿', '安静']),
        fulfillment: 'room-night',
        refundPolicy: 'sandbox 模拟房型，可随时移除；非真实取消规则。',
        mockSource: 'fictional-local-mock-v2',
        roomType: '舒睡房',
        bedType: '1 张大床',
        occupancy: 2,
        checkInTime: '14:00',
        checkOutTime: '12:00',
        amenities: ['遮光窗帘', '模拟早餐可选', '行李寄存'],
      },
      {
        id: `${input.id}_room_twin`,
        merchantId: input.id,
        category: 'hotel',
        title: '标准双床房',
        description: `${input.name} 的 mock 双床房，适合朋友、亲子或商务同行。`,
        priceCny: Math.max(328, base * 9),
        unit: '晚',
        durationMinutes: 720,
        availabilitySlots: ['今晚 20:00', '明天 14:00', '周末 15:00'],
        tags: uniqueCompact([...input.tags, '双床', '住宿', '家庭', '商务']),
        fulfillment: 'room-night',
        refundPolicy: 'sandbox 模拟房型，可随时移除；非真实取消规则。',
        mockSource: 'fictional-local-mock-v2',
        roomType: '标准房',
        bedType: '2 张单人床',
        occupancy: 2,
        checkInTime: '14:00',
        checkOutTime: '12:00',
        amenities: ['双床', '模拟早餐可选', '可备注安静房'],
      },
      {
        id: `${input.id}_room_family`,
        merchantId: input.id,
        category: 'hotel',
        title: '家庭/行政房',
        description: `${input.name} 的 mock 大空间房型，适合家庭或商务升级。`,
        priceCny: Math.max(468, base * 12),
        unit: '晚',
        durationMinutes: 720,
        availabilitySlots: ['今晚 20:00', '明天 14:00', '周末 15:00'],
        tags: uniqueCompact([...input.tags, '家庭', '亲子', '商务', '早餐']),
        fulfillment: 'room-night',
        refundPolicy: 'sandbox 模拟房型，可随时移除；非真实取消规则。',
        mockSource: 'fictional-local-mock-v2',
        roomType: '家庭/行政房',
        bedType: '大床 + 沙发床',
        occupancy: 3,
        checkInTime: '14:00',
        checkOutTime: '12:00',
        amenities: ['更大空间', '模拟早餐', '儿童用品备注'],
      },
    ]
  }
  if (input.serviceCategory === 'movie') {
    const films = movieTitlesFor(input.id)
    return films.map((film, index) => ({
      id: `${input.id}_show_${index + 1}`,
      merchantId: input.id,
      category: 'movie' as const,
      title: `${film.title} ${film.showtime}`,
      description: `${input.name} 的 mock 电影场次，片名、座位和库存均为虚构。`,
      priceCny: Math.max(45, base + index * 18),
      unit: '张',
      durationMinutes: film.runtimeMinutes,
      availabilitySlots: [film.showtime],
      tags: uniqueCompact([...input.tags, film.screenType, film.language, film.seatClass, '电影票']),
      fulfillment: 'e-ticket' as const,
      refundPolicy: 'sandbox 模拟票，不锁座、不出票、不退款。',
      mockSource: 'fictional-local-mock-v2' as const,
      filmTitle: film.title,
      showtime: film.showtime,
      screenType: film.screenType,
      seatClass: film.seatClass,
      language: film.language,
      runtimeMinutes: film.runtimeMinutes,
    }))
  }
  if (input.serviceCategory === 'retail') {
    return [
      offering(input, 'gift_basic', '轻量礼物/自提', '适合临时加一个小惊喜，确认后只生成 sandbox 项目。', Math.max(48, base), '份', 'pickup', ['自提', '礼物']),
      offering(input, 'gift_plus', '升级礼盒/服务套装', '适合生日、纪念日或拍照前准备。', Math.max(128, base * 2), '份', 'pickup', ['礼盒', '生日']),
      offering(input, 'gift_note', '贺卡与备注服务', '用于演示商品备注和履约方式。', Math.max(18, Math.round(base * 0.4)), '份', 'pickup', ['贺卡', '备注']),
    ]
  }
  if (input.serviceCategory === 'wellness') {
    return [
      offering(input, 'wellness_45', '45 分钟放松服务', '短时段 mock 服务，适合插入空档。', Math.max(98, base * 2), '人', 'service-slot', ['放松', '45分钟']),
      offering(input, 'wellness_75', '75 分钟深度服务', '更完整的 mock 服务，适合把节奏放慢。', Math.max(168, base * 3), '人', 'service-slot', ['放松', '75分钟']),
      offering(input, 'wellness_pair', '双人同行服务', '适合约会或朋友同行的 mock 服务项。', Math.max(298, base * 5), '组', 'service-slot', ['双人', '预约']),
    ]
  }
  if (input.serviceCategory === 'ticket') {
    return [
      offering(input, 'ticket_standard', '标准票', '普通 mock 票种，用于演示选择和入单。', Math.max(48, base), '张', 'e-ticket', ['票务', '标准票']),
      offering(input, 'ticket_family', '亲子套票', '适合家庭计划的 mock 套票。', Math.max(118, base * 2), '套', 'e-ticket', ['亲子', '家庭']),
      offering(input, 'ticket_flex', '可调整场次票', '用于演示可变时段和备选场次。', Math.max(78, Math.round(base * 1.5)), '张', 'e-ticket', ['场次', '灵活']),
    ]
  }
  if (input.serviceCategory === 'dining') {
    return [
      offering(input, 'seat', '模拟留座', '仅生成 sandbox 留座项目，不联系商户。', 0, '次', 'reservation', ['留座', '预约']),
      offering(input, 'meal_set', input.tags.includes('火锅') ? '双人火锅参考套餐' : '双人参考套餐', input.description, Math.max(88, base * 2), '套', 'onsite', ['套餐', '双人']),
    ]
  }
  if (input.serviceCategory === 'drinks') {
    return [
      offering(input, 'seat', '模拟夜间座位', '仅生成 sandbox 到店提醒，不联系商户。', 0, '次', 'reservation', ['座位', '夜间']),
      offering(input, 'drink_pair', '两杯参考饮品', input.description, Math.max(58, base), '组', 'onsite', ['饮品', '双人']),
    ]
  }
  if (input.serviceCategory === 'activity') {
    return [
      offering(input, 'slot', '模拟场次确认', '用于演示活动场次确认，不代表真实预约。', 0, '次', 'reservation', ['场次', '预约']),
      offering(input, 'ticket_pair', '双人体验参考', input.description, Math.max(80, base * 2), '组', 'onsite', ['体验', '双人']),
    ]
  }
  return [
    offering(input, 'arrival', '模拟到店提醒', '用于演示轻量服务确认。', 0, '次', 'mock-only', ['到店', '提醒']),
    offering(input, 'light_item', '轻量消费参考', input.description, Math.max(28, base), '份', 'onsite', ['轻量', '参考']),
  ]
}

function offering(
  input: {
    id: string
    serviceCategory: MerchantServiceCategory
    tags: string[]
    availabilitySlots: string[]
  },
  suffix: string,
  title: string,
  description: string,
  priceCny: number,
  unit: string,
  fulfillment: MerchantOffering['fulfillment'],
  tags: string[],
): MerchantOffering {
  return {
    id: `${input.id}_${suffix}`,
    merchantId: input.id,
    category: input.serviceCategory,
    title,
    description,
    priceCny,
    unit,
    availabilitySlots: input.availabilitySlots,
    tags: uniqueCompact([...input.tags, ...tags]),
    fulfillment,
    refundPolicy: 'sandbox 模拟项目，可随时移除；不代表真实退款规则。',
    mockSource: 'fictional-local-mock-v2',
  }
}

function movieTitlesFor(id: string) {
  const pool = [
    [
      { title: '《雾灯星球》', showtime: '15:20', screenType: 'IMAX', seatClass: '标准座', language: '国语', runtimeMinutes: 118 },
      { title: '《纸桥漫游》', showtime: '18:10', screenType: '激光厅', seatClass: '情侣座', language: '原声', runtimeMinutes: 104 },
      { title: '《第七朵云》', showtime: '20:40', screenType: '杜比厅', seatClass: '标准座', language: '国语', runtimeMinutes: 126 },
    ],
    [
      { title: '《月台来信》', showtime: '14:40', screenType: '小厅', seatClass: '标准座', language: '国语', runtimeMinutes: 96 },
      { title: '《晚风练习曲》', showtime: '17:30', screenType: '激光厅', seatClass: '情侣座', language: '原声', runtimeMinutes: 112 },
      { title: '《海盐森林》', showtime: '19:50', screenType: '杜比厅', seatClass: '标准座', language: '国语', runtimeMinutes: 121 },
    ],
    [
      { title: '《小彗星假日》', showtime: '13:30', screenType: '亲子厅', seatClass: '亲子座', language: '国语', runtimeMinutes: 92 },
      { title: '《雨棚侦探》', showtime: '16:20', screenType: '激光厅', seatClass: '标准座', language: '国语', runtimeMinutes: 108 },
      { title: '《午夜玻璃港》', showtime: '21:30', screenType: 'IMAX', seatClass: '标准座', language: '原声', runtimeMinutes: 130 },
    ],
  ]
  return pool[stablePoiIndex(id) % pool.length]!
}

function offeringsToOrderableItems(offerings: MerchantOffering[]): PoiOrderableItem[] {
  return offerings.slice(0, 2).map((offeringItem) => ({
    id: offeringItem.id,
    label: offeringItem.title,
    priceCny: offeringItem.priceCny,
    category: offeringItem.category,
  }))
}

function defaultAvailabilitySlots(phase: FictionalPoiPhase, serviceCategory?: MerchantServiceCategory) {
  if (serviceCategory === 'hotel') return ['今晚 20:00', '明天 14:00', '周末 15:00']
  if (serviceCategory === 'movie') return ['15:20', '18:10', '20:40']
  if (serviceCategory === 'wellness') return ['14:00', '16:00', '19:30']
  if (serviceCategory === 'ticket') return ['13:30', '15:30', '18:30']
  if (phase === 'dining') return ['17:30', '18:30', '19:30']
  if (phase === 'drinks') return ['20:00', '21:00', '22:00']
  if (phase === 'leisure') return ['14:30', '16:00', '19:30']
  return ['13:30', '15:00', '16:30']
}

function stablePoiIndex(id: string) {
  return id.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % 9000
}

function uniqueCompact(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
}

function distanceKm(from: [number, number], to: [number, number]) {
  const rad = Math.PI / 180
  const earthKm = 6371
  const dLat = (to[1] - from[1]) * rad
  const dLng = (to[0] - from[0]) * rad
  const lat1 = from[1] * rad
  const lat2 = to[1] * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earthKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
