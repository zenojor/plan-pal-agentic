import { applyPlanCommand, createId, deriveCandidateSearchIntent, nowIso, reorderPlanSegmentsWithTime, summarizeCandidateSearchIntent, type AgentEvent, type AgentRun, type ConfirmablePlanCommand, type Plan, type PlanCommand } from '@planpal/domain'
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
      const isAddAfter = route.mode === 'add-after'
      const intentSummary = candidateIntentSummaryForRoute(plan, route)
      await emit('tool.called', isAddAfter ? 'Searching add-after candidates' : 'Searching replacement candidates', {
        toolName: 'poi.search',
        effect: 'read-only',
        intentSummary,
      })
      const call = await this.tools.run(run.id, 'poi.search', {
        plan,
        mode: route.mode,
        segmentId: route.mode === 'replace' ? route.segmentId : undefined,
        afterSegmentId: route.mode === 'add-after' ? route.afterSegmentId : undefined,
        query: route.query,
      }, ['read-only'])
      await this.stores.agents.appendToolCall(call)
      await emit('tool.result', isAddAfter ? 'Add-after candidates ready' : 'Replacement candidates ready', {
        ...call,
        intentSummary,
        rankingSignals: intentSummary?.rankingSignals,
      })

      const command: PlanCommand = isAddAfter
        ? {
            type: 'REFRESH_CANDIDATES',
            source: 'agent',
            mode: 'add-after',
            afterSegmentId: route.afterSegmentId,
            searchQuery: route.query,
          }
        : {
            type: 'REPLACE_SEGMENT',
            source: 'agent',
            segmentId: route.segmentId,
            searchQuery: route.query,
          }
      const result = applyPlanCommand(plan, command, run.id)
      await this.stores.plans.savePlan(result.plan, 'agent')
      await emit('plan.patch.proposed', isAddAfter ? 'Agent proposed an add-after workflow' : 'Agent proposed a replacement workflow', {
        patch: result.patch,
        intentSummary,
        rankingSignals: intentSummary?.rankingSignals,
        model,
        routeSource: routed.source,
        usedModel: routed.source === 'model',
        fallbackUsed: routed.source !== 'model',
        error: routed.modelError,
        attemptedEndpoints,
      })
      await emit('action.required', result.plan.pendingAction?.title ?? 'Choose an option', {
        action: result.plan.pendingAction,
        intentSummary,
        rankingSignals: intentSummary?.rankingSignals,
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

    if (route.kind === 'clarification') {
      const command: PlanCommand = {
        type: 'REQUEST_CLARIFICATION',
        source: 'agent',
        title: route.title,
        description: route.description,
        requiredFields: route.requiredFields,
      }
      const result = applyPlanCommand(plan, command, run.id)
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
      await emit('action.required', result.plan.pendingAction?.title ?? 'Need clarification', {
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

    if (route.kind === 'service-item-search') {
      await emit('tool.called', 'Searching merchant offerings', {
        toolName: 'offering.search',
        effect: 'read-only',
      })
      const call = await this.tools.run(run.id, 'offering.search', {
        category: route.category,
        merchantId: route.merchantId,
        query: route.query,
      }, ['read-only'])
      await this.stores.agents.appendToolCall(call)
      await emit('tool.result', 'Merchant offerings ready', call)

      const command: PlanCommand = {
        type: 'REFRESH_SERVICE_ITEMS',
        source: 'agent',
        segmentId: route.segmentId,
        merchantId: route.merchantId,
        category: route.category,
        query: route.query,
      }
      const result = applyPlanCommand(plan, command, run.id)
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
      await emit('action.required', result.plan.pendingAction?.title ?? 'Choose a service item', {
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
      if (route.command.type === 'CREATE_SANDBOX_ORDER' || route.command.type === 'CONFIRM_PLAN') {
        await emit('tool.called', 'Previewing sandbox receipt', {
          toolName: 'order.preview',
          effect: 'read-only',
        })
        const call = await this.tools.run(run.id, 'order.preview', { plan }, ['read-only'])
        await this.stores.agents.appendToolCall(call)
        await emit('tool.result', 'Sandbox receipt preview ready', call)
      }
      const confirmationCommand = createCommandConfirmationCommand(plan, route.command, route.reason)
      const result = applyPlanCommand(plan, confirmationCommand, run.id)
      await this.stores.plans.savePlan(result.plan, 'agent')
      await emit('plan.patch.proposed', route.reason, {
        patch: result.patch,
        commandPreview: result.plan.pendingAction?.kind === 'command-confirmation' ? result.plan.pendingAction.preview : undefined,
        model,
        routeSource: routed.source,
        usedModel: routed.source === 'model',
        fallbackUsed: routed.source !== 'model',
        error: routed.modelError,
        attemptedEndpoints,
      })
      await emit('action.required', result.plan.pendingAction?.title ?? '确认修改', {
        action: result.plan.pendingAction,
        commandPreview: result.plan.pendingAction?.kind === 'command-confirmation' ? result.plan.pendingAction.preview : undefined,
        model,
        route,
        routeSource: routed.source,
        usedModel: routed.source === 'model',
        fallbackUsed: routed.source !== 'model',
        error: routed.modelError,
        attemptedEndpoints,
      })
      await this.stores.agents.saveRun({ ...run, status: 'waiting_for_user' })
      return { runId: run.id, status: 'waiting_for_user' as const }
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

    const modelRoute = routeModelTurnIntent(plan, input.message, intent, input.selectedSegmentId)
    const intentSummary = candidateIntentSummaryForRoute(plan, modelRoute)
    await emit('agent.model.finished', 'Model intent interpreted', {
      model,
      phase: 'intent',
      usedModel: true,
      fallbackUsed: false,
      intent,
      intentSummary,
      rankingSignals: intentSummary?.rankingSignals,
      attemptedEndpoints,
    })
    return {
      route: modelRoute,
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
    const activeAction = plan.pendingAction?.id === input.actionId ? plan.pendingAction : undefined
    let command: PlanCommand
    let finishedMessage = '已应用修改，可撤销'
    let undoVersion: number | undefined
    let confirmedCommands: ConfirmablePlanCommand[] | undefined
    if (activeAction?.kind === 'command-confirmation') {
      const confirmed = typeof input.payload === 'object' && input.payload && 'confirmed' in input.payload
        ? Boolean((input.payload as { confirmed?: unknown }).confirmed)
        : true
      command = confirmed
        ? {
            type: 'CONFIRM_COMMAND_ACTION',
            source: 'action-card',
            actionId: input.actionId,
          }
        : {
            type: 'DISMISS_PENDING_ACTION',
            source: 'action-card',
            actionId: input.actionId,
          }
      finishedMessage = confirmed ? '已应用修改，可撤销' : '已取消，拼图未变化'
      confirmedCommands = confirmed ? activeAction.commands : undefined
    } else if (activeAction?.kind === 'service-item-selection') {
      const offeringId = typeof input.payload === 'object' && input.payload && 'offeringId' in input.payload
        ? String(input.payload.offeringId)
        : ''
      const quantityValue = typeof input.payload === 'object' && input.payload && 'quantity' in input.payload
        ? Number((input.payload as { quantity?: unknown }).quantity)
        : undefined
      command = {
        type: 'SELECT_SERVICE_ITEM',
        source: 'action-card',
        segmentId: activeAction.segmentId,
        merchantId: activeAction.merchantId,
        offeringId,
        quantity: Number.isFinite(quantityValue) ? quantityValue : undefined,
      }
      finishedMessage = '商品/服务已选择'
    } else {
      const candidateId = typeof input.payload === 'object' && input.payload && 'candidateId' in input.payload
        ? String(input.payload.candidateId)
        : ''
      command = {
        type: 'CHOOSE_CANDIDATE',
        source: 'action-card',
        actionId: input.actionId,
        candidateId,
      }
      finishedMessage = '候选已应用'
    }
    if (command.type !== 'DISMISS_PENDING_ACTION') {
      undoVersion = plan.currentVersion
    }
    const result = applyPlanCommand(plan, command, input.runId)
    await this.stores.plans.savePlan(result.plan, 'agent')
    const event: AgentEvent = {
      id: createId('evt'),
      runId: input.runId,
      planId: input.planId,
      type: 'plan.updated',
      sequence: 1,
      message: result.patch.summary,
      payload: {
        command,
        confirmedCommands,
        patch: result.patch,
        plan: result.plan,
        version: result.version,
        undoVersion,
      },
      createdAt: nowIso(),
    }
    await this.stores.agents.appendEvent(event)
    await sink(event)
    const finished: AgentEvent = {
      ...event,
      id: createId('evt'),
      type: 'agent.finished',
      sequence: 2,
      message: finishedMessage,
      payload: { runId: input.runId, undoVersion, version: result.version },
      createdAt: nowIso(),
    }
    await this.stores.agents.appendEvent(finished)
    await sink(finished)
    const run = await this.stores.agents.getRun(input.runId)
    if (run) {
      await this.stores.agents.saveRun({ ...run, status: 'completed', finishedAt: nowIso() })
    }
    return { status: 'completed' as const }
  }
}

function createCommandConfirmationCommand(plan: Plan, command: PlanCommand, reason: string): PlanCommand {
  if (!isConfirmableRouteCommand(command)) {
    throw new Error(`${command.type} cannot be proposed as an agent mutation`)
  }
  const descriptor = describeCommandProposal(plan, command, reason)
  return {
    type: 'REQUEST_COMMAND_CONFIRMATION',
    source: 'agent',
    title: descriptor.title,
    description: descriptor.description,
    severity: descriptor.severity,
    confirmLabel: descriptor.confirmLabel,
    cancelLabel: '取消',
    commands: [command],
    preview: descriptor.preview,
  }
}

function isConfirmableRouteCommand(command: PlanCommand): command is ConfirmablePlanCommand {
  return command.type !== 'REQUEST_COMMAND_CONFIRMATION'
    && command.type !== 'CONFIRM_COMMAND_ACTION'
    && command.type !== 'RESTORE_PLAN_VERSION'
}

function describeCommandProposal(plan: Plan, command: ConfirmablePlanCommand, reason: string) {
  const executable = plan.segments.filter((segment) => !segment.isTransit)
  const target = 'segmentId' in command ? plan.segments.find((segment) => segment.id === command.segmentId) : undefined
  const titles = affectedTitles(plan, command)
  const titleLine = titles.length ? titles.join('、') : '当前计划'
  const basePreview = {
    affectedSegmentIds: affectedIds(plan, command),
    affectedSegmentTitles: titles,
    beforeVersion: plan.currentVersion,
    summary: reason,
    riskNotes: [] as string[],
    beforeOrder: executable.map((segment) => segment.title),
  }
  switch (command.type) {
    case 'CLEAR_PLAN_SEGMENTS': {
      const unlockedCount = executable.filter((segment) => !segment.locked).length
      const lockedCount = executable.length - unlockedCount
      return {
        title: '确认清空计划',
        description: `我准备清空当前 ${unlockedCount} 个未锁定节点。确认后拼图会变为空计划。`,
        severity: 'destructive' as const,
        confirmLabel: '确定清空',
        preview: {
          ...basePreview,
          summary: `清空 ${unlockedCount} 个未锁定节点`,
          riskNotes: [
            '清空后需要重新添加节点才能生成模拟确认单',
            lockedCount > 0 ? `${lockedCount} 个锁定节点会保留` : '',
            '可通过撤销恢复到确认前版本',
          ].filter(Boolean),
          afterOrder: executable.filter((segment) => segment.locked).map((segment) => segment.title),
        },
      }
    }
    case 'DELETE_SEGMENT':
      return {
        title: '确认删除节点',
        description: `我准备删除“${target?.title ?? titleLine}”。`,
        severity: 'destructive' as const,
        confirmLabel: '确定删除',
        preview: {
          ...basePreview,
          summary: `删除“${target?.title ?? titleLine}”`,
          riskNotes: ['会一并移除该节点的服务项选择', '可通过撤销恢复到确认前版本'],
          afterOrder: executable.filter((segment) => segment.id !== command.segmentId).map((segment) => segment.title),
        },
      }
    case 'REORDER_SEGMENT': {
      let afterOrder: string[] | undefined
      try {
        afterOrder = reorderPlanSegmentsWithTime(plan.segments, command.segmentId, command.anchorSegmentId, command.position)
          .filter((segment) => !segment.isTransit)
          .map((segment) => segment.title)
      } catch {
        afterOrder = undefined
      }
      return {
        title: '确认重排计划',
        description: `我建议调整“${target?.title ?? titleLine}”的位置，并同步更新时间。`,
        severity: 'normal' as const,
        confirmLabel: '确定应用',
        preview: {
          ...basePreview,
          summary: `重排“${target?.title ?? titleLine}”`,
          riskNotes: ['节点顺序和开始/结束时间会一起更新'],
          afterOrder,
        },
      }
    }
    case 'REWRITE_SEGMENT':
      return {
        title: '确认改写节点',
        description: `我建议更新“${target?.title ?? titleLine}”的说明或时间信息。`,
        severity: 'normal' as const,
        confirmLabel: '确定应用',
        preview: {
          ...basePreview,
          summary: `改写“${target?.title ?? titleLine}”`,
          riskNotes: ['只会修改确认卡片中涉及的节点字段'],
        },
      }
    case 'CONFIRM_PLAN':
    case 'CREATE_SANDBOX_ORDER':
      return {
        title: command.type === 'CREATE_SANDBOX_ORDER' ? '确认生成模拟确认单' : '确认当前计划',
        description: '我已经预览过 mock 确认单。确认后计划会进入已确认状态。',
        severity: 'finalizing' as const,
        confirmLabel: command.type === 'CREATE_SANDBOX_ORDER' ? '生成确认单' : '确认计划',
        preview: {
          ...basePreview,
          summary: command.type === 'CREATE_SANDBOX_ORDER' ? '生成模拟确认单' : '确认当前计划',
          riskNotes: ['这是本地 mock，不代表真实预订或下单', '确认后仍可通过版本撤销恢复'],
        },
      }
    default:
      return {
        title: '确认应用修改',
        description: `我建议修改“${titleLine}”。`,
        severity: 'normal' as const,
        confirmLabel: '确定应用',
        preview: basePreview,
      }
  }
}

function affectedIds(plan: Plan, command: ConfirmablePlanCommand) {
  if (command.type === 'CLEAR_PLAN_SEGMENTS') {
    const requested = command.segmentIds?.length ? new Set(command.segmentIds) : undefined
    return plan.segments
      .filter((segment) => !segment.isTransit)
      .filter((segment) => !requested || requested.has(segment.id))
      .filter((segment) => command.includeLocked || !segment.locked)
      .map((segment) => segment.id)
  }
  const ids: string[] = []
  if ('segmentId' in command && command.segmentId) ids.push(command.segmentId)
  if ('fromSegmentId' in command && command.fromSegmentId) ids.push(command.fromSegmentId)
  if ('toSegmentId' in command && command.toSegmentId) ids.push(command.toSegmentId)
  return [...new Set(ids)]
}

function affectedTitles(plan: Plan, command: ConfirmablePlanCommand) {
  const ids = new Set(affectedIds(plan, command))
  return plan.segments
    .filter((segment) => ids.has(segment.id))
    .map((segment) => segment.title)
}

function candidateIntentSummaryForRoute(plan: Plan, route: RoutedTurn) {
  if (route.kind !== 'candidate-search') return undefined
  const target = route.mode === 'replace'
    ? plan.segments.find((segment) => segment.id === route.segmentId)
    : undefined
  const intent = deriveCandidateSearchIntent(route.query, {
    mode: route.mode,
    phase: target?.phase,
    serviceCategory: target?.serviceCategory,
  })
  return summarizeCandidateSearchIntent(intent)
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
  '加一个',
  '加个',
  '加一段',
  '加点别的',
  '再加',
  '添加',
  '加入',
  '安排一个',
  '安排个',
  '空档',
  '空隙',
  '咖啡',
  '甜品',
  '拍照',
  '散步',
  '酒店',
  '住宿',
  '住一晚',
  '电影',
  '影院',
  'imax',
  '房型',
  '双床',
  '大床',
  '电影票',
  '买票',
  '套餐',
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
  '想吃辣',
  '吃辣',
  '辣的',
  '辣味',
  '麻辣',
  '香辣',
  '川菜',
  '湘菜',
  '川湘',
  '串串',
  '不吃辣',
  '不要辣',
  '不辣',
  '少辣',
  '清淡',
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
    serviceCategory: segment.serviceCategory,
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
        'Schema: {"action":"qa|replace|add|rewrite|delete|confirm|service|clarify","targetSegmentId":"optional segment id","targetPhase":"activity|dining|drinks|leisure|transit optional","category":"optional dining|drinks|activity|hotel|movie|retail|wellness|ticket|other for service item search","query":"optional rewrite/search text","answer":"optional answer for qa","reason":"short reason"}. Use replace for dining preference changes such as spicy, Sichuan/Hunan, skewers, mild/no-spicy, quiet chat, family friendly, or business dinner when an existing meal segment should change. Use add when the user wants another stop inserted into the plan instead of replacing an existing stop. Use service when the user wants to choose a room type, movie ticket, package, or merchant service item for an existing segment. Use clarify only when action type or target cannot be determined.',
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
    .replace(/Bearer\s+(?!token\b)[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')
}



