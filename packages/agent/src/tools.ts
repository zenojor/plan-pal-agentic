import type { CandidateOption, Plan, ToolCallRecord, ToolEffect } from '@planpal/domain'
import { createId } from '@planpal/domain'
import { createReplacementCandidates } from '@planpal/domain'

export type ToolSpec = {
  name: string
  effect: ToolEffect
  description: string
  execute: (input: unknown) => Promise<unknown>
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolSpec>()

  register(tool: ToolSpec) {
    this.tools.set(tool.name, tool)
    return this
  }

  list() {
    return [...this.tools.values()]
  }

  async run(runId: string, toolName: string, input: unknown, allowedEffects: ToolEffect[]): Promise<ToolCallRecord> {
    const startedAt = performance.now()
    const tool = this.tools.get(toolName)
    const argsJson = JSON.stringify(input ?? {})
    if (!tool) {
      return {
        id: createId('tool'),
        runId,
        toolName,
        effect: 'read-only',
        argsJson,
        status: 'failed',
        durationMs: Math.round(performance.now() - startedAt),
        resultJson: JSON.stringify({ error: 'Unknown tool' }),
      }
    }
    if (!allowedEffects.includes(tool.effect)) {
      return {
        id: createId('tool'),
        runId,
        toolName,
        effect: tool.effect,
        argsJson,
        status: 'blocked',
        durationMs: Math.round(performance.now() - startedAt),
        resultJson: JSON.stringify({ error: `Tool effect ${tool.effect} is not allowed` }),
      }
    }
    try {
      const result = await tool.execute(input)
      return {
        id: createId('tool'),
        runId,
        toolName,
        effect: tool.effect,
        argsJson,
        resultJson: JSON.stringify(result),
        status: 'success',
        durationMs: Math.round(performance.now() - startedAt),
      }
    } catch (error) {
      return {
        id: createId('tool'),
        runId,
        toolName,
        effect: tool.effect,
        argsJson,
        status: 'failed',
        durationMs: Math.round(performance.now() - startedAt),
        resultJson: JSON.stringify({ error: error instanceof Error ? error.message : 'Tool failed' }),
      }
    }
  }
}

export function createDefaultToolRegistry() {
  return new ToolRegistry()
    .register({
      name: 'poi.search',
      effect: 'read-only',
      description: 'Search replacement candidates for a plan segment.',
      execute: async (input) => {
        const value = input as { plan: Plan; segmentId: string; query?: string }
        const candidates: CandidateOption[] = createReplacementCandidates(value.plan, value.segmentId, value.query)
        return { candidates }
      },
    })
    .register({
      name: 'weather.check',
      effect: 'read-only',
      description: 'Return a deterministic weather hint for planning.',
      execute: async () => ({
        condition: 'cloudy',
        outdoorRisk: 'low',
        summary: '天气风险低，室内外都可以安排。',
      }),
    })
    .register({
      name: 'order.execute',
      effect: 'external-write',
      description: 'Confirm external bookings. Blocked during planning runs.',
      execute: async () => ({
        status: 'queued',
      }),
    })
}
