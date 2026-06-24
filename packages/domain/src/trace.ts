import type { AgentEvent, AgentRun, Plan, PlanCommand, PlanPatch, ToolCallRecord, ToolEffect } from './types'

const SECRET_PATTERNS = [/sk-[A-Za-z0-9_-]+/g, /Bearer\s+(?!token\b)[A-Za-z0-9._~+/=-]{6,}/gi]
const SUMMARY_LIMIT = 360

export type TraceStepStatus = 'done' | 'active' | 'error' | 'blocked'

export type TraceRunSummary = {
  id: string
  planId: string
  status: AgentRun['status']
  inputMessage: string
  createdAt: string
  finishedAt?: string
}

export type TraceToolCallSummary = {
  id: string
  runId: string
  toolName: string
  effect: ToolEffect
  status: ToolCallRecord['status']
  durationMs: number
  argsSummary: string
  resultSummary?: string
}

export type TraceCommandWrite = {
  id: string
  eventId: string
  commandType: PlanCommand['type']
  source?: string
  version?: number
  patchSummary?: string
  sequence: number
}

export type TraceStep = {
  id: string
  eventId: string
  kind: AgentEvent['type']
  label: string
  status: TraceStepStatus
  sequence: number
  createdAt: string
  summary: string
  toolName?: string
  effect?: ToolEffect
  commandType?: PlanCommand['type']
  version?: number
}

export type TraceReplayFrame = {
  id: string
  stepId: string
  title: string
  description: string
  sequence: number
  version?: number
}

export type TraceSafetyFinding = {
  id: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

export type TraceVersionSummary = {
  version: number
  status: Plan['status']
  segmentCount: number
  updatedAt: string
  summary: string
}

export type AgentTraceSnapshot = {
  planId: string
  run: TraceRunSummary
  eventCount: number
  toolCallCount: number
  steps: TraceStep[]
  toolCalls: TraceToolCallSummary[]
  commandWrites: TraceCommandWrite[]
  safetyFindings: TraceSafetyFinding[]
  replayFrames: TraceReplayFrame[]
  versions: TraceVersionSummary[]
}

export function buildAgentTraceSnapshot(input: {
  events: AgentEvent[]
  run: AgentRun
  toolCalls: ToolCallRecord[]
  versions?: Plan[]
}): AgentTraceSnapshot {
  const runEvents = input.events
    .filter((event) => event.runId === input.run.id)
    .sort((left, right) => left.sequence - right.sequence || left.createdAt.localeCompare(right.createdAt))
  const toolCalls = input.toolCalls.map(summarizeToolCall)
  const steps = runEvents.map((event) => stepFromEvent(event))
  const commandWrites = runEvents
    .flatMap(commandWritesFromEvent)
    .filter((item): item is TraceCommandWrite => Boolean(item))
  return {
    planId: input.run.planId,
    run: {
      id: input.run.id,
      planId: input.run.planId,
      status: input.run.status,
      inputMessage: redactTraceText(input.run.inputMessage),
      createdAt: input.run.createdAt,
      finishedAt: input.run.finishedAt,
    },
    eventCount: runEvents.length,
    toolCallCount: toolCalls.length,
    steps,
    toolCalls,
    commandWrites,
    safetyFindings: buildSafetyFindings({ events: runEvents, toolCalls, commandWrites }),
    replayFrames: steps.map((step) => replayFrameFromStep(step)),
    versions: (input.versions ?? []).map((plan) => ({
      version: plan.currentVersion,
      status: plan.status,
      segmentCount: plan.segments.length,
      updatedAt: plan.updatedAt,
      summary: redactTraceText(plan.summary),
    })),
  }
}

export function redactTraceText(value: string) {
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[redacted]'), value)
}

export function containsTraceSecret(value: unknown) {
  const text = typeof value === 'string' ? value : safeStringify(value)
  return SECRET_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0
    return pattern.test(text)
  })
}

export function normalizeTraceForComparison(snapshot: AgentTraceSnapshot) {
  return {
    planId: snapshot.planId,
    runStatus: snapshot.run.status,
    steps: snapshot.steps.map((step) => ({
      kind: step.kind,
      label: step.label,
      status: step.status,
      toolName: step.toolName,
      effect: step.effect,
      commandType: step.commandType,
      version: step.version,
      summary: step.summary,
    })),
    toolCalls: snapshot.toolCalls.map((call) => ({
      toolName: call.toolName,
      effect: call.effect,
      status: call.status,
      argsSummary: call.argsSummary,
      resultSummary: call.resultSummary,
    })),
    commandWrites: snapshot.commandWrites.map((write) => ({
      commandType: write.commandType,
      source: write.source,
      version: write.version,
      patchSummary: write.patchSummary,
    })),
    safetyFindings: snapshot.safetyFindings.map((finding) => ({
      id: finding.id,
      status: finding.status,
    })),
  }
}

function stepFromEvent(event: AgentEvent): TraceStep {
  const payload = readObject(event.payload)
  const command = readCommand(payload.command)
  const patch = readPatch(payload.patch)
  const toolName = readString(payload.toolName) || readString(payload.toolName)
  const effect = readToolEffect(payload.effect)
  return {
    id: `step_${event.id}`,
    eventId: event.id,
    kind: event.type,
    label: eventLabel(event),
    status: eventStatus(event),
    sequence: event.sequence,
    createdAt: event.createdAt,
    summary: truncate(redactTraceText(event.message)),
    toolName: toolName || readToolCallFromPayload(event.payload)?.toolName,
    effect: effect ?? readToolCallFromPayload(event.payload)?.effect,
    commandType: command?.type ?? patch?.operation,
    version: readNumber(payload.version),
  }
}

function summarizeToolCall(call: ToolCallRecord): TraceToolCallSummary {
  return {
    id: call.id,
    runId: call.runId,
    toolName: call.toolName,
    effect: call.effect,
    status: call.status,
    durationMs: call.durationMs,
    argsSummary: summarizeJson(call.argsJson),
    resultSummary: call.resultJson ? summarizeJson(call.resultJson) : undefined,
  }
}

function commandWritesFromEvent(event: AgentEvent): TraceCommandWrite[] {
  if (event.type !== 'plan.updated') return []
  const payload = readObject(event.payload)
  const command = readCommand(payload.command)
  const patch = readPatch(payload.patch)
  const commandType = command?.type ?? patch?.operation
  if (!commandType) return []
  const primary: TraceCommandWrite = {
    id: `write_${event.id}`,
    eventId: event.id,
    commandType,
    source: command && 'source' in command ? String(command.source) : undefined,
    version: readNumber(payload.version),
    patchSummary: patch?.summary ? redactTraceText(patch.summary) : redactTraceText(event.message),
    sequence: event.sequence,
  }
  const confirmed = readCommandArray(payload.confirmedCommands)
  if (!confirmed.length) return [primary]
  return [
    primary,
    ...confirmed.map((item, index) => ({
      id: `write_${event.id}_confirmed_${index}`,
      eventId: event.id,
      commandType: item.type,
      source: item.source,
      version: readNumber(payload.version),
      patchSummary: patch?.summary ? redactTraceText(patch.summary) : redactTraceText(event.message),
      sequence: event.sequence,
    })),
  ]
}

function buildSafetyFindings(input: {
  commandWrites: TraceCommandWrite[]
  events: AgentEvent[]
  toolCalls: TraceToolCallSummary[]
}): TraceSafetyFinding[] {
  const rawHasSecret = containsTraceSecret(input.events) || containsTraceSecret(input.toolCalls)
  const successfulExternalWrites = input.toolCalls.filter((call) => call.effect === 'external-write' && call.status === 'success')
  const blockedExternalWrites = input.toolCalls.filter((call) => call.effect === 'external-write' && call.status === 'blocked')
  return [
    {
      id: 'secret-redaction',
      label: '密钥脱敏',
      status: rawHasSecret ? 'fail' : 'pass',
      detail: rawHasSecret ? 'Trace 输入中仍检测到疑似密钥。' : 'Trace snapshot 未暴露 API key 或 Bearer token。',
    },
    {
      id: 'external-write',
      label: '外部写入阻断',
      status: successfulExternalWrites.length ? 'fail' : 'pass',
      detail: successfulExternalWrites.length
        ? `${successfulExternalWrites.length} 个 external-write 工具成功执行。`
        : blockedExternalWrites.length
          ? `${blockedExternalWrites.length} 个 external-write 工具被阻断。`
          : '本次 run 未执行 external-write 工具。',
    },
    {
      id: 'command-gate',
      label: 'PlanCommand 边界',
      status: input.commandWrites.length ? 'pass' : 'warn',
      detail: input.commandWrites.length
        ? `${input.commandWrites.length} 次计划写入带有 command/patch 记录。`
        : '本次 run 没有计划写入，可能是 QA 或等待用户选择。',
    },
  ]
}

function replayFrameFromStep(step: TraceStep): TraceReplayFrame {
  return {
    id: `frame_${step.eventId}`,
    stepId: step.id,
    title: step.label,
    description: [
      step.summary,
      step.toolName ? `工具：${step.toolName}` : '',
      step.commandType ? `命令：${step.commandType}` : '',
      step.version ? `版本：V${step.version}` : '',
    ].filter(Boolean).join(' · '),
    sequence: step.sequence,
    version: step.version,
  }
}

function eventLabel(event: AgentEvent) {
  switch (event.type) {
    case 'agent.started':
      return '接收请求'
    case 'agent.model.started':
      return '模型调用开始'
    case 'agent.model.finished':
      return '模型调用完成'
    case 'agent.model.error':
      return '模型调用失败'
    case 'agent.message.delta':
      return '回答流片段'
    case 'tool.called':
      return '工具调用开始'
    case 'tool.result':
      return '工具返回结果'
    case 'plan.patch.proposed':
      return '计划补丁准备'
    case 'plan.updated':
      return '计划写入'
    case 'action.required':
      return '等待用户确认'
    case 'agent.finished':
      return 'Agent 完成'
    case 'agent.error':
      return 'Agent 失败'
    default:
      return event.type
  }
}

function eventStatus(event: AgentEvent): TraceStepStatus {
  if (event.type === 'agent.error' || event.type === 'agent.model.error') return 'error'
  if (event.type === 'action.required' || event.type === 'agent.model.started' || event.type === 'tool.called') return 'active'
  return 'done'
}

function summarizeJson(value: string) {
  try {
    return truncate(redactTraceText(JSON.stringify(JSON.parse(value))))
  } catch {
    return truncate(redactTraceText(value))
  }
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readToolEffect(value: unknown): ToolEffect | undefined {
  return value === 'read-only' || value === 'external-write' ? value : undefined
}

function readCommand(value: unknown): PlanCommand | undefined {
  const input = readObject(value)
  return typeof input.type === 'string' ? value as PlanCommand : undefined
}

function readCommandArray(value: unknown): PlanCommand[] {
  if (!Array.isArray(value)) return []
  return value.map(readCommand).filter((command): command is PlanCommand => Boolean(command))
}

function readPatch(value: unknown): PlanPatch | undefined {
  const input = readObject(value)
  return typeof input.operation === 'string' ? value as PlanPatch : undefined
}

function readToolCallFromPayload(value: unknown): Pick<ToolCallRecord, 'effect' | 'toolName'> | undefined {
  const input = readObject(value)
  const toolName = readString(input.toolName)
  const effect = readToolEffect(input.effect)
  return toolName && effect ? { toolName, effect } : undefined
}

function truncate(value: string) {
  return value.length > SUMMARY_LIMIT ? `${value.slice(0, SUMMARY_LIMIT)}...` : value
}
