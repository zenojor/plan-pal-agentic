import type { MerchantServiceCategory, Plan, PlanCommand, PlanSegment, SegmentPhase } from '@planpal/domain'

export type RoutedTurn =
  | {
      kind: 'command'
      command: PlanCommand
      reason: string
    }
  | {
      kind: 'candidate-search'
      mode: 'replace'
      segmentId: string
      query: string
      reason: string
    }
  | {
      kind: 'candidate-search'
      mode: 'add-after'
      afterSegmentId?: string | null
      query: string
      reason: string
    }
  | {
      kind: 'service-item-search'
      segmentId: string
      merchantId?: string
      category?: MerchantServiceCategory
      query: string
      reason: string
    }
  | {
      kind: 'clarification'
      title: string
      description: string
      requiredFields: string[]
      reason: string
    }
  | {
      kind: 'qa'
      answerSeed: string
      reason: string
    }

export type ModelTurnIntent = {
  action: 'qa' | 'replace' | 'add' | 'rewrite' | 'delete' | 'confirm' | 'service' | 'clarify'
  answer?: string
  category?: MerchantServiceCategory
  query?: string
  reason?: string
  targetPhase?: SegmentPhase
  targetSegmentId?: string
}

export function routeNaturalLanguageTurn(plan: Plan, message: string, selectedSegmentId?: string): RoutedTurn {
  const normalized = message.trim().toLowerCase()
  const target = findTargetSegment(plan, normalized, selectedSegmentId)
  const insertionAnchor = findInsertionAnchor(plan, normalized, selectedSegmentId)
  const serviceCategory = inferServiceCategory(normalized)
  const serviceTarget = serviceCategory ? findServiceSegment(plan, serviceCategory, selectedSegmentId) : undefined
  if (isServiceItemRequest(normalized) && serviceTarget) {
    return {
      kind: 'service-item-search',
      segmentId: serviceTarget.id,
      merchantId: serviceTarget.poiId,
      category: serviceTarget.serviceCategory ?? serviceCategory,
      query: message,
      reason: 'service item selection request',
    }
  }
  if (serviceCategory === 'hotel' && !serviceTarget && containsAny(normalized, ['订', '住', '酒店', '住宿', '双床', '大床'])) {
    return {
      kind: 'candidate-search',
      mode: 'add-after',
      afterSegmentId: insertionAnchor?.id ?? null,
      query: message,
      reason: 'hotel add-after request',
    }
  }
  if (serviceCategory === 'movie' && !serviceTarget && containsAny(normalized, ['看电影', '电影', '影院', 'imax'])) {
    return {
      kind: 'candidate-search',
      mode: 'add-after',
      afterSegmentId: insertionAnchor?.id ?? null,
      query: message,
      reason: 'movie add-after request',
    }
  }
  if (containsAny(normalized, addCandidateKeywords)) {
    return {
      kind: 'candidate-search',
      mode: 'add-after',
      afterSegmentId: insertionAnchor?.id ?? null,
      query: message,
      reason: 'add-after request',
    }
  }
  if (isAmbiguousChangeRequest(normalized)) {
    return {
      kind: 'clarification',
      title: '需要补充目标',
      description: 'PlanPal 还不确定你想替换节点、加一个新地点，还是只调整当前节点。',
      requiredFields: ['要改哪个节点', '想替换、加点还是改描述', '新的偏好或约束'],
      reason: 'low-confidence change request',
    }
  }
  if (target.phase === 'dining' && isDiningPreferenceRequest(normalized)) {
    return {
      kind: 'candidate-search',
      mode: 'replace',
      segmentId: target.id,
      query: message,
      reason: 'dining preference replacement request',
    }
  }
  if (containsAny(normalized, ['换', '替换', 'replace', 'near', '近一点', '近点', '火锅', '涮锅', '涮肉', '锅底', 'hotpot'])) {
    return {
      kind: 'candidate-search',
      mode: 'replace',
      segmentId: target.id,
      query: message,
      reason: 'replacement-like request',
    }
  }
  if (containsAny(normalized, ['删除', '删掉', '去掉', '不要', 'remove', 'delete'])) {
    return {
      kind: 'command',
      reason: 'delete request',
      command: {
        type: 'DELETE_SEGMENT',
        source: 'agent',
        segmentId: target.id,
      },
    }
  }
  if (containsAny(normalized, ['下单', '预订'])) {
    return {
      kind: 'command',
      reason: 'sandbox order request',
      command: {
        type: 'CREATE_SANDBOX_ORDER',
        source: 'agent',
      },
    }
  }
  if (containsAny(normalized, ['确认', 'confirm'])) {
    return {
      kind: 'command',
      reason: 'confirm request',
      command: {
        type: 'CONFIRM_PLAN',
        source: 'agent',
      },
    }
  }
  if (containsAny(normalized, ['轻松', '别太赶', '安静', '改成', 'rewrite', '调整'])) {
    return {
      kind: 'command',
      reason: 'rewrite request',
      command: {
        type: 'REWRITE_SEGMENT',
        source: 'agent',
        segmentId: target.id,
        changes: {
          reason: message,
          notes: `Agent understood: ${message}`,
        },
      },
    }
  }
  return {
    kind: 'qa',
    answerSeed: '我可以解释当前安排，也可以把你的自然语言转换成拼图命令。',
    reason: 'read-only turn',
  }
}

export function parseModelTurnIntent(raw: string): ModelTurnIntent | null {
  const json = extractJsonObject(raw)
  if (!json) return null
  try {
    const parsed = JSON.parse(json) as Partial<ModelTurnIntent>
    if (!parsed.action || !['qa', 'replace', 'add', 'rewrite', 'delete', 'confirm', 'service', 'clarify'].includes(parsed.action)) return null
    const targetPhase = isSegmentPhase(parsed.targetPhase) ? parsed.targetPhase : undefined
    const category = isMerchantServiceCategory(parsed.category) ? parsed.category : undefined
    return {
      action: parsed.action,
      answer: typeof parsed.answer === 'string' ? parsed.answer : undefined,
      category,
      query: typeof parsed.query === 'string' ? parsed.query : undefined,
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      targetPhase,
      targetSegmentId: typeof parsed.targetSegmentId === 'string' ? parsed.targetSegmentId : undefined,
    }
  } catch {
    return null
  }
}

export function routeModelTurnIntent(
  plan: Plan,
  message: string,
  intent: ModelTurnIntent,
  selectedSegmentId?: string,
): RoutedTurn {
  const target = findTargetSegment(plan, message.trim().toLowerCase(), selectedSegmentId, intent)
  if (intent.action === 'service') {
    const category = intent.category ?? inferServiceCategory(message.trim().toLowerCase()) ?? target.serviceCategory
    const serviceTarget = category ? findServiceSegment(plan, category, selectedSegmentId) : target
    return {
      kind: 'service-item-search',
      segmentId: serviceTarget?.id ?? target.id,
      merchantId: serviceTarget?.poiId ?? target.poiId,
      category,
      query: intent.query?.trim() || message,
      reason: intent.reason || 'model interpreted service item request',
    }
  }
  if (intent.action === 'clarify') {
    return {
      kind: 'clarification',
      title: '需要补充信息',
      description: intent.reason || 'PlanPal 还不确定应该替换、加点还是只调整当前节点。',
      requiredFields: ['目标节点', '操作类型', '偏好或约束'],
      reason: intent.reason || 'model requested clarification',
    }
  }
  if (intent.action === 'replace') {
    return {
      kind: 'candidate-search',
      mode: 'replace',
      segmentId: target.id,
      query: intent.query?.trim() || message,
      reason: intent.reason || 'model interpreted replacement request',
    }
  }
  if (intent.action === 'add') {
    const anchor = findInsertionAnchor(plan, message.trim().toLowerCase(), selectedSegmentId, intent)
    return {
      kind: 'candidate-search',
      mode: 'add-after',
      afterSegmentId: anchor?.id ?? null,
      query: intent.query?.trim() || message,
      reason: intent.reason || 'model interpreted add-after request',
    }
  }
  if (intent.action === 'delete') {
    return {
      kind: 'command',
      reason: intent.reason || 'model interpreted delete request',
      command: {
        type: 'DELETE_SEGMENT',
        source: 'agent',
        segmentId: target.id,
      },
    }
  }
  if (intent.action === 'confirm') {
    return {
      kind: 'command',
      reason: intent.reason || 'model interpreted confirm request',
      command: {
        type: containsAny(message, ['下单', '预订']) ? 'CREATE_SANDBOX_ORDER' : 'CONFIRM_PLAN',
        source: 'agent',
      },
    }
  }
  if (intent.action === 'rewrite') {
    const rewriteText = intent.query?.trim() || intent.reason?.trim() || message
    return {
      kind: 'command',
      reason: intent.reason || 'model interpreted rewrite request',
      command: {
        type: 'REWRITE_SEGMENT',
        source: 'agent',
        segmentId: target.id,
        changes: {
          reason: rewriteText,
          notes: `Agent understood: ${rewriteText}`,
        },
      },
    }
  }
  return {
    kind: 'qa',
    answerSeed: intent.answer?.trim() || '我可以解释当前安排，也可以把你的自然语言转换成拼图命令。',
    reason: intent.reason || 'model interpreted read-only turn',
  }
}

function findTargetSegment(
  plan: Plan,
  normalized: string,
  selectedSegmentId?: string,
  intent?: Pick<ModelTurnIntent, 'targetPhase' | 'targetSegmentId'>,
): PlanSegment {
  const byId = intent?.targetSegmentId ? plan.segments.find((segment) => segment.id === intent.targetSegmentId) : null
  if (byId) return byId
  const byPhase = intent?.targetPhase ? plan.segments.find((segment) => segment.phase === intent.targetPhase) : null
  if (byPhase) return byPhase
  const selected = selectedSegmentId ? plan.segments.find((segment) => segment.id === selectedSegmentId) : null
  if (selected) return selected
  if (containsAny(normalized, ['饭', '吃', 'dinner', '餐厅', '晚餐', '火锅', '涮锅', '涮肉', '锅底', 'hotpot', '辣', '麻辣', '川菜', '湘菜', '川湘', '串串', '不吃辣', '少辣', '清淡'])) {
    return plan.segments.find((segment) => segment.phase === 'dining') ?? plan.segments[0]!
  }
  if (containsAny(normalized, ['喝', '酒', 'bar', '清吧'])) {
    return plan.segments.find((segment) => segment.phase === 'drinks') ?? plan.segments[0]!
  }
  const serviceCategory = inferServiceCategory(normalized)
  if (serviceCategory) {
    return findServiceSegment(plan, serviceCategory, selectedSegmentId) ?? plan.segments.find((segment) => segment.serviceCategory === serviceCategory) ?? plan.segments[0]!
  }
  return plan.segments.find((segment) => !segment.isTransit) ?? plan.segments[0]!
}

function findInsertionAnchor(
  plan: Plan,
  normalized: string,
  selectedSegmentId?: string,
  intent?: Pick<ModelTurnIntent, 'targetPhase' | 'targetSegmentId'>,
): PlanSegment | undefined {
  const selected = selectedSegmentId ? plan.segments.find((segment) => segment.id === selectedSegmentId) : undefined
  if (selected && !selected.isTransit) return selected

  const byId = intent?.targetSegmentId ? plan.segments.find((segment) => segment.id === intent.targetSegmentId) : undefined
  if (byId && !byId.isTransit) return byId

  const byPhase = intent?.targetPhase ? plan.segments.find((segment) => segment.phase === intent.targetPhase && !segment.isTransit) : undefined
  if (byPhase) return byPhase

  const executable = plan.segments.filter((segment) => !segment.isTransit)
  if (containsAny(normalized, ['饭后', '晚饭后', '餐后', '吃完', '甜品'])) {
    return executable.find((segment) => segment.phase === 'dining') ?? executable.at(-1)
  }
  if (containsAny(normalized, ['最后', '收尾', '结束前'])) {
    return executable.length > 1 ? executable[executable.length - 2] : executable[0]
  }

  let best = executable[0]
  let bestGap = -1
  for (let index = 0; index < executable.length - 1; index += 1) {
    const current = executable[index]
    const next = executable[index + 1]
    if (!current || !next) continue
    const gap = toMinutes(next.startTime) - toMinutes(current.endTime)
    if (gap > bestGap) {
      best = current
      bestGap = gap
    }
  }
  return best ?? executable.at(-1)
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

function isDiningPreferenceRequest(value: string) {
  return containsAny(value, diningPreferenceKeywords)
    || (containsAny(value, ['想吃', '吃点', '来点']) && containsAny(value, ['辣', '清淡', '不辣', '川', '湘', '串串', '餐厅', '饭']))
}

function isAmbiguousChangeRequest(value: string) {
  if (!containsAny(value, ['调整一下', '改一下', '换一下', '优化一下', '重新安排一下', '随便改改'])) return false
  return !containsAny(value, [
    ...diningPreferenceKeywords,
    ...addCandidateKeywords,
    '删除',
    '删掉',
    '去掉',
    '确认',
    '下单',
    '预订',
    '轻松',
    '别太赶',
    '安静',
    '近一点',
    '近点',
  ])
}

const diningPreferenceKeywords = [
  '想吃辣',
  '吃辣',
  '辣的',
  '辣味',
  '麻辣',
  '香辣',
  '重口',
  '川菜',
  '湘菜',
  '川湘',
  '串串',
  '签签',
  '钵钵',
  '不吃辣',
  '不能吃辣',
  '不要辣',
  '不辣',
  '无辣',
  '少辣',
  '微辣',
  '清淡',
  '亲子友好',
  '带孩子',
  '孩子',
  '家庭',
  '商务',
  '客户',
  '能聊天',
  '好聊天',
]

const addCandidateKeywords = [
  '加一个',
  '加个',
  '加一段',
  '加点别的',
  '再加',
  '添加',
  '加入',
  '安排一个',
  '安排个',
  '塞一个',
  '塞个',
  '空档',
  '空隙',
  '顺路',
  '咖啡',
  '甜品',
  '拍照',
  '散步',
  '酒店',
  '住宿',
  '住一晚',
  '电影',
  '影院',
  'imax',
]

function findServiceSegment(plan: Plan, category: MerchantServiceCategory, selectedSegmentId?: string) {
  const selected = selectedSegmentId ? plan.segments.find((segment) => segment.id === selectedSegmentId && !segment.isTransit) : undefined
  if (selected?.serviceCategory === category) return selected
  return plan.segments.find((segment) => !segment.isTransit && segment.serviceCategory === category)
}

function inferServiceCategory(value: string): MerchantServiceCategory | undefined {
  if (containsAny(value, ['酒店', '住宿', '住一晚', '住一夜', '双床', '大床', 'hotel'])) return 'hotel'
  if (containsAny(value, ['电影', '影院', 'imax', 'movie', 'cinema'])) return 'movie'
  if (containsAny(value, ['spa', '按摩', '瑜伽', '放松'])) return 'wellness'
  if (containsAny(value, ['票', '门票', 'ticket'])) return 'ticket'
  if (containsAny(value, ['花', '礼物', '写真', '礼盒'])) return 'retail'
  return undefined
}

function isServiceItemRequest(value: string) {
  return containsAny(value, [
    '选这个',
    '选择这个',
    '选一下',
    '买',
    '来两张',
    '两张',
    '2张',
    '房型',
    '双床房',
    '大床房',
    '套餐',
    '加套餐',
    '票',
  ])
}

function toMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10)
}

function extractJsonObject(raw: string) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw)
  const value = fenced?.[1] ?? raw
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')
  if (start < 0 || end <= start) return ''
  return value.slice(start, end + 1)
}

function isSegmentPhase(value: unknown): value is SegmentPhase {
  return value === 'activity'
    || value === 'dining'
    || value === 'drinks'
    || value === 'leisure'
    || value === 'transit'
}

function isMerchantServiceCategory(value: unknown): value is MerchantServiceCategory {
  return value === 'dining'
    || value === 'drinks'
    || value === 'activity'
    || value === 'hotel'
    || value === 'movie'
    || value === 'retail'
    || value === 'wellness'
    || value === 'ticket'
    || value === 'other'
}
