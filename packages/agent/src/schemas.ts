import type {
  CandidateOption,
  MerchantOffering,
  PendingAction,
  Plan,
  PlanCommand,
  ToolCallRecord,
} from '@planpal/domain'
import { z } from 'zod'

const segmentPatchSchema = z.object({
  title: z.string().optional(),
  place: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
  budget: z.string().optional(),
})

const candidateSchema = z.custom<CandidateOption>((value) => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CandidateOption>
  return typeof candidate.id === 'string'
    && typeof candidate.label === 'string'
    && typeof candidate.score === 'number'
    && Boolean(candidate.segment)
})

const offeringSchema = z.custom<MerchantOffering>((value) => {
  if (!value || typeof value !== 'object') return false
  const offering = value as Partial<MerchantOffering>
  return typeof offering.id === 'string'
    && typeof offering.merchantId === 'string'
    && typeof offering.title === 'string'
})

const commandSourceSchema = z.literal('agent')

export const ProposedPlanCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('CLEAR_PLAN_SEGMENTS'),
    source: commandSourceSchema,
    segmentIds: z.array(z.string()).optional(),
    includeLocked: z.boolean().optional(),
    reason: z.string().optional(),
  }),
  z.object({ type: z.literal('DELETE_SEGMENT'), source: commandSourceSchema, segmentId: z.string() }),
  z.object({
    type: z.literal('REWRITE_SEGMENT'),
    source: commandSourceSchema,
    segmentId: z.string(),
    changes: segmentPatchSchema,
  }),
  z.object({
    type: z.literal('REORDER_SEGMENT'),
    source: commandSourceSchema,
    segmentId: z.string(),
    anchorSegmentId: z.string().nullable().optional(),
    position: z.enum(['BEFORE', 'AFTER', 'START', 'END']),
  }),
  z.object({ type: z.literal('CONFIRM_PLAN'), source: commandSourceSchema }),
  z.object({ type: z.literal('CREATE_SANDBOX_ORDER'), source: commandSourceSchema }),
  z.object({
    type: z.literal('REFRESH_CANDIDATES'),
    source: commandSourceSchema,
    actionId: z.string(),
    mode: z.enum(['replace', 'add-after']),
    targetSegmentId: z.string().optional(),
    afterSegmentId: z.string().nullable().optional(),
    searchQuery: z.string().optional(),
    excludeCandidateIds: z.array(z.string()).optional(),
    candidates: z.array(candidateSchema).min(1),
  }),
  z.object({
    type: z.literal('REFRESH_SERVICE_ITEMS'),
    source: commandSourceSchema,
    actionId: z.string(),
    segmentId: z.string(),
    merchantId: z.string().optional(),
    category: z.enum(['dining', 'drinks', 'activity', 'hotel', 'movie', 'retail', 'wellness', 'ticket', 'other']).optional(),
    query: z.string().optional(),
    limit: z.number().int().positive().optional(),
    offerings: z.array(offeringSchema).min(1),
  }),
  z.object({
    type: z.literal('REQUEST_CLARIFICATION'),
    source: commandSourceSchema,
    actionId: z.string(),
    title: z.string().min(1),
    description: z.string().min(1),
    requiredFields: z.array(z.string()).min(1),
  }),
])

export const AgentIntentSchema = z.object({
  action: z.enum(['qa', 'replace', 'add', 'rewrite', 'delete', 'confirm', 'service', 'clarify', 'select', 'cancel']),
  answer: z.string().optional(),
  category: z.enum(['dining', 'drinks', 'activity', 'hotel', 'movie', 'retail', 'wellness', 'ticket', 'other']).optional(),
  query: z.string().optional(),
  reason: z.string().min(1),
  targetPhase: z.enum(['activity', 'dining', 'drinks', 'leisure', 'transit']).optional(),
  targetSegmentId: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.8),
})

export const AgentRouteSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('qa'), answerSeed: z.string(), reason: z.string() }),
  z.object({
    kind: z.literal('candidate-search'),
    mode: z.enum(['replace', 'add-after']),
    segmentId: z.string().optional(),
    afterSegmentId: z.string().nullable().optional(),
    query: z.string(),
    reason: z.string(),
  }),
  z.object({
    kind: z.literal('service-search'),
    segmentId: z.string(),
    merchantId: z.string().optional(),
    category: z.enum(['dining', 'drinks', 'activity', 'hotel', 'movie', 'retail', 'wellness', 'ticket', 'other']).optional(),
    query: z.string(),
    reason: z.string(),
  }),
  z.object({ kind: z.literal('mutation'), command: ProposedPlanCommandSchema, reason: z.string() }),
  z.object({
    kind: z.literal('clarification'),
    title: z.string(),
    description: z.string(),
    requiredFields: z.array(z.string()),
    reason: z.string(),
  }),
  z.object({ kind: z.literal('confirmation'), actionId: z.string().optional(), reason: z.string() }),
])

export const ToolCallRequestSchema = z.object({
  id: z.string(),
  name: z.enum(['poi_search', 'offering_search', 'route_estimate', 'weather_check', 'order_preview', 'get_current_plan']),
  args: z.record(z.string(), z.unknown()),
  type: z.literal('tool_call').default('tool_call'),
})

export const ToolResultSchema = z.object({
  toolCallId: z.string(),
  name: ToolCallRequestSchema.shape.name,
  status: z.enum(['success', 'error']),
  output: z.unknown().optional(),
  error: z.string().optional(),
  attempts: z.number().int().positive(),
  durationMs: z.number().nonnegative(),
  record: z.custom<ToolCallRecord>().optional(),
})

export const PlanCommandProposalSchema = z.object({
  actionId: z.string(),
  kind: z.enum(['command-approval', 'candidate-selection', 'service-selection', 'clarification', 'plan-variant']),
  commands: z.array(ProposedPlanCommandSchema).min(1),
  rationale: z.string().min(1),
  groundedToolCallIds: z.array(z.string()),
})

const interruptBase = {
  actionId: z.string(),
  runId: z.string(),
  planId: z.string(),
  baseVersion: z.number().int().nonnegative(),
  action: z.custom<PendingAction>(),
}

export const PlanPalInterruptSchema = z.discriminatedUnion('kind', [
  z.object({ ...interruptBase, kind: z.literal('command-approval') }),
  z.object({ ...interruptBase, kind: z.literal('candidate-selection') }),
  z.object({ ...interruptBase, kind: z.literal('service-selection') }),
  z.object({ ...interruptBase, kind: z.literal('clarification') }),
  z.object({ ...interruptBase, kind: z.literal('plan-variant') }),
])

export const PlanPalResumeSchema = z.object({
  actionId: z.string(),
  decision: z.enum(['approved', 'rejected', 'selected', 'answered', 'retry']),
  candidateId: z.string().optional(),
  offeringId: z.string().optional(),
  variantId: z.string().optional(),
  quantity: z.number().positive().optional(),
  answer: z.string().optional(),
})

export const FinalAgentResponseSchema = z.object({
  runId: z.string(),
  planId: z.string(),
  status: z.enum(['completed', 'cancelled', 'failed']),
  text: z.string(),
  route: z.enum(['qa', 'candidate-search', 'service-search', 'mutation', 'clarification', 'confirmation']),
  planVersion: z.number().int().nonnegative().optional(),
  fallbackUsed: z.boolean(),
  usedModel: z.boolean().default(false),
})

export type AgentIntent = z.infer<typeof AgentIntentSchema>
export type AgentRoute = z.infer<typeof AgentRouteSchema>
export type FinalAgentResponse = z.infer<typeof FinalAgentResponseSchema>
export type PlanCommandProposal = z.infer<typeof PlanCommandProposalSchema>
export type PlanPalInterrupt = z.infer<typeof PlanPalInterruptSchema>
export type PlanPalResume = z.infer<typeof PlanPalResumeSchema>
export type ToolCallRequest = z.infer<typeof ToolCallRequestSchema>
export type ToolResult = z.infer<typeof ToolResultSchema>

export function parseProposedCommand(value: unknown): PlanCommand {
  return ProposedPlanCommandSchema.parse(value) as PlanCommand
}

export const planSchema = z.custom<Plan>((value) => Boolean(value && typeof value === 'object' && 'id' in value))
