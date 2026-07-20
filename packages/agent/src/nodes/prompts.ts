import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages'
import type { CoreMessage } from '../model'
import type { PlanPalGraphStateValue } from '../state'

export function intentMessages(state: PlanPalGraphStateValue, repairReason?: string) {
  const plan = state.plan!
  const history = state.messages.slice(-10).map((message) => ({
    role: message.getType(),
    content: messageText(message),
  }))
  return [
    new SystemMessage([
      'You are PlanPal intent interpreter. Return exactly one JSON object and no markdown.',
      'The JSON object must contain action, reason, and confidence. action must be one of qa, replace, add, rewrite, delete, confirm, service, clarify, select, cancel; reason must be a non-empty string; confidence must be a number from 0 to 1.',
      'Optional JSON fields are answer, query, targetSegmentId, targetPhase, and category. targetPhase must be one of activity, dining, drinks, leisure, transit; category must be one of dining, drinks, activity, hotel, movie, retail, wellness, ticket, other.',
      'Respect negation: “不要酒店了” means delete, not add or search.',
      'Use replace for 换/替换/switch to another place; replace must search POI candidates.',
      'Use rewrite only to edit time, duration, title, or notes while keeping the same place.',
      'Use service only for room, ticket, package, or merchant-offering selection.',
      'Never mutate the plan and never reveal credentials.',
      repairReason ? `The previous structured output was invalid: ${repairReason}. Repair it once.` : '',
    ].filter(Boolean).join(' ')),
    new HumanMessage(JSON.stringify({
      userMessage: state.metadata.userMessage,
      selectedSegmentId: state.metadata.selectedSegmentId,
      history,
      plan: {
        id: plan.id,
        status: plan.status,
        summary: plan.summary,
        segments: plan.segments.map((segment) => ({
          id: segment.id,
          title: segment.title,
          place: segment.place,
          phase: segment.phase,
          serviceCategory: segment.serviceCategory,
          locked: Boolean(segment.locked),
        })),
      },
    })),
  ]
}

export function answerMessages(state: PlanPalGraphStateValue): BaseMessage[] {
  return [
    new SystemMessage('You are PlanPal. Answer briefly in Chinese. Treat the current plan as read-only. Never reveal credentials.'),
    ...state.messages.slice(-12),
    new HumanMessage(JSON.stringify({ currentPlan: state.plan, question: state.metadata.userMessage })),
  ]
}

export function messageText(message: BaseMessage) {
  return typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
}

export function toCoreMessage(message: BaseMessage): CoreMessage {
  const type = message.getType()
  return {
    role: type === 'system' ? 'system' : type === 'ai' ? 'assistant' : 'user',
    content: messageText(message),
  }
}
