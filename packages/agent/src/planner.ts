import {
  attachPlanVariants,
  createId,
  createPlanFromPrompt,
  deriveCandidateSearchIntent,
  nowIso,
  searchFictionalPois,
  segmentFromPoi,
  type AgentEvent,
  type FictionalPoi,
  type FictionalPoiSearchResult,
  type MerchantServiceCategory,
  type Plan,
  type PlanSegment,
  type PlanVariantOption,
  type SegmentPhase,
} from '@planpal/domain'
import { z } from 'zod'
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

type PlanPoiCandidate = {
  poi: FictionalPoi
  retrievalReasons: string[]
  retrievalScore: number
}

type PlanVariantDraft = z.infer<typeof PlanVariantDraftSchema>

type ParsedPlanVariants = {
  errors: string[]
  variants: PlanVariantOption[]
}

const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/
const PLAN_VARIANT_COUNT = 3
const MAX_SEGMENTS_PER_VARIANT = 7
const PHASE_CANDIDATE_LIMIT = 6
const SERVICE_CANDIDATE_LIMIT = 4
const MAX_PLAN_CANDIDATES = 32
const planCandidatePhases = ['activity', 'dining', 'drinks', 'leisure'] as const satisfies readonly SegmentPhase[]

const PlanVariantSegmentDraftSchema = z.object({
  poiId: z.string().trim().min(1).max(160),
  startTime: z.string().regex(CLOCK_TIME_PATTERN),
  endTime: z.string().regex(CLOCK_TIME_PATTERN),
  reason: z.string().trim().min(1).max(1000),
  notes: z.string().trim().max(1000).optional(),
})

const PlanVariantDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(1000),
  tags: z.array(z.string().trim().min(1).max(100)).max(8),
  reasons: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
  segments: z.array(PlanVariantSegmentDraftSchema).min(1).max(MAX_SEGMENTS_PER_VARIANT),
})

const PlanVariantResponseSchema = z.object({
  variants: z.array(PlanVariantDraftSchema).length(PLAN_VARIANT_COUNT),
})

export async function createPlanWithVariants(
  prompt: string,
  modelConfig: ClientModelConfig,
  onProgress?: PlanCreationProgressSink,
): Promise<PlanCreationResult> {
  const basePlan = createPlanFromPrompt(prompt)
  const requiredActivities = requiredActivitiesForPrompt(prompt)
  const minimumSegments = Math.max(1, requiredActivities.length)
  const candidates = buildPlanPoiCandidatePool(prompt, basePlan, requiredActivities)
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

  await emit('agent.started', 'Plan creation started', {
    node: 'createPlan',
    candidatePoolSize: candidates.length,
    catalogGrounded: true,
  })
  const model = sanitizeModelConfig(modelConfig)
  const attemptedEndpoints = getOpenAICompatibleAttemptedEndpoints(modelConfig)
  try {
    if (candidates.length === 0) throw new Error('POI Catalog 没有可用于创建计划的候选')
    await emit('agent.model.started', 'Calling model for catalog-grounded plan variants', {
      model,
      phase: 'create-plan',
      usedModel: true,
      fallbackUsed: false,
      attemptedEndpoints,
      candidatePoolSize: candidates.length,
    })
    const text = await generateAssistantReply(modelConfig, buildPlanVariantMessages(
      prompt,
      basePlan,
      candidates,
      minimumSegments,
      requiredActivities.map((activity) => activity.label),
    ))
    let parsed = parsePlanVariantResponse(text, candidates, minimumSegments, requiredActivities)
    if (parsed.errors.length > 0) {
      await emit('agent.model.started', 'Calling model to repair catalog-grounded plan variants', {
        model,
        phase: 'repair-plan',
        usedModel: true,
        fallbackUsed: false,
        attemptedEndpoints,
        candidatePoolSize: candidates.length,
        minimumSegments,
        validationErrors: parsed.errors,
      })
      const repairedText = await generateAssistantReply(modelConfig, buildPlanRepairMessages(
        prompt,
        text,
        candidates,
        minimumSegments,
        requiredActivities.map((activity) => activity.label),
        parsed.errors,
      ))
      parsed = parsePlanVariantResponse(repairedText, candidates, minimumSegments, requiredActivities)
      await emit('agent.model.finished', 'Model plan variants repair finished', {
        model,
        phase: 'repair-plan',
        usedModel: true,
        fallbackUsed: false,
        attemptedEndpoints,
        candidatePoolSize: candidates.length,
        minimumSegments,
        validationErrors: parsed.errors,
        variantCount: parsed.variants.length,
      })
    }
    if (parsed.errors.length > 0) {
      throw new Error(`模型方案修复后仍不合法：${parsed.errors.join('；')}`)
    }

    const plan = attachPlanVariants(basePlan, parsed.variants)
    const groundedSegmentCount = parsed.variants.reduce((total, variant) => total + variant.segments.length, 0)
    await emit('agent.model.finished', 'Catalog-grounded plan variants generated', {
      model,
      phase: 'create-plan',
      usedModel: true,
      fallbackUsed: false,
      attemptedEndpoints,
      candidatePoolSize: candidates.length,
      catalogGrounded: true,
      groundedSegmentCount,
      variantCount: parsed.variants.length,
    })
    await emit('agent.finished', '已生成 POI Catalog 强绑定的可选方案', {
      usedModel: true,
      fallbackUsed: false,
      candidatePoolSize: candidates.length,
      catalogGrounded: true,
      groundedSegmentCount,
      variantCount: parsed.variants.length,
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
      candidatePoolSize: candidates.length,
      catalogGrounded: true,
    })
    throw new Error(`模型方案生成失败：${message}`)
  }
}

function buildPlanVariantMessages(
  prompt: string,
  basePlan: Plan,
  candidates: PlanPoiCandidate[],
  minimumSegments: number,
  requiredActivities: string[],
): CoreMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are PlanPal plan variant generator.',
        'Return only JSON. No markdown.',
        'Schema: {"variants":[{"title":"string","summary":"string","tags":["string"],"reasons":["string"],"segments":[{"poiId":"one exact ID from poiCandidates","startTime":"HH:mm","endTime":"HH:mm","reason":"string","notes":"optional execution constraints/checklist"}]}]}.',
        `Return exactly ${PLAN_VARIANT_COUNT} variants with ${minimumSegments}-${MAX_SEGMENTS_PER_VARIANT} executable segments each.`,
        'Every segment must select one exact poiId from poiCandidates. Never invent an ID, place, merchant, coordinates, budget, phase, service category, or catalog data.',
        'Do not repeat the same poiId within one variant. The same poiId may appear in different variants.',
        'Keep segments in chronological order and do not overlap their time ranges.',
        'Infer the task structure from userPrompt. Every required activity must be covered in every variant.',
        'Constraints such as route stability, pace, budget, participant count, weather, and preferences belong in selection, reason, or notes rather than separate filler segments.',
        'Use candidate area, tags, hours, time windows, queue risk, reservation mode, capacity, retrieval score, and retrieval reasons when choosing.',
        'Do not include secrets or API keys.',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify({
        userPrompt: prompt,
        planningContext: {
          intent: basePlan.intent,
          retrievalConstraints: deriveCandidateSearchIntent(prompt).constraints,
          minimumSegments,
          requiredActivities,
        },
        poiCandidates: candidates.map(serializePlanPoiCandidate),
      }),
    },
  ]
}

function buildPlanRepairMessages(
  prompt: string,
  previousResponse: string,
  candidates: PlanPoiCandidate[],
  minimumSegments: number,
  requiredActivities: string[],
  validationErrors: string[],
): CoreMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are PlanPal catalog-grounded plan variant repairer.',
        'Return only JSON. No markdown.',
        'Return the exact same schema requested for initial plan variants.',
        `Return exactly ${PLAN_VARIANT_COUNT} variants with ${minimumSegments}-${MAX_SEGMENTS_PER_VARIANT} executable segments each.`,
        'Every segment must use one exact poiId from poiCandidates. Never invent an ID or catalog data.',
        'Do not repeat a poiId within one variant. Keep segments chronological and non-overlapping.',
        'Repair every validation error while preserving the user intent and covering every required activity.',
        'Do not include secrets or API keys.',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify({
        userPrompt: prompt,
        retrievalConstraints: deriveCandidateSearchIntent(prompt).constraints,
        minimumSegments,
        requiredActivities,
        validationErrors: validationErrors.map(redactModelText),
        previousResponse: redactModelText(previousResponse),
        poiCandidates: candidates.map(serializePlanPoiCandidate),
      }),
    },
  ]
}

function buildPlanPoiCandidatePool(
  prompt: string,
  basePlan: Plan,
  requiredActivities: ExplicitActivityRequirement[],
): PlanPoiCandidate[] {
  const selected = new Map<string, PlanPoiCandidate>()
  const addPoi = (poi: FictionalPoi | undefined, score: number, reasons: string[]) => {
    if (!poi || selected.has(poi.id)) return
    selected.set(poi.id, {
      poi,
      retrievalScore: Number(score.toFixed(2)),
      retrievalReasons: uniqueStrings(reasons).slice(0, 6),
    })
  }
  const addResults = (results: FictionalPoiSearchResult[]) => {
    for (const result of results) addPoi(result.poi, result.score, result.reasons)
  }

  const inferredIntent = deriveCandidateSearchIntent(prompt)
  const hardSearchConstraints = {
    ...inferredIntent.constraints,
    headcount: inferredIntent.constraints.headcount ?? basePlan.intent.headcount,
  }
  const requiredCategories = uniqueStrings([
    ...(inferredIntent.serviceCategory ? [inferredIntent.serviceCategory] : []),
    ...requiredActivities.flatMap((activity) => activity.categories ?? []),
  ]) as MerchantServiceCategory[]
  for (const serviceCategory of requiredCategories) {
    const preferred = searchFictionalPois({
      query: prompt,
      serviceCategory,
      limit: SERVICE_CANDIDATE_LIMIT,
      ...hardSearchConstraints,
    })
    addResults(preferred)
    if (preferred.length < SERVICE_CANDIDATE_LIMIT) {
      addResults(searchFictionalPois({ serviceCategory, limit: SERVICE_CANDIDATE_LIMIT, ...hardSearchConstraints }))
    }
  }

  for (const phase of planCandidatePhases) {
    const preferred = searchFictionalPois({ query: prompt, phase, limit: PHASE_CANDIDATE_LIMIT, ...hardSearchConstraints })
    addResults(preferred)
    if (preferred.length < PHASE_CANDIDATE_LIMIT) {
      addResults(searchFictionalPois({ phase, limit: PHASE_CANDIDATE_LIMIT, ...hardSearchConstraints }))
    }
  }

  return [...selected.values()].slice(0, MAX_PLAN_CANDIDATES)
}

function serializePlanPoiCandidate(candidate: PlanPoiCandidate) {
  const { poi } = candidate
  return {
    poiId: poi.id,
    name: poi.name,
    activityTitle: poi.activityTitle,
    phase: poi.phase,
    serviceCategory: poi.serviceCategory,
    area: poi.area,
    description: poi.description,
    budget: poi.budget,
    tags: poi.tags,
    hours: poi.hours,
    openWindows: poi.openWindows,
    bestTimeWindows: poi.bestTimeWindows,
    availabilitySlots: poi.availabilitySlots,
    capacity: poi.capacity,
    capacityRange: poi.capacityRange,
    noiseLevel: poi.noiseLevel,
    indoorScore: poi.indoorScore,
    queueRisk: poi.queueRisk,
    reservationMode: poi.reservationMode,
    durationRangeMinutes: poi.durationRangeMinutes,
    lnglat: poi.lnglat,
    retrievalScore: candidate.retrievalScore,
    retrievalReasons: candidate.retrievalReasons,
  }
}

function parsePlanVariantResponse(
  raw: string,
  candidates: PlanPoiCandidate[],
  minimumSegments: number,
  requiredActivities: ExplicitActivityRequirement[],
): ParsedPlanVariants {
  const json = extractJsonObject(raw)
  if (!json) return invalidVariants('模型没有返回 JSON 对象')

  let input: unknown
  try {
    input = JSON.parse(json)
  } catch {
    return invalidVariants('模型返回的 JSON 无法解析')
  }

  const parsed = PlanVariantResponseSchema.safeParse(input)
  if (!parsed.success) {
    return invalidVariants(...parsed.error.issues.map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'response'
      return `${path}: ${issue.message}`
    }))
  }

  const candidateById = new Map(candidates.map((candidate) => [candidate.poi.id, candidate] as const))
  const errors: string[] = []
  const variants = parsed.data.variants.map((draft, variantIndex) => materializeVariant(
    draft,
    variantIndex,
    candidateById,
    minimumSegments,
    requiredActivities,
    errors,
  ))
  if (errors.length > 0) return invalidVariants(...errors)
  return { errors: [], variants }
}

function materializeVariant(
  draft: PlanVariantDraft,
  variantIndex: number,
  candidateById: Map<string, PlanPoiCandidate>,
  minimumSegments: number,
  requiredActivities: ExplicitActivityRequirement[],
  errors: string[],
): PlanVariantOption {
  const variantLabel = `方案 ${variantIndex + 1}`
  const seenPoiIds = new Set<string>()
  let previousEnd = -1
  const segments: PlanSegment[] = []

  if (draft.segments.length < minimumSegments) {
    errors.push(`${variantLabel} 至少需要 ${minimumSegments} 个节点`)
  }

  for (const [segmentIndex, segmentDraft] of draft.segments.entries()) {
    const segmentLabel = `${variantLabel} 节点 ${segmentIndex + 1}`
    const candidate = candidateById.get(segmentDraft.poiId)
    if (!candidate) {
      errors.push(`${segmentLabel} 使用了候选池外的 poiId：${redactModelText(segmentDraft.poiId)}`)
      continue
    }
    if (seenPoiIds.has(segmentDraft.poiId)) {
      errors.push(`${variantLabel} 重复使用 poiId：${redactModelText(segmentDraft.poiId)}`)
      continue
    }
    seenPoiIds.add(segmentDraft.poiId)

    const start = toMinutes(segmentDraft.startTime)
    const end = toMinutes(segmentDraft.endTime)
    if (end <= start) {
      errors.push(`${segmentLabel} 的结束时间必须晚于开始时间`)
      continue
    }
    if (start < previousEnd) {
      errors.push(`${segmentLabel} 与前一个节点时间重叠或顺序错误`)
      continue
    }
    previousEnd = end

    const modelNotes = redactModelText(segmentDraft.notes ?? '')
    const authoritative = segmentFromPoi(candidate.poi, {
      startTime: segmentDraft.startTime,
      endTime: segmentDraft.endTime,
      reason: redactModelText(segmentDraft.reason),
      status: '待确认',
    })
    segments.push({
      id: createId('seg'),
      ...authoritative,
      notes: mergeNotes(candidate.poi.notes, modelNotes),
      locked: false,
    })
  }

  if (segments.length === draft.segments.length) {
    const missing = missingRequiredActivities({ segments }, requiredActivities)
    if (missing.length > 0) errors.push(`${variantLabel} 缺少明确活动：${missing.join('、')}`)
  }

  return {
    id: createId('variant'),
    title: redactModelText(draft.title),
    summary: redactModelText(draft.summary),
    tags: uniqueStrings(draft.tags.map(redactModelText)).slice(0, 4),
    segments,
    score: Math.max(0, 0.94 - variantIndex * 0.04),
    reasons: uniqueStrings(draft.reasons.map(redactModelText)).slice(0, 4),
  }
}

function invalidVariants(...errors: string[]): ParsedPlanVariants {
  return {
    errors: uniqueStrings(errors.map(redactModelText)),
    variants: [],
  }
}

function requiredActivitiesForPrompt(prompt: string) {
  const matched = explicitActivityRequirements.filter((activity) => activity.promptPattern.test(prompt))
  return matched
}

function missingRequiredActivities(
  variant: Pick<PlanVariantOption, 'segments'>,
  requiredActivities: ExplicitActivityRequirement[],
) {
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
]

function extractJsonObject(raw: string) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw)
  const value = fenced?.[1] ?? raw
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')
  if (start < 0 || end <= start) return ''
  return value.slice(start, end + 1)
}

function mergeNotes(catalogNotes: string, modelNotes: string) {
  return uniqueStrings([catalogNotes, modelNotes]).join('；')
}

function uniqueStrings<T extends string>(values: readonly T[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))] as T[]
}

function toMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10)
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
