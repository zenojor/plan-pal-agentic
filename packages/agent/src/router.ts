import type { Plan, PlanCommand, PlanSegment, SegmentPhase } from '@planpal/domain'

export type RoutedTurn =
  | {
      kind: 'command'
      command: PlanCommand
      reason: string
    }
  | {
      kind: 'candidate-search'
      segmentId: string
      query: string
      reason: string
    }
  | {
      kind: 'qa'
      answerSeed: string
      reason: string
    }

export type ModelTurnIntent = {
  action: 'qa' | 'replace' | 'rewrite' | 'delete' | 'confirm'
  answer?: string
  query?: string
  reason?: string
  targetPhase?: SegmentPhase
  targetSegmentId?: string
}

export function routeNaturalLanguageTurn(plan: Plan, message: string, selectedSegmentId?: string): RoutedTurn {
  const normalized = message.trim().toLowerCase()
  const target = findTargetSegment(plan, normalized, selectedSegmentId)
  if (containsAny(normalized, ['换', '替换', 'replace', 'near', '近一点', '近点', '火锅', '涮锅', '涮肉', '锅底', 'hotpot'])) {
    return {
      kind: 'candidate-search',
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
  if (containsAny(normalized, ['确认', '下单', '预订', 'confirm'])) {
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
    if (!parsed.action || !['qa', 'replace', 'rewrite', 'delete', 'confirm'].includes(parsed.action)) return null
    const targetPhase = isSegmentPhase(parsed.targetPhase) ? parsed.targetPhase : undefined
    return {
      action: parsed.action,
      answer: typeof parsed.answer === 'string' ? parsed.answer : undefined,
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
  if (intent.action === 'replace') {
    return {
      kind: 'candidate-search',
      segmentId: target.id,
      query: intent.query?.trim() || message,
      reason: intent.reason || 'model interpreted replacement request',
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
        type: 'CONFIRM_PLAN',
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
  if (containsAny(normalized, ['饭', '吃', 'dinner', '餐厅', '晚餐', '火锅', '涮锅', '涮肉', '锅底', 'hotpot'])) {
    return plan.segments.find((segment) => segment.phase === 'dining') ?? plan.segments[0]!
  }
  if (containsAny(normalized, ['喝', '酒', 'bar', '清吧'])) {
    return plan.segments.find((segment) => segment.phase === 'drinks') ?? plan.segments[0]!
  }
  return plan.segments.find((segment) => !segment.isTransit) ?? plan.segments[0]!
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
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
