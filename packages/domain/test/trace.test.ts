import { describe, expect, it } from 'vitest'
import {
  applyPlanCommand,
  buildAgentTraceSnapshot,
  createId,
  createPlanFromPrompt,
  nowIso,
  normalizeTraceForComparison,
  type AgentRun,
  type ToolCallRecord,
} from '../src'

describe('agent trace snapshot', () => {
  it('summarizes command writes, tool calls, replay frames, and safety findings', () => {
    const plan = createPlanFromPrompt('晚上两个人附近吃饭')
    const target = plan.segments.find((segment) => segment.phase === 'dining') ?? plan.segments[0]!
    const commandResult = applyPlanCommand(plan, {
      type: 'REWRITE_SEGMENT',
      source: 'agent',
      segmentId: target.id,
      changes: { notes: '别太赶' },
    }, 'run_trace_test')
    const run: AgentRun = {
      id: 'run_trace_test',
      planId: plan.id,
      status: 'completed',
      inputMessage: 'Bearer abc.def sk-secret-for-test',
      createdAt: nowIso(),
      finishedAt: nowIso(),
    }
    const blockedTool: ToolCallRecord = {
      id: createId('tool'),
      runId: run.id,
      toolName: 'order.execute',
      effect: 'external-write',
      argsJson: '{"authorization":"Bearer abc.def"}',
      resultJson: '{"error":"sk-secret-for-test"}',
      status: 'blocked',
      durationMs: 4,
    }

    const snapshot = buildAgentTraceSnapshot({
      events: commandResult.events,
      run,
      toolCalls: [blockedTool],
      versions: [plan, commandResult.plan],
    })

    expect(snapshot.run.inputMessage).toBe('[redacted] [redacted]')
    expect(snapshot.toolCalls[0]).toMatchObject({
      effect: 'external-write',
      status: 'blocked',
      toolName: 'order.execute',
    })
    expect(snapshot.toolCalls[0]?.argsSummary).not.toContain('abc.def')
    expect(snapshot.toolCalls[0]?.resultSummary).not.toContain('sk-secret-for-test')
    expect(snapshot.commandWrites).toEqual([expect.objectContaining({
      commandType: 'REWRITE_SEGMENT',
      source: 'agent',
      version: commandResult.version,
    })])
    expect(snapshot.replayFrames[0]?.description).toContain('REWRITE_SEGMENT')
    expect(snapshot.safetyFindings).toContainEqual(expect.objectContaining({
      id: 'external-write',
      status: 'pass',
    }))
    expect(snapshot.safetyFindings).toContainEqual(expect.objectContaining({
      id: 'secret-redaction',
      status: 'pass',
    }))
    expect(normalizeTraceForComparison(snapshot).commandWrites[0]?.commandType).toBe('REWRITE_SEGMENT')
  })
})
