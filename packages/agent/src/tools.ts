import { tool, type StructuredTool } from '@langchain/core/tools'
import { ToolMessage, type ToolCall } from '@langchain/core/messages'
import {
  buildMockRouteEstimates,
  createAddSegmentCandidates,
  createId,
  createReplacementCandidates,
  createSandboxOrderReceipt,
  deriveCandidateSearchIntent,
  searchMerchantOfferings,
  summarizeCandidateSearchIntent,
  type Plan,
  type ToolCallRecord,
  type ToolEffect,
} from '@planpal/domain'
import { z } from 'zod'
import type { ToolCallRequest, ToolResult } from './schemas'

export const planPalToolNames = [
  'poi_search',
  'offering_search',
  'route_estimate',
  'weather_check',
  'order_preview',
  'get_current_plan',
] as const

export type PlanPalToolName = (typeof planPalToolNames)[number]
export type PlanLookup = (planId: string) => Promise<Plan | null>
export type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>

export type ToolInvocation = {
  message: ToolMessage
  record: ToolCallRecord
  result: ToolResult
}

export type ToolSpec = {
  name: PlanPalToolName
  effect: ToolEffect
  description: string
  tool: StructuredTool
}

const poiSearchSchema = z.object({
  planId: z.string().describe('Current plan id'),
  mode: z.enum(['replace', 'add-after']),
  query: z.string(),
  segmentId: z.string().optional(),
  afterSegmentId: z.string().nullable().optional(),
  excludeCandidateIds: z.array(z.string()).optional(),
})

const offeringSearchSchema = z.object({
  planId: z.string(),
  segmentId: z.string(),
  merchantId: z.string().optional(),
  category: z.enum(['dining', 'drinks', 'activity', 'hotel', 'movie', 'retail', 'wellness', 'ticket', 'other']).optional(),
  query: z.string(),
  limit: z.number().int().min(1).max(10).default(6),
})

const planIdSchema = z.object({ planId: z.string() })

const weatherSchema = z.object({
  location: z.string(),
  date: z.string().optional(),
})

export class ToolRegistry {
  private planLookup: PlanLookup = async () => null
  private readonly specs = new Map<PlanPalToolName, ToolSpec>()

  constructor(private readonly overrides: Partial<Record<PlanPalToolName, ToolExecutor>> = {}) {
    this.registerDefaults()
  }

  bindPlanLookup(lookup: PlanLookup) {
    this.planLookup = lookup
    return this
  }

  list() {
    return [...this.specs.values()].map((spec) => spec.tool)
  }

  describe() {
    return [...this.specs.values()]
  }

  async invoke(runId: string, request: ToolCallRequest, maxAttempts = 2): Promise<ToolInvocation> {
    const startedAt = performance.now()
    const spec = this.specs.get(request.name)
    if (!spec) return this.failedInvocation(runId, request, 'Unknown tool', 1, startedAt)
    let lastError = 'Tool failed'
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const output = await spec.tool.invoke(toLangChainToolCall(request))
        const message = ToolMessage.isInstance(output)
          ? output
          : new ToolMessage({
              content: stringifyOutput(output),
              name: request.name,
              tool_call_id: request.id,
              status: 'success',
            })
        const parsed = parseToolContent(message.content)
        const durationMs = Math.round(performance.now() - startedAt)
        const record = createToolRecord(runId, request, 'success', durationMs, parsed)
        return {
          message,
          result: {
            toolCallId: request.id,
            name: request.name,
            status: 'success',
            output: parsed,
            attempts: attempt,
            durationMs,
            record,
          },
          record,
        }
      } catch (error) {
        lastError = redactToolError(error)
      }
    }
    return this.failedInvocation(runId, request, lastError, maxAttempts, startedAt)
  }

  private failedInvocation(
    runId: string,
    request: ToolCallRequest,
    error: string,
    attempts: number,
    startedAt: number,
  ): ToolInvocation {
    const durationMs = Math.round(performance.now() - startedAt)
    const output = { error }
    const record = createToolRecord(runId, request, 'failed', durationMs, output)
    return {
      message: new ToolMessage({
        content: JSON.stringify(output),
        name: request.name,
        tool_call_id: request.id,
        status: 'error',
      }),
      result: {
        toolCallId: request.id,
        name: request.name,
        status: 'error',
        error,
        attempts,
        durationMs,
        record,
      },
      record,
    }
  }

  private registerDefaults() {
    this.add('poi_search', 'Search fictional POIs once and ground candidate proposals.', poiSearchSchema, async (input) => {
      const plan = await this.requirePlan(input.planId)
      const target = input.mode === 'replace'
        ? plan.segments.find((segment) => segment.id === input.segmentId)
        : undefined
      const intent = deriveCandidateSearchIntent(input.query, {
        mode: input.mode,
        phase: target?.phase,
        serviceCategory: target?.serviceCategory,
      })
      const candidates = input.mode === 'add-after'
        ? createAddSegmentCandidates(plan, input.afterSegmentId, input.query, input.excludeCandidateIds)
        : createReplacementCandidates(plan, requireText(input.segmentId, 'segmentId'), input.query, input.excludeCandidateIds)
      return { source: 'fictional-local-mock-v2', intent: summarizeCandidateSearchIntent(intent), candidates }
    })
    this.add('offering_search', 'Search fictional merchant offerings.', offeringSearchSchema, async (input) => ({
      source: 'fictional-local-mock-v2',
      offerings: searchMerchantOfferings(input).map((result) => ({
        merchant: {
          id: result.merchant.id,
          name: result.merchant.name,
          phase: result.merchant.phase,
          serviceCategory: result.merchant.serviceCategory,
        },
        offering: result.offering,
        score: result.score,
        reasons: result.reasons,
      })),
    }))
    this.add('route_estimate', 'Estimate deterministic mock routes.', planIdSchema, async (input) => {
      const plan = await this.requirePlan(input.planId)
      return { source: 'mock-route', routes: buildMockRouteEstimates(plan.segments) }
    })
    this.add('weather_check', 'Return a deterministic local weather hint.', weatherSchema, async (input) => ({
      location: input.location,
      date: input.date,
      condition: 'cloudy',
      outdoorRisk: 'low',
      summary: '天气风险低，室内外都可以安排。',
    }))
    this.add('order_preview', 'Preview a sandbox order without external writes.', planIdSchema, async (input) => {
      const plan = await this.requirePlan(input.planId)
      return { receipt: createSandboxOrderReceipt(plan) }
    })
    this.add('get_current_plan', 'Read the current plan snapshot.', planIdSchema, async (input) => {
      const plan = await this.requirePlan(input.planId)
      return { plan }
    })
  }

  private add<T extends z.ZodObject<z.ZodRawShape>>(
    name: PlanPalToolName,
    description: string,
    schema: T,
    execute: (input: z.output<T>) => Promise<unknown>,
  ) {
    const nativeTool = tool(async (input) => {
      const override = this.overrides[name]
      const output = override
        ? await override(input as Record<string, unknown>)
        : await execute(schema.parse(input))
      return JSON.stringify(output)
    }, { name, description, schema })
    this.specs.set(name, { name, description, effect: 'read-only', tool: nativeTool })
  }

  private async requirePlan(planId: string) {
    const plan = await this.planLookup(planId)
    if (!plan) throw new Error(`Plan ${planId} was not found`)
    return plan
  }
}

export function createDefaultToolRegistry(
  overrides: Partial<Record<PlanPalToolName, ToolExecutor>> = {},
) {
  return new ToolRegistry(overrides)
}

function toLangChainToolCall(request: ToolCallRequest): ToolCall {
  return { id: request.id, name: request.name, args: request.args, type: 'tool_call' }
}

function createToolRecord(
  runId: string,
  request: ToolCallRequest,
  status: ToolCallRecord['status'],
  durationMs: number,
  output: unknown,
): ToolCallRecord {
  return {
    id: createId('tool'),
    runId,
    toolName: legacyToolName(request.name),
    effect: 'read-only',
    argsJson: JSON.stringify(request.args),
    resultJson: JSON.stringify(output),
    status,
    durationMs,
  }
}

function legacyToolName(name: PlanPalToolName) {
  return name.replace('_', '.')
}

function parseToolContent(content: ToolMessage['content']) {
  const text = typeof content === 'string' ? content : JSON.stringify(content)
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { text }
  }
}

function stringifyOutput(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function requireText(value: string | undefined, field: string) {
  if (!value) throw new Error(`${field} is required`)
  return value
}

function redactToolError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error)
  return text.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
}
