import type { PlanPalStores } from '@planpal/db'
import type { PlanCommand, PlanPatch } from '@planpal/domain'
import type { ToolCallRequest, ToolResult } from './schemas'
import { readQaModelStreamEvent } from './graph-stream'
import type { RuntimeEventEmitter } from './runtime-events'

export type GraphStreamTracker = {
  startedNodes: Set<string>
}

export function createGraphStreamTracker(): GraphStreamTracker {
  return { startedNodes: new Set() }
}

export async function mapGraphStreamChunk(
  stores: PlanPalStores,
  chunk: unknown,
  emitter: RuntimeEventEmitter,
  tracker: GraphStreamTracker,
) {
  if (!Array.isArray(chunk) || chunk.length !== 2) return
  const [mode, data] = chunk
  if (mode === 'custom') {
    await mapGraphCustomEvent(data, emitter, tracker)
    return
  }
  if (mode === 'updates') {
    await mapGraphUpdate(stores, data, emitter, tracker)
  }
}

export async function mapGraphUpdate(
  stores: PlanPalStores,
  chunk: unknown,
  emitter: RuntimeEventEmitter,
  tracker?: GraphStreamTracker,
) {
  const updates = readObject(chunk)
  for (const [node, rawUpdate] of Object.entries(updates)) {
    if (node === '__interrupt__') continue
    const update = readObject(rawUpdate)
    if (!tracker?.startedNodes.delete(node)) {
      await emitter.emit('graph.node.started', `Node ${node} started`, { node })
    }
    await mapModelEvents(node, update, emitter)
    await mapToolEvents(stores, update, emitter)
    await mapProposalEvents(update, emitter)
    await mapCommandEvents(node, update, emitter)
    await emitter.emit('graph.node.finished', `Node ${node} finished`, {
      node,
      updateKeys: Object.keys(update),
      resume: node === 'requestApproval' ? update.resume : undefined,
      error: update.error,
    })
  }
}

async function mapGraphCustomEvent(
  chunk: unknown,
  emitter: RuntimeEventEmitter,
  tracker: GraphStreamTracker,
) {
  const event = readQaModelStreamEvent(chunk)
  if (!event) return
  if (event.kind === 'qa.model.started') {
    if (!tracker.startedNodes.has(event.node)) {
      tracker.startedNodes.add(event.node)
      await emitter.emit('graph.node.started', `Node ${event.node} started`, {
        node: event.node,
        streaming: true,
      })
    }
    await emitter.emit('agent.model.started', `Model phase ${event.node} started`, {
      node: event.node,
      phase: event.phase,
      modelCalls: event.modelCalls,
      usedModel: true,
      fallbackUsed: false,
    })
    return
  }
  if (event.kind === 'qa.model.delta') {
    await emitter.emit('agent.message.delta', event.delta, {
      node: event.node,
      delta: event.delta,
      phase: event.phase,
      producedAt: event.producedAt,
      usedModel: true,
      fallbackUsed: false,
    })
    return
  }
  if (event.kind === 'qa.model.error') {
    await emitter.emit('agent.model.error', event.message, {
      node: event.node,
      phase: event.phase,
      code: event.code,
      usedModel: true,
      fallbackUsed: false,
    })
    return
  }
  await emitter.emit('agent.model.finished', `Model phase ${event.node} finished`, {
    node: event.node,
    phase: event.phase,
    modelCalls: event.modelCalls,
    usedModel: true,
    fallbackUsed: false,
  })
}

export function readActionContext(state: unknown) {
  const value = readObject(state)
  const metadata = readObject(value.metadata)
  const toolResults = readArray(value.toolResults).map(readToolResult).filter(isPresent)
  const candidateResult = toolResults.find((result) => result.name === 'poi_search' && result.status === 'success')
  const candidateOutput = readObject(candidateResult?.output)
  const routeSource = typeof metadata.routeSource === 'string' ? metadata.routeSource : 'deterministic'
  return {
    routeSource,
    usedModel: routeSource === 'model',
    fallbackUsed: routeSource === 'fallback' || readArray(metadata.fallbackReasons).length > 0,
    intentSummary: candidateOutput.intent,
    rankingSignals: readObject(candidateOutput.intent).rankingSignals,
  }
}

async function mapModelEvents(
  node: string,
  update: Record<string, unknown>,
  emitter: RuntimeEventEmitter,
) {
  if (node !== 'understandIntent' && node !== 'planningAgent') return
  const metadata = readObject(update.metadata)
  const modelCalls = readNumber(metadata.modelCalls)
  if (!modelCalls) return
  const phase = node === 'understandIntent' ? 'intent' : 'tool-selection'
  await emitter.emit('agent.model.started', `Model phase ${node} started`, {
    node,
    phase,
    modelCalls,
    usedModel: true,
    fallbackUsed: false,
  })
  const modelError = readObject(update.error)
  if (typeof modelError.message === 'string') {
    await emitter.emit('agent.model.error', modelError.message, {
      node,
      phase,
      code: modelError.code,
      usedModel: true,
      fallbackUsed: false,
    })
    return
  }
  const reasons = readArray(metadata.fallbackReasons)
  if (reasons.length > 0) {
    await emitter.emit('agent.model.error', `模型调用失败：${String(reasons.at(-1))}`, {
      node,
      phase,
      fallbackReasons: reasons,
      usedModel: false,
      fallbackUsed: true,
    })
  } else {
    await emitter.emit('agent.model.finished', `Model phase ${node} finished`, {
      node,
      phase,
      modelCalls,
      usedModel: true,
      fallbackUsed: false,
    })
  }
}

async function mapToolEvents(
  stores: PlanPalStores,
  update: Record<string, unknown>,
  emitter: RuntimeEventEmitter,
) {
  for (const call of readArray(update.toolCalls).map(readToolCall).filter(isPresent)) {
    await emitter.emit('tool.called', `Calling ${call.name}`, {
      toolName: legacyToolName(call.name),
      nativeToolName: call.name,
      toolCallId: call.id,
      args: call.args,
      effect: 'read-only',
    })
  }
  for (const result of readArray(update.toolResults).map(readToolResult).filter(isPresent)) {
    if (result.record) await stores.agents.appendToolCall(result.record)
    await emitter.emit('tool.result', `${result.name} ${result.status}`, {
      ...result,
      toolName: legacyToolName(result.name),
      nativeToolName: result.name,
      tool_call_id: result.toolCallId,
      retryCount: Math.max(0, result.attempts - 1),
    })
  }
}

async function mapProposalEvents(update: Record<string, unknown>, emitter: RuntimeEventEmitter) {
  for (const proposal of readArray(update.proposedCommands).map(readObject)) {
    await emitter.emit('command.proposed', 'PlanCommand proposal validated by Zod', { proposal })
    await emitter.emit('plan.patch.proposed', String(proposal.rationale ?? 'Plan change proposed'), { proposal })
  }
}

async function mapCommandEvents(
  node: string,
  update: Record<string, unknown>,
  emitter: RuntimeEventEmitter,
) {
  if (node !== 'validateProposal' && node !== 'applyCommand') return
  const metadata = readObject(update.metadata)
  const commands = readArray(metadata.appliedCommands).filter(isPlanCommand)
  const patches = readArray(metadata.appliedPatches).filter(isPlanPatch)
  for (const [index, command] of commands.entries()) {
    await emitter.emit('command.applied', `Applied ${command.type}`, { command, patch: patches[index] })
  }
  if (commands.length === 0) return
  const plan = update.plan
  const command = commands.at(-1)
  const patch = patches.at(-1)
  await emitter.emit('plan.updated', patch?.summary ?? 'Plan updated', {
    command,
    confirmedCommands: commands,
    patch,
    plan,
    version: readObject(plan).currentVersion,
  })
}

function readToolCall(value: unknown): ToolCallRequest | undefined {
  const input = readObject(value)
  if (typeof input.id !== 'string' || typeof input.name !== 'string') return undefined
  return value as ToolCallRequest
}

function readToolResult(value: unknown): ToolResult | undefined {
  const input = readObject(value)
  if (typeof input.toolCallId !== 'string' || typeof input.name !== 'string') return undefined
  return value as ToolResult
}

function isPlanCommand(value: unknown): value is PlanCommand {
  return typeof readObject(value).type === 'string'
}

function isPlanPatch(value: unknown): value is PlanPatch {
  return typeof readObject(value).operation === 'string'
}

function legacyToolName(name: string) {
  return name.replace('_', '.')
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readNumber(value: unknown) {
  return typeof value === 'number' ? value : 0
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined
}
