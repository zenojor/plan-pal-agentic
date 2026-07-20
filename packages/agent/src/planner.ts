import {
  attachPlanVariants,
  createId,
  createPlanFromPrompt,
  isGenericPlaceName,
  nowIso,
  pickFictionalPoi,
  type AgentEvent,
  type MerchantServiceCategory,
  type Plan,
  type PlanSegment,
  type PlanVariantOption,
  type SegmentPhase,
} from '@planpal/domain'
import {
  generateAssistantReply,
  getOpenAICompatibleAttemptedEndpoints,
  sanitizeModelConfig,
  type ClientModelConfig,
  type CoreMessage,
} from './model'

export type PlanCreationResult = {
  events: AgentEvent[]
  plan: Plan
}

export type PlanCreationProgressSink = (event: AgentEvent) => void | Promise<void>

export async function createPlanWithVariants(
  prompt: string,
  modelConfig: ClientModelConfig,
  onProgress?: PlanCreationProgressSink,
): Promise<PlanCreationResult> {
  const basePlan = createPlanFromPrompt(prompt)
  const runId = createId('run')
  const events: AgentEvent[] = []
  let sequence = 0
  const emit = async (type: AgentEvent['type'], message: string, payload?: unknown) => {
    sequence += 1
    const event: AgentEvent = {
      id: createId('evt'),
      runId,
      planId: basePlan.id,
      type,
      sequence,
      message,
      payload,
      createdAt: nowIso(),
    }
    events.push(event)
    await onProgress?.(event)
  }

  await emit('agent.started', 'Plan creation started', { node: 'createPlan' })
  const model = sanitizeModelConfig(modelConfig)
  const attemptedEndpoints = getOpenAICompatibleAttemptedEndpoints(modelConfig)
  try {
    await emit('agent.model.started', 'Calling model for plan variants', {
      model,
      phase: 'create-plan',
      usedModel: true,
      fallbackUsed: false,
      attemptedEndpoints,
    })
    const text = await generateAssistantReply(modelConfig, buildPlanVariantMessages(prompt, basePlan))
    const requiredActivities = requiredActivitiesForPrompt(prompt)
    const minimumSegments = requiredActivities.length >= 2 ? 2 : 0
    let variants = parsePlanVariantResponse(text, basePlan)
    if (variants.length >= 2 && variants.some((variant) => !variantSatisfiesStructure(variant, minimumSegments, requiredActivities))) {
      await emit('agent.model.started', 'Calling model to repair plan structure', {
        model,
        phase: 'repair-plan',
        usedModel: true,
        fallbackUsed: false,
        attemptedEndpoints,
        minimumSegments,
      })
      const repairedText = await generateAssistantReply(modelConfig, buildPlanRepairMessages(
        prompt,
        text,
        minimumSegments,
        requiredActivities.map((activity) => activity.label),
      ))
      const repairedVariants = parsePlanVariantResponse(repairedText, basePlan)
      if (repairedVariants.length >= 2 && repairedVariants.every((variant) => variantSatisfiesStructure(
        variant,
        minimumSegments,
        requiredActivities,
      ))) {
        variants = repairedVariants
      }
      await emit('agent.model.finished', 'Model plan structure repaired', {
        model,
        phase: 'repair-plan',
        usedModel: true,
        fallbackUsed: false,
        attemptedEndpoints,
        minimumSegments,
        variantCount: repairedVariants.length,
      })
    }
    if (variants.length < 2) throw new Error('模型返回的方案不足')
    if (minimumSegments > 0 && variants.some((variant) => variant.segments.length < minimumSegments)) {
      throw new Error(`模型返回的方案未覆盖多活动需求，至少需要 ${minimumSegments} 个节点`)
    }
    const missingActivities = [...new Set(variants.flatMap((variant) => missingRequiredActivities(variant, requiredActivities)))]
    if (missingActivities.length > 0) {
      throw new Error(`模型返回的方案缺少明确活动：${missingActivities.join('、')}`)
    }
    const plan = attachPlanVariants(basePlan, variants.slice(0, 3))
    await emit('agent.model.finished', 'Model plan variants generated', {
      model,
      phase: 'create-plan',
      usedModel: true,
      fallbackUsed: false,
      attemptedEndpoints,
      variantCount: plan.pendingAction?.kind === 'plan-variant-selection' ? plan.pendingAction.variants.length : 0,
    })
    await emit('agent.finished', '已生成可选方案', {
      usedModel: true,
      fallbackUsed: false,
      variantCount: plan.pendingAction?.kind === 'plan-variant-selection' ? plan.pendingAction.variants.length : 0,
    })
    return { events, plan }
  } catch (error) {
    const message = redactModelError(error)
    await emit('agent.model.error', `模型方案生成失败：${message}`, {
      model,
      phase: 'create-plan',
      usedModel: false,
      fallbackUsed: false,
      error: message,
      attemptedEndpoints,
    })
    throw new Error(`模型方案生成失败：${message}`)
  }
}

function buildPlanVariantMessages(prompt: string, basePlan: Plan): CoreMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are PlanPal plan variant generator.',
        'Return only JSON. No markdown.',
        'Schema: {"variants":[{"title":"string","summary":"string","tags":["string"],"reasons":["string"],"segments":[{"phase":"activity|dining|drinks|leisure","serviceCategory":"optional dining|drinks|activity|hotel|movie|retail|wellness|ticket|other","title":"string","place":"string","startTime":"HH:mm","endTime":"HH:mm","reason":"string","budget":"string","notes":"optional execution constraints/checklist","locked":false,"lnglat":[121.47,31.23]}]}]}.',
        'Return 3 variants. Infer the task structure from userPrompt; do not choose from predefined plan branches. Use 1-7 executable segments according to the explicit activities. Every distinct activity should be covered, but constraints such as route stability, pace, budget, participant count, weather, and preferences belong in notes, reason, or budget rather than separate segments. Do not add filler or a buffer solely to reach a count; add a buffer/checkpoint only when it has execution value. Every place must be fictional but specific, like a named shop/studio/restaurant; never use real merchant names and never use generic category names such as 展览, 餐厅, 咖啡店, 小馆, 附近可选地点. Do not include secrets or API keys.',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify({
        userPrompt: prompt,
        fallbackReference: {
          intent: basePlan.intent,
          note: 'Use only as a minimal fallback reference. The model should parse the actual userPrompt and may create more or fewer segments.',
          segments: basePlan.segments.map(({ id: _id, ...segment }) => segment),
        },
      }),
    },
  ]
}

function buildPlanRepairMessages(
  prompt: string,
  previousResponse: string,
  minimumSegments: number,
  requiredActivities: string[],
): CoreMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are PlanPal plan variant repairer.',
        'Return only JSON. No markdown.',
        'Repair the previous response so each variant has enough executable segments. Do not use predefined plan branches. Every place must be fictional but specific; never use real merchant names or generic category names.',
        `Each variant must include at least ${minimumSegments} and at most 7 segments because the prompt contains multiple explicit activities.`,
        'Keep the user intent and split collapsed activities into separate segments with clear times, reasons, budgets, and notes. Keep route, pace, budget, participant, weather, and preference constraints in segment fields; do not turn them into filler segments.',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify({
        userPrompt: prompt,
        validationError: `Each variant must have at least ${minimumSegments} executable segments.`,
        requiredActivities,
        previousResponse: redactModelText(previousResponse),
      }),
    },
  ]
}

function requiredActivitiesForPrompt(prompt: string) {
  const matched = explicitActivityRequirements.filter((activity) => activity.promptPattern.test(prompt))
  return matched.length >= 2 ? matched : []
}

function variantSatisfiesStructure(
  variant: PlanVariantOption,
  minimumSegments: number,
  requiredActivities: ExplicitActivityRequirement[],
) {
  return variant.segments.length >= minimumSegments
    && missingRequiredActivities(variant, requiredActivities).length === 0
}

function missingRequiredActivities(variant: PlanVariantOption, requiredActivities: ExplicitActivityRequirement[]) {
  return requiredActivities
    .filter((activity) => !variant.segments.some((segment) => {
      const text = [segment.title, segment.place, segment.reason, segment.notes].filter(Boolean).join(' ')
      return activity.segmentPattern.test(text)
        || activity.phases?.includes(segment.phase)
        || (segment.serviceCategory ? activity.categories?.includes(segment.serviceCategory) : false)
    }))
    .map((activity) => activity.label)
}

type ExplicitActivityRequirement = {
  label: string
  promptPattern: RegExp
  segmentPattern: RegExp
  phases?: PlanSegment['phase'][]
  categories?: NonNullable<PlanSegment['serviceCategory']>[]
}

const explicitActivityRequirements: ExplicitActivityRequirement[] = [
  { label: '产品演示', promptPattern: /产品演示|方案演示|演示产品|汇报|展示/, segmentPattern: /演示|展示|汇报/ },
  { label: '用餐', promptPattern: /早餐|早饭|午餐|午饭|晚餐|晚饭|吃饭|用餐/, segmentPattern: /餐|饭|用餐|宴/, phases: ['dining'], categories: ['dining'] },
  { label: '复盘', promptPattern: /复盘|总结|回顾/, segmentPattern: /复盘|总结|回顾|下一步/ },
  { label: '咖啡或茶歇', promptPattern: /咖啡|茶歇|下午茶/, segmentPattern: /咖啡|茶歇|下午茶/, phases: ['drinks'], categories: ['drinks'] },
  { label: '电影', promptPattern: /电影|观影|影院/, segmentPattern: /电影|观影|影院/, categories: ['movie'] },
  { label: '酒店住宿', promptPattern: /酒店|住宿|入住/, segmentPattern: /酒店|住宿|入住|客房/, categories: ['hotel'] },
  { label: '购物', promptPattern: /购物|逛街/, segmentPattern: /购物|逛街|商场/, categories: ['retail'] },
  { label: '散步或游览', promptPattern: /散步|游览|参观/, segmentPattern: /散步|游览|参观/ },
  { label: '会议或会谈', promptPattern: /会议|会谈|沟通会/, segmentPattern: /会议|会谈|沟通/ },
] as const

function parsePlanVariantResponse(raw: string, basePlan: Plan): PlanVariantOption[] {
  const json = extractJsonObject(raw)
  if (!json) return []
  try {
    const parsed = JSON.parse(json) as { variants?: unknown[] }
    if (!Array.isArray(parsed.variants)) return []
    return parsed.variants
      .map((variant, index) => coerceVariant(variant, basePlan, index))
      .filter((variant): variant is PlanVariantOption => Boolean(variant))
  } catch {
    return []
  }
}

function coerceVariant(value: unknown, basePlan: Plan, index: number): PlanVariantOption | null {
  if (!value || typeof value !== 'object') return null
  const input = value as {
    reasons?: unknown
    score?: unknown
    segments?: unknown
    summary?: unknown
    tags?: unknown
    title?: unknown
  }
  if (!Array.isArray(input.segments)) return null
  const segments = input.segments
    .map((segmentValue, segmentIndex) => coerceSegment(segmentValue, basePlan.segments[segmentIndex], basePlan, segmentIndex))
    .filter((segment): segment is PlanSegment => Boolean(segment))
  if (segments.length === 0) return null
  const title = readModelString(input.title)
  const summary = readModelString(input.summary)
  return {
    id: createId('variant'),
    title: title || `方案 ${index + 1}`,
    summary: summary || '模型生成的备选方案。',
    tags: Array.isArray(input.tags)
      ? input.tags.map(readModelString).filter(Boolean).slice(0, 4)
      : [],
    segments,
    score: typeof input.score === 'number' ? Math.max(0, Math.min(1, input.score)) : 0.86 - index * 0.05,
    reasons: Array.isArray(input.reasons)
      ? input.reasons.map(readModelString).filter(Boolean).slice(0, 4)
      : ['模型根据你的需求生成。'],
  }
}

function coerceSegment(value: unknown, fallback: PlanSegment | undefined, basePlan: Plan, segmentIndex: number): PlanSegment | null {
  if (!value || typeof value !== 'object') return fallback ? { ...fallback, id: createId('seg') } : null
  const input = value as Partial<Record<keyof PlanSegment, unknown>>
  const phase = isSegmentPhase(input.phase) ? input.phase : fallback?.phase ?? 'leisure'
  const fallbackPoi = pickFictionalPoi(phase, segmentIndex)
  const phaseFallback = fallback?.phase === phase ? fallback : undefined
  const serviceCategory = isMerchantServiceCategory(input.serviceCategory)
    ? input.serviceCategory
    : phaseFallback?.serviceCategory ?? fallbackPoi.serviceCategory
  const startTime = readClockTime(input.startTime)
    || readClockTime(phaseFallback?.startTime)
    || readClockTime(basePlan.intent.startTime)
    || '12:00'
  const endCandidate = readClockTime(input.endTime) || readClockTime(phaseFallback?.endTime)
  const endTime = endCandidate && toMinutes(endCandidate) > toMinutes(startTime)
    ? endCandidate
    : addMinutes(startTime, 60)
  const modelPlace = readModelString(input.place)
  const fallbackPlace = isGenericPlaceName(phaseFallback?.place) ? '' : phaseFallback?.place
  const useFallbackPoi = isGenericPlaceName(modelPlace) && !fallbackPlace
  const place = useFallbackPoi ? fallbackPoi.name : modelPlace || fallbackPlace || fallbackPoi.name
  const placeFallback = fallback?.place === place ? fallback : undefined
  const title = readModelString(input.title) || (useFallbackPoi ? fallbackPoi.activityTitle : phaseFallback?.title) || fallbackPoi.activityTitle
  const lnglat = readLngLat(input.lnglat) ?? placeFallback?.lnglat ?? (place === fallbackPoi.name ? fallbackPoi.lnglat : undefined) ?? mockLngLatForSegment(phase, segmentIndex)
  return {
    id: createId('seg'),
    phase,
    title,
    place,
    startTime,
    endTime,
    durationMinutes: Math.max(30, toMinutes(endTime) - toMinutes(startTime)),
    status: '待确认',
    reason: readModelString(input.reason) || phaseFallback?.reason || fallbackPoi.description,
    budget: readModelString(input.budget) || phaseFallback?.budget || fallbackPoi.budget,
    notes: readModelString(input.notes) || phaseFallback?.notes || fallbackPoi.notes,
    poiId: readModelString(input.poiId) || placeFallback?.poiId || (place === fallbackPoi.name ? fallbackPoi.id : ['model', phase, segmentIndex + 1].join('-')),
    serviceCategory,
    locked: typeof input.locked === 'boolean' ? input.locked : phaseFallback?.locked,
    lnglat,
  }
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

function readLngLat(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined
  const [lng, lat] = value
  if (typeof lng !== 'number' || typeof lat !== 'number') return undefined
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return undefined
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return undefined
  return [lng, lat]
}

function mockLngLatForSegment(phase: SegmentPhase, index: number): [number, number] {
  const baseByPhase: Record<SegmentPhase, [number, number]> = {
    activity: [121.4737, 31.2304],
    dining: [121.478, 31.232],
    drinks: [121.481, 31.233],
    leisure: [121.476, 31.2312],
    transit: [121.475, 31.231],
  }
  const [lng, lat] = baseByPhase[phase]
  const offset = Math.min(8, Math.max(0, index)) * 0.0012
  return [Number((lng + offset).toFixed(4)), Number((lat + offset * 0.55).toFixed(4))]
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readModelString(value: unknown) {
  return redactModelText(readString(value))
}

function readClockTime(value: unknown) {
  const text = readString(value)
  return isClockTime(text) ? text : ''
}

function isClockTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) || value === '24:00'
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

function redactModelError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || 'Model call failed')
  return redactModelText(raw)
}

function redactModelText(value: string) {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+(?!token\b)[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')
}


