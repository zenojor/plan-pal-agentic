import type { LangGraphRunnableConfig } from '@langchain/langgraph'

export type QaModelStreamEvent =
  | {
      kind: 'qa.model.started'
      modelCalls: number
      node: 'qaAgent'
      phase: 'answer'
    }
  | {
      delta: string
      kind: 'qa.model.delta'
      node: 'qaAgent'
      phase: 'answer'
      producedAt: string
    }
  | {
      kind: 'qa.model.finished'
      modelCalls: number
      node: 'qaAgent'
      phase: 'answer'
    }
  | {
      code: string
      kind: 'qa.model.error'
      message: string
      node: 'qaAgent'
      phase: 'answer'
    }

export function writeQaModelStreamEvent(
  config: LangGraphRunnableConfig,
  event: QaModelStreamEvent,
) {
  config.writer?.(event)
}

export function readQaModelStreamEvent(value: unknown): QaModelStreamEvent | undefined {
  if (!value || typeof value !== 'object') return undefined
  const event = value as Partial<QaModelStreamEvent>
  if (event.node !== 'qaAgent' || event.phase !== 'answer' || typeof event.kind !== 'string') return undefined
  if (event.kind === 'qa.model.delta') {
    return typeof event.delta === 'string' && event.delta.length > 0 && typeof event.producedAt === 'string'
      ? event as QaModelStreamEvent
      : undefined
  }
  if (event.kind === 'qa.model.started' || event.kind === 'qa.model.finished') {
    return typeof event.modelCalls === 'number' ? event as QaModelStreamEvent : undefined
  }
  if (event.kind === 'qa.model.error') {
    return typeof event.message === 'string' && typeof event.code === 'string'
      ? event as QaModelStreamEvent
      : undefined
  }
  return undefined
}
