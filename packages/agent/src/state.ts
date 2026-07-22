import { MessagesValue, ReducedValue, StateSchema } from '@langchain/langgraph'
import { z } from 'zod'
import type { PlanCommand, PlanPatch } from '@planpal/domain'
import {
  AgentIntentSchema,
  AgentRouteSchema,
  FinalAgentResponseSchema,
  PlanCommandProposalSchema,
  PlanPalInterruptSchema,
  PlanPalResumeSchema,
  ToolCallRequestSchema,
  ToolResultSchema,
  planSchema,
} from './schemas'

const metadataSchema = z.object({
  selectedSegmentId: z.string().optional(),
  userMessage: z.string().default(''),
  routeSource: z.enum(['model', 'deterministic', 'fallback']).default('deterministic'),
  fallbackReasons: z.array(z.string()).default(() => []),
  nodePath: z.array(z.string()).default(() => []),
  modelCalls: z.number().int().nonnegative().default(0),
  toolRetries: z.number().int().nonnegative().default(0),
  activeToolCallIds: z.array(z.string()).default(() => []),
  appliedCommands: z.array(z.custom<PlanCommand>()).default(() => []),
  appliedPatches: z.array(z.custom<PlanPatch>()).default(() => []),
  excludedCandidateIds: z.array(z.string()).default(() => []),
  continuation: z.enum(['planning', 'intent']).nullable().default(null),
  resumed: z.boolean().default(false),
})

const graphErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  recoverable: z.boolean(),
  node: z.string().optional(),
})

function appendById<T extends { id: string }>(current: T[], next: T[]) {
  const items = new Map(current.map((item) => [item.id, item]))
  for (const item of next) items.set(item.id, item)
  return [...items.values()]
}

function appendToolResults(
  current: z.infer<typeof ToolResultSchema>[],
  next: z.infer<typeof ToolResultSchema>[],
) {
  const items = new Map(current.map((item) => [item.toolCallId, item]))
  for (const item of next) items.set(item.toolCallId, item)
  return [...items.values()]
}

export const PlanPalGraphState = new StateSchema({
  messages: MessagesValue,
  planId: z.string().default(''),
  runId: z.string().default(''),
  baseVersion: z.number().int().nonnegative().default(0),
  plan: planSchema.nullable().default(null),
  intent: AgentIntentSchema.nullable().default(null),
  route: AgentRouteSchema.nullable().default(null),
  toolCalls: new ReducedValue(z.array(ToolCallRequestSchema).default(() => []), {
    reducer: appendById,
  }),
  toolResults: new ReducedValue(z.array(ToolResultSchema).default(() => []), {
    reducer: appendToolResults,
  }),
  proposedCommands: z.array(PlanCommandProposalSchema).default(() => []),
  pendingApproval: PlanPalInterruptSchema.nullable().default(null),
  resume: PlanPalResumeSchema.nullable().default(null),
  response: FinalAgentResponseSchema.nullable().default(null),
  resultPlan: planSchema.nullable().default(null),
  error: graphErrorSchema.nullable().default(null),
  metadata: metadataSchema.default(() => metadataSchema.parse({})),
})

export type PlanPalGraphStateValue = typeof PlanPalGraphState.State
export type PlanPalGraphStateUpdate = typeof PlanPalGraphState.Update

export function withNodePath(state: PlanPalGraphStateValue, node: string) {
  return {
    ...state.metadata,
    nodePath: [...state.metadata.nodePath, node],
  }
}
