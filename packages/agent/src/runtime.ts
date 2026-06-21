import { applyPlanCommand, createId, nowIso, type AgentEvent, type AgentRun, type Plan, type PlanCommand } from '@planpal/domain'
import type { PlanPalStores } from '@planpal/db'
import type { CoreMessage } from 'ai'
import {
  generateAssistantReply,
  streamAssistantReply,
  getOpenAICompatibleAttemptedEndpoints,
  sanitizeModelConfig,
  type ClientModelConfig,
  type PublicModelConfig,
} from './model'
import {
  parseModelTurnIntent,
  routeModelTurnIntent,
  routeNaturalLanguageTurn,
  type RoutedTurn,
} from './router'
import { createDefaultToolRegistry, type ToolRegistry } from './tools'

export type AgentRunInput = {
  planId: string
  message: string
  selectedSegmentId?: string
  clientContext?: unknown
  modelConfig?: ClientModelConfig
}

export type AgentResumeInput = {
  planId: string
  runId: string
  actionId: string
  payload: unknown
}

export type AgentEventSink = (event: AgentEvent) => void | Promise<void>

export type AgentModelGateway = {
  generateAssistantReply: typeof generateAssistantReply
  streamAssistantReply?: typeof streamAssistantReply
}

const defaultModelGateway: AgentModelGateway = {
  generateAssistantReply,
  streamAssistantReply,
}

export class PlanPalAgentRuntime {
  constructor(
    private readonly stores: PlanPalStores,
    private readonly tools: ToolRegistry = createDefaultToolRegistry(),
    private readonly modelGateway: AgentModelGateway = defaultModelGateway,
  ) {}

  async run(input: AgentRunInput, sink: AgentEventSink) {
    const plan = await this.stores.plans.getPlan(input.planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    const run: AgentRun = {
      id: createId('run'),
      planId: input.planId,
      status: 'running',
      inputMessage: input.message,
      checkpointId: `memory:${input.planId}:${Date.now()}`,
      createdAt: nowIso(),
    }
    await this.stores.agents.createRun(run)

    let sequence = 0
    const emit = async (type: AgentEvent['type'], message: string, payload?: unknown) => {
      sequence += 1
      const event: AgentEvent = {
        id: createId('evt'),
        runId: run.id,
        planId: input.planId,
        type,
        sequence,
        message,
        payload,
        createdAt: nowIso(),
      }
      await this.stores.agents.appendEvent(event)
      await sink(event)
      return event
    }

    const model = input.modelConfig ? sanitizeModelConfig(input.modelConfig) : undefined
    const attemptedEndpoints = input.modelConfig ? getOpenAICompatibleAttemptedEndpoints(input.modelConfig) : undefined
    await emit('agent.started', 'Agent run started', { node: 'understandTurn', model })
    const routed = await this.routeTurnWithOptionalModel(input, model, attemptedEndpoints, emit)
    const route = routed.route

    if (route.kind === 'candidate-search') {
      await emit('tool.called', 'Searching replacement candidates', {
        toolName: 'poi.search',
        effect: 'read-only',
      })
      const call = await this.tools.run(run.id, 'poi.search', {
        plan,
        segmentId: route.segmentId,
        query: route.query,
      }, ['read-only'])
      await this.stores.agents.appendToolCall(call)
      await emit('tool.result', 'Replacement candidates ready', call)

      const command: PlanCommand = {
        type: 'REPLACE_SEGMENT',
        source: 'agent',
        segmentId: route.segmentId,
        searchQuery: route.query,
      }
      const result = applyPlanCommand(plan, command, run.id)
      await this.stores.plans.savePlan(result.plan, 'agent')
      await emit('plan.patch.proposed', 'Agent proposed a replacement workflow', {
        patch: result.patch,
        model,
        routeSource: routed.source,
        usedModel: routed.source === 'model',
        fallbackUsed: routed.source !== 'model',
        error: routed.modelError,
        attemptedEndpoints,
      })
      await emit('action.required', result.plan.pendingAction?.title ?? 'Choose an option', {
        action: result.plan.pendingAction,
        model,
        routeSource: routed.source,
        usedModel: routed.source === 'model',
        fallbackUsed: routed.source !== 'model',
        error: routed.modelError,
        attemptedEndpoints,
      })
      await this.stores.agents.saveRun({ ...run, status: 'waiting_for_user' })
      return { runId: run.id, status: 'waiting_for_user' as const }
    }

    if (route.kind === 'command') {
      const result = applyPlanCommand(plan, route.command, run.id)
      await this.stores.plans.savePlan(result.plan, 'agent')
      await emit('plan.patch.proposed', route.reason, {
        patch: result.patch,
        model,
        routeSource: routed.source,
        usedModel: routed.source === 'model',
        fallbackUsed: routed.source !== 'model',
        error: routed.modelError,
        attemptedEndpoints,
      })
      await emit('plan.updated', result.patch.summary, { plan: result.plan, version: result.version })
      await emit('agent.finished', 'Agent command finished', {
        runId: run.id,
        model,
        route,
        routeSource: routed.source,
        usedModel: routed.source === 'model',
        fallbackUsed: routed.source !== 'model',
        error: routed.modelError,
        attemptedEndpoints,
      })
      await this.stores.agents.saveRun({ ...run, status: 'completed', finishedAt: nowIso() })
      return { runId: run.id, status: 'completed' as const }
    }

    const answer = input.modelConfig && routed.source !== 'fallback'
      ? await this.answerWithModel(input.modelConfig, model!, attemptedEndpoints, input.message, route, emit)
      : routed.source === 'fallback'
        ? {
            text: `模型调用失败，已切换离线 fallback：${route.answerSeed}`,
            usedModel: false,
            fallbackUsed: true,
            error: routed.modelError,
          }
      : {
          text: `当前未连接模型。${route.answerSeed}`,
          usedModel: false,
          fallbackUsed: true,
        }
    await emit('agent.finished', answer.text, {
      route,
      model,
      routeSource: routed.source,
      usedModel: answer.usedModel,
      fallbackUsed: answer.fallbackUsed,
      error: answer.error,
      attemptedEndpoints,
    })
    await this.stores.agents.saveRun({ ...run, status: 'completed', finishedAt: nowIso() })
    return { runId: run.id, status: 'completed' as const }
  }

  private async routeTurnWithOptionalModel(
    input: AgentRunInput,
    model: PublicModelConfig | undefined,
    attemptedEndpoints: string[] | undefined,
    emit: (type: AgentEvent['type'], message: string, payload?: unknown) => Promise<AgentEvent>,
  ): Promise<{ route: RoutedTurn; source: 'model' | 'deterministic' | 'fallback'; modelError?: string }> {
    const plan = await this.stores.plans.getPlan(input.planId)
    if (!plan) throw new Error('Plan not found')
    const fallback = routeNaturalLanguageTurn(plan, input.message, input.selectedSegmentId)
    if (!input.modelConfig || !model) return { route: fallback, source: 'deterministic' }
    if (shouldDirectAnswerWithModel(input.message, fallback)) {
      return { route: fallback, source: 'model' }
    }

    await emit('agent.model.started', 'Calling model for intent interpretation', {
      model,
      phase: 'intent',
      usedModel: true,
      fallbackUsed: false,
      attemptedEndpoints,
    })
    const intentResult = await this.safeModelText(input.modelConfig, buildIntentMessages(model, input.message, plan))
    if (!intentResult.ok) {
      await emit('agent.model.error', `模型调用失败：${intentResult.error}`, {
        model,
        phase: 'intent',
        usedModel: false,
        fallbackUsed: true,
        error: intentResult.error,
        attemptedEndpoints,
      })
      return { route: fallback, source: 'fallback', modelError: intentResult.error }
    }

    const intent = parseModelTurnIntent(intentResult.text)
    if (!intent) {
      const error = '模型返回的意图 JSON 无法解析'
      await emit('agent.model.error', `模型调用失败：${error}`, {
        model,
        phase: 'intent',
        usedModel: false,
        fallbackUsed: true,
        error,
        attemptedEndpoints,
      })
      return { route: fallback, source: 'fallback', modelError: error }
    }

    await emit('agent.model.finished', 'Model intent interpreted', {
      model,
      phase: 'intent',
      usedModel: true,
      fallbackUsed: false,
      intent,
      attemptedEndpoints,
    })
    return {
      route: routeModelTurnIntent(plan, input.message, intent, input.selectedSegmentId),
      source: 'model',
    }
  }

  private async answerWithModel(
    config: ClientModelConfig,
    model: PublicModelConfig,
    attemptedEndpoints: string[] | undefined,
    message: string,
    route: Extract<RoutedTurn, { kind: 'qa' }>,
    emit: (type: AgentEvent['type'], message: string, payload?: unknown) => Promise<AgentEvent>,
  ): Promise<{ text: string; usedModel: boolean; fallbackUsed: boolean; error?: string }> {
    await emit('agent.model.started', 'Calling model for answer generation', {
      model,
      phase: 'answer',
      usedModel: true,
      fallbackUsed: false,
      attemptedEndpoints,
    })
    const result = await this.safeModelText(config, buildAnswerMessages(model, message, route), async (delta) => {
      await emit('agent.message.delta', delta, {
        attemptedEndpoints,
        delta,
        fallbackUsed: false,
        model,
        phase: 'answer',
        usedModel: true,
      })
    })
    if (result.ok) {
      await emit('agent.model.finished', 'Model answer generated', {
        model,
        phase: 'answer',
        usedModel: true,
        fallbackUsed: false,
        attemptedEndpoints,
      })
      return {
        text: result.text,
        usedModel: true,
        fallbackUsed: false,
      }
    }
    await emit('agent.model.error', `模型调用失败：${result.error}`, {
      model,
      phase: 'answer',
      usedModel: false,
      fallbackUsed: true,
      error: result.error,
      attemptedEndpoints,
    })
    return {
      text: `模型调用失败，已切换离线 fallback：${route.answerSeed}`,
      usedModel: false,
      fallbackUsed: true,
      error: result.error,
    }
  }

  private async safeModelText(
    config: ClientModelConfig,
    messages: CoreMessage[],
    onDelta?: (delta: string) => void | Promise<void>,
  ) {
    try {
      const text = onDelta && this.modelGateway.streamAssistantReply
        ? await this.modelGateway.streamAssistantReply(config, messages, onDelta)
        : await this.modelGateway.generateAssistantReply(config, messages)
      return {
        ok: true as const,
        text,
      }
    } catch (error) {
      return {
        ok: false as const,
        error: redactModelError(error),
      }
    }
  }

  async resume(input: AgentResumeInput, sink: AgentEventSink) {
    const plan = await this.stores.plans.getPlan(input.planId)
    if (!plan) throw new Error('Plan not found')
    const candidateId = typeof input.payload === 'object' && input.payload && 'candidateId' in input.payload
      ? String(input.payload.candidateId)
      : ''
    const result = applyPlanCommand(plan, {
      type: 'CHOOSE_CANDIDATE',
      source: 'action-card',
      actionId: input.actionId,
      candidateId,
    }, input.runId)
    await this.stores.plans.savePlan(result.plan, 'agent')
    const event: AgentEvent = {
      id: createId('evt'),
      runId: input.runId,
      planId: input.planId,
      type: 'plan.updated',
      sequence: 1,
      message: 'Candidate applied',
      payload: { plan: result.plan, version: result.version },
      createdAt: nowIso(),
    }
    await this.stores.agents.appendEvent(event)
    await sink(event)
    const finished: AgentEvent = {
      ...event,
      id: createId('evt'),
      type: 'agent.finished',
      sequence: 2,
      message: 'Agent run resumed and finished',
      payload: { runId: input.runId },
      createdAt: nowIso(),
    }
    await this.stores.agents.appendEvent(finished)
    await sink(finished)
    return { status: 'completed' as const }
  }
}

function shouldDirectAnswerWithModel(message: string, fallback: RoutedTurn) {
  if (fallback.kind !== 'qa') return false
  const normalized = message.trim().toLowerCase()
  if (!normalized) return false
  if (containsAny(normalized, commandLikeKeywords)) return false
  return containsAny(normalized, directAnswerKeywords)
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

const commandLikeKeywords = [
  '换',
  '替换',
  'replace',
  'near',
  '近一点',
  '近点',
  '火锅',
  '涮锅',
  '涮肉',
  '锅底',
  'hotpot',
  '删除',
  '删掉',
  '去掉',
  '不要',
  'remove',
  'delete',
  '确认',
  '下单',
  '预订',
  'confirm',
  '轻松',
  '别太赶',
  '安静',
  '改成',
  'rewrite',
  '调整',
]

const directAnswerKeywords = [
  '你是什么模型',
  '什么模型',
  '你是谁',
  'who are you',
  'what model',
  '能做什么',
  '怎么用',
  'help',
  '帮助',
  '解释',
  '为什么',
  '当前安排',
  '当前计划',
  '这个计划',
  '状态',
]

function buildIntentMessages(model: PublicModelConfig, message: string, plan: Plan): CoreMessage[] {
  const segments = plan.segments.map((segment) => ({
    id: segment.id,
    phase: segment.phase,
    title: segment.title,
    place: segment.place,
    time: `${segment.startTime}-${segment.endTime}`,
    locked: Boolean(segment.locked),
    isTransit: Boolean(segment.isTransit),
  })) ?? []
  return [
    {
      role: 'system',
      content: [
        'You are PlanPal intent interpreter.',
        `The current configured model is ${model.model} via ${model.baseURL}.`,
        'Return only one JSON object. No markdown.',
        'Schema: {"action":"qa|replace|rewrite|delete|confirm","targetSegmentId":"optional segment id","targetPhase":"activity|dining|drinks|leisure|transit optional","query":"optional rewrite/search text","answer":"optional answer for qa","reason":"short reason"}.',
        'Do not include secrets or API keys.',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify({
        userMessage: message,
        plan: { title: plan.title, summary: plan.summary, status: plan.status, segments },
      }),
    },
  ]
}

function buildAnswerMessages(model: PublicModelConfig, message: string, route: Extract<RoutedTurn, { kind: 'qa' }>): CoreMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are PlanPal. Answer in Chinese, briefly and concretely.',
        `The current configured model is ${model.model} via ${model.baseURL}.`,
        'You may say which configured model is being used when asked.',
        'Never ask for or reveal API keys.',
      ].join(' '),
    },
    {
      role: 'user',
      content: `${message}\n\nFallback context: ${route.answerSeed}`,
    },
  ]
}

function redactModelError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || 'Model call failed')
  return raw
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
}



