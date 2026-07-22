import { AIMessage } from '@langchain/core/messages'
import type { LangGraphRunnableConfig } from '@langchain/langgraph'
import { ZodError } from 'zod'
import { AgentIntentSchema, AgentRouteSchema, FinalAgentResponseSchema, ProposedPlanCommandSchema, type AgentIntent, type AgentRoute } from '../schemas'
import type { PlanPalGraphDependencies } from '../graph-types'
import { writeQaModelStreamEvent } from '../graph-stream'
import { invokeAnswerModel, invokeStructuredWithGateway } from '../graph-model'
import { routeModelTurnIntent, routeNaturalLanguageTurn, type ModelTurnIntent, type RoutedTurn } from '../router'
import type { PlanPalGraphStateUpdate, PlanPalGraphStateValue } from '../state'
import { withNodePath } from '../state'
import { answerMessages, intentMessages, messageText, toCoreMessage } from './prompts'

export function createContextNodes(deps: PlanPalGraphDependencies) {
  return {
    loadContext: async (state: PlanPalGraphStateValue): Promise<PlanPalGraphStateUpdate> => {
      const plan = await deps.stores.plans.getPlan(state.planId)
      if (!plan) {
        return {
          error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found', recoverable: false, node: 'loadContext' },
          metadata: withNodePath(state, 'loadContext'),
        }
      }
      return {
        plan,
        baseVersion: plan.currentVersion,
        error: null,
        resultPlan: null,
        response: null,
        resume: null,
        proposedCommands: [],
        pendingApproval: null,
        metadata: { ...withNodePath(state, 'loadContext'), activeToolCallIds: [] },
      }
    },

    understandIntent: async (state: PlanPalGraphStateValue): Promise<PlanPalGraphStateUpdate> => {
      if (!state.plan) return missingPlan('understandIntent', state)
      const deterministic = routeNaturalLanguageTurn(
        state.plan,
        state.metadata.userMessage,
        state.metadata.selectedSegmentId,
      )
      const fallbackIntent = intentFromRoute(deterministic)
      if (deterministic.kind === 'qa') {
        return {
          intent: fallbackIntent,
          metadata: {
            ...withNodePath(state, 'understandIntent'),
            routeSource: 'model',
            continuation: null,
          },
        }
      }

      let lastError = 'Structured intent failed'
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const modelIntent = await invokeStructuredWithGateway({
            config: deps.modelConfig,
            gateway: deps.modelGateway,
            messages: intentMessages(state, attempt > 1 ? lastError : undefined),
            name: 'planpal_agent_intent',
            schema: AgentIntentSchema,
          })
          const guarded = guardCriticalIntent(modelIntent, fallbackIntent, deterministic)
          return {
            intent: guarded.intent,
            messages: [new AIMessage({ content: JSON.stringify(guarded.intent), name: 'intent_interpreter' })],
            metadata: {
              ...withNodePath(state, 'understandIntent'),
              routeSource: guarded.reason ? 'fallback' : 'model',
              modelCalls: state.metadata.modelCalls + attempt,
              fallbackReasons: guarded.reason
                ? [...state.metadata.fallbackReasons, guarded.reason]
                : state.metadata.fallbackReasons,
              continuation: null,
            },
          }
        } catch (error) {
          lastError = redactError(error)
          if (!isRepairableStructuredOutputError(error)) {
            return {
              error: {
                code: 'MODEL_UNAVAILABLE',
                message: `模型调用失败：${lastError}`,
                recoverable: false,
                node: 'understandIntent',
              },
              metadata: {
                ...withNodePath(state, 'understandIntent'),
                modelCalls: state.metadata.modelCalls + attempt,
                continuation: null,
              },
            }
          }
        }
      }
      return {
        intent: fallbackIntent,
        metadata: {
          ...withNodePath(state, 'understandIntent'),
          routeSource: 'fallback',
          modelCalls: state.metadata.modelCalls + 2,
          fallbackReasons: [...state.metadata.fallbackReasons, `intent:${lastError}`],
          continuation: null,
        },
      }
    },

    routeIntent: async (state: PlanPalGraphStateValue): Promise<PlanPalGraphStateUpdate> => {
      if (!state.plan || !state.intent) return missingPlan('routeIntent', state)
      const routed = routeFromIntent(state)
      return {
        route: AgentRouteSchema.parse(toAgentRoute(routed)),
        metadata: withNodePath(state, 'routeIntent'),
      }
    },

    qaAgent: async (
      state: PlanPalGraphStateValue,
      config: LangGraphRunnableConfig,
    ): Promise<PlanPalGraphStateUpdate> => {
      if (!state.plan || state.route?.kind !== 'qa') return invalidRoute('qaAgent', state)
      let text = ''
      const fallbackUsed = state.metadata.routeSource === 'fallback'
      const modelCalls = state.metadata.modelCalls + 1
      writeQaModelStreamEvent(config, {
        kind: 'qa.model.started',
        modelCalls,
        node: 'qaAgent',
        phase: 'answer',
      })
      try {
        const messages = answerMessages(state)
        if (deps.modelGateway.streamAssistantReply) {
          const coreMessages = messages.map(toCoreMessage)
          text = await deps.modelGateway.streamAssistantReply(deps.modelConfig, coreMessages, async (delta) => {
            if (!delta) return
            await writeQaModelStreamEvent(config, {
              delta,
              kind: 'qa.model.delta',
              node: 'qaAgent',
              phase: 'answer',
              producedAt: new Date().toISOString(),
            })
          })
        } else {
          const response = await invokeAnswerModel({
            config: deps.modelConfig,
            gateway: deps.modelGateway,
            messages,
          })
          text = messageText(response)
        }
        writeQaModelStreamEvent(config, {
          kind: 'qa.model.finished',
          modelCalls,
          node: 'qaAgent',
          phase: 'answer',
        })
      } catch (error) {
        const reason = redactError(error)
        writeQaModelStreamEvent(config, {
          code: 'MODEL_UNAVAILABLE',
          kind: 'qa.model.error',
          message: `模型调用失败：${reason}`,
          node: 'qaAgent',
          phase: 'answer',
        })
        return {
          error: {
            code: 'MODEL_UNAVAILABLE',
            message: `模型调用失败：${reason}`,
            recoverable: false,
            node: 'qaAgent',
          },
          metadata: {
            ...withNodePath(state, 'qaAgent'),
            modelCalls,
          },
        }
      }
      return qaUpdate(state, text, fallbackUsed)
    },
  }
}

function isRepairableStructuredOutputError(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError) return true
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return message.includes('json object')
    || message.includes('structured output')
    || message.includes('schema validation')
    || message.includes('failed to parse')
}

function routeFromIntent(state: PlanPalGraphStateValue): RoutedTurn | AgentRoute {
  if (!state.plan || !state.intent) throw new Error('Route state is incomplete')
  if (state.intent.action === 'select' || state.intent.action === 'cancel') {
    return { kind: 'confirmation', actionId: state.plan.pendingAction?.id, reason: state.intent.reason }
  }
  if (state.metadata.routeSource === 'model') {
    return routeModelTurnIntent(
      state.plan,
      state.metadata.userMessage,
      state.intent as ModelTurnIntent,
      state.metadata.selectedSegmentId,
    )
  }
  return routeNaturalLanguageTurn(state.plan, state.metadata.userMessage, state.metadata.selectedSegmentId)
}

function toAgentRoute(route: RoutedTurn | AgentRoute): AgentRoute {
  if (route.kind === 'service-item-search') return { ...route, kind: 'service-search' }
  if (route.kind === 'command') {
    const command = ProposedPlanCommandSchema.safeParse(route.command)
    if (!command.success) {
      return {
        kind: 'clarification',
        title: '需要补充信息',
        description: '这个修改暂时无法转换为受支持的 PlanCommand。',
        requiredFields: ['要修改的节点', '期望的修改结果'],
        reason: command.error.message,
      }
    }
    return { kind: 'mutation', command: command.data, reason: route.reason }
  }
  return route
}

function intentFromRoute(route: RoutedTurn): AgentIntent {
  if (route.kind === 'qa') return AgentIntentSchema.parse({ action: 'qa', answer: route.answerSeed, reason: route.reason })
  if (route.kind === 'candidate-search') {
    return AgentIntentSchema.parse({
      action: route.mode === 'replace' ? 'replace' : 'add',
      query: route.query,
      reason: route.reason,
      replacementScope: route.mode === 'replace' ? route.replacementScope : undefined,
      desiredPhases: route.mode === 'replace' ? route.desiredPhases : undefined,
      excludedPhases: route.mode === 'replace' ? route.excludedPhases : undefined,
      softPreferences: route.mode === 'replace' ? route.softPreferences : undefined,
    })
  }
  if (route.kind === 'service-item-search') {
    return AgentIntentSchema.parse({ action: 'service', query: route.query, category: route.category, reason: route.reason })
  }
  if (route.kind === 'clarification') return AgentIntentSchema.parse({ action: 'clarify', reason: route.reason })
  const action = route.command.type === 'DELETE_SEGMENT' || route.command.type === 'CLEAR_PLAN_SEGMENTS'
    ? 'delete'
    : route.command.type === 'CONFIRM_PLAN' || route.command.type === 'CREATE_SANDBOX_ORDER'
      ? 'confirm'
      : 'rewrite'
  return AgentIntentSchema.parse({ action, reason: route.reason })
}

function guardCriticalIntent(model: AgentIntent, fallback: AgentIntent, route: RoutedTurn) {
  // High-confidence dining preferences must remain a grounded replacement even
  // when the model mistakes them for QA/rewrite/delete. Other candidate/add
  // disagreements remain model decisions (for example “加一个套餐” can
  // correctly be a service intent).
  const guardedDiningReplacement = route.kind === 'candidate-search'
    && route.mode === 'replace'
    && (route.reason === 'dining preference replacement request'
      || route.reason === 'cross-type contextual replacement request')
  const requiredAction = guardedDiningReplacement && model.action !== 'replace'
    ? 'replace'
    : route.kind === 'candidate-search' && route.mode === 'replace' && model.action === 'rewrite'
    ? 'replace'
    : route.kind === 'service-item-search' ? 'service'
      : route.kind === 'command'
        ? route.command.type === 'DELETE_SEGMENT' || route.command.type === 'CLEAR_PLAN_SEGMENTS'
          ? 'delete'
          : route.command.type === 'CONFIRM_PLAN' || route.command.type === 'CREATE_SANDBOX_ORDER'
            ? 'confirm'
            : undefined
        : undefined
  if (!requiredAction || model.action === requiredAction) return { intent: model }
  return {
    intent: fallback,
    reason: `intent-guard:model-${model.action}-conflicted-with-${requiredAction}`,
  }
}

function qaUpdate(
  state: PlanPalGraphStateValue,
  text: string,
  fallbackUsed: boolean,
  fallbackReason?: string,
): PlanPalGraphStateUpdate {
  return {
    messages: [new AIMessage(text)],
    response: FinalAgentResponseSchema.parse({
      runId: state.runId,
      planId: state.planId,
      status: 'completed',
      text,
      route: 'qa',
      planVersion: state.plan?.currentVersion,
      fallbackUsed,
      usedModel: !fallbackUsed,
    }),
    metadata: {
      ...withNodePath(state, 'qaAgent'),
      modelCalls: state.metadata.modelCalls + 1,
      fallbackReasons: fallbackReason
        ? [...state.metadata.fallbackReasons, fallbackReason]
        : state.metadata.fallbackReasons,
    },
  }
}

function missingPlan(node: string, state: PlanPalGraphStateValue): PlanPalGraphStateUpdate {
  return {
    error: { code: 'MISSING_CONTEXT', message: 'Plan context is unavailable', recoverable: false, node },
    metadata: withNodePath(state, node),
  }
}

function invalidRoute(node: string, state: PlanPalGraphStateValue): PlanPalGraphStateUpdate {
  return {
    error: { code: 'INVALID_ROUTE', message: `Invalid state for ${node}`, recoverable: false, node },
    metadata: withNodePath(state, node),
  }
}

function redactError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error)
  return text
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')
}
