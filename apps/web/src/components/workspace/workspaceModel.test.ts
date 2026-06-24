import { describe, expect, it } from 'vitest'
import { applyPlanCommand, attachPlanVariants, createPlanFromPrompt, createReplacementCandidates } from '@planpal/domain'
import type { AgentEvent } from '@planpal/domain'
import {
  addWorkspaceColumn,
  activePlanVariantSelectionFromAction,
  appendAssistantDeltaMessage,
  attachPendingActionToLatestPlanpalMessage,
  assistantDeltaFromAgentEvent,
  buildClearRouteChoiceCommand,
  buildRouteEstimates,
  buildCandidateCommand,
  buildCandidateRefreshCommand,
  buildDismissPendingActionCommand,
  buildPlanVariantCommand,
  buildRouteChoiceCommand,
  buildSegmentReorderCommand,
  buildSandboxOrderCommand,
  buildSelectServiceItemCommand,
  buildRemoveServiceItemCommand,
  buildUpdateServiceItemQuantityCommand,
  canSendAgentChat,
  chatMessageFromAgentEvent,
  chatMessageFromAgentFailure,
  chatMessageFromCommandError,
  chatMessageFromCommandResult,
  chatMessageFromPendingAction,
  compactUiText,
  deriveCandidateCardDisplay,
  deriveItineraryTicketDisplay,
  deriveMerchantReference,
  deriveMerchantOfferingDisplays,
  derivePlanExecutionBrief,
  derivePlanVariantCardDisplay,
  derivePlanReceiptDisplay,
  deriveVariantTicketDisplay,
  deriveAgentProgressItems,
  derivePlanSegmentDisplays,
  deriveRouteLegDisplay,
  deriveSelectedRouteModes,
  deriveWorkspaceDisplayItems,
  getAgentChatDisabledReason,
  getCandidateRefreshExcludeIds,
  getCandidateSelectionMode,
  getChatExecutionPathLabel,
  finalizeAssistantStreamingMessage,
  getClosedWorkspaceColumns,
  getDefaultWorkspaceLayout,
  getDefaultWorkspaceColumns,
  initialChatMessagesFromPlanEvents,
  lastAttachedActionMessageIndex,
  lastVariantSelectionMessageIndex,
  getSegmentActionState,
  getWorkspaceBoardStyle,
  moveWorkspaceColumn,
  normalizeWorkspaceColumns,
  normalizeWorkspaceLayout,
  openMerchantWorkspaceColumn,
  pendingActionFromAgentEvent,
  reconcileWorkspaceSelection,
  removeWorkspaceColumn,
  reorderSegmentsForCommand,
  shouldClearActiveRunForAgentEvent,
  shouldOpenChatForAgentEvent,
  shouldRefreshPlanForAgentEvent,
  shouldOpenChatForCommandResult,
  visiblePlanVariantSelectionFromState,
} from './workspaceModel'

describe('workspace model helpers', () => {
  it('builds a deterministic reorder command and applies the optimistic order', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const moved = plan.segments[2]!
    const anchor = plan.segments[0]!
    const command = buildSegmentReorderCommand(moved.id, anchor.id, 'BEFORE')

    expect(command).toEqual({
      type: 'REORDER_SEGMENT',
      source: 'puzzle',
      segmentId: moved.id,
      anchorSegmentId: anchor.id,
      position: 'BEFORE',
    })
    expect(reorderSegmentsForCommand(plan.segments, command)[0]?.id).toBe(moved.id)
  })

  it('disables direct puzzle mutations for locked segments', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const state = getSegmentActionState({ ...plan.segments[0]!, locked: true })

    expect(state.canReorder).toBe(false)
    expect(state.canDelete).toBe(false)
    expect(state.canReplace).toBe(false)
    expect(state.canRewrite).toBe(false)
  })

  it('chooses resume for agent-origin candidate actions and command otherwise', () => {
    const plan = createPlanFromPrompt('晚上两个人吃饭')
    const dining = plan.segments.find((segment) => segment.phase === 'dining')!
    const candidate = createReplacementCandidates(plan, dining.id)[0]!

    expect(getCandidateSelectionMode('run_123')).toBe('resume')
    expect(getCandidateSelectionMode(null)).toBe('command')
    expect(buildCandidateCommand('action_1', candidate)).toEqual({
      type: 'CHOOSE_CANDIDATE',
      source: 'action-card',
      actionId: 'action_1',
      candidateId: candidate.id,
    })
    expect(buildCandidateRefreshCommand({
      actionId: 'action_1',
      mode: 'replace',
      targetSegmentId: dining.id,
      excludeCandidateIds: [candidate.id],
      searchQuery: '安静一点',
    })).toEqual({
      type: 'REFRESH_CANDIDATES',
      source: 'action-card',
      actionId: 'action_1',
      mode: 'replace',
      targetSegmentId: dining.id,
      afterSegmentId: undefined,
      searchQuery: '安静一点',
      excludeCandidateIds: [candidate.id],
    })

    const action = applyPlanCommand(plan, {
      type: 'REPLACE_SEGMENT',
      source: 'puzzle',
      segmentId: dining.id,
      searchQuery: '近一点',
    }).plan.pendingAction
    if (action?.kind !== 'candidate-selection') throw new Error('expected candidate action')

    expect(getCandidateRefreshExcludeIds(action)).toEqual(action.candidates.map((item) => item.id))
    expect(getCandidateRefreshExcludeIds(action, '安静一点')).toEqual([])
    expect(buildDismissPendingActionCommand(action.id)).toEqual({
      type: 'DISMISS_PENDING_ACTION',
      source: 'action-card',
      actionId: action.id,
    })
  })

  it('builds variant selection commands and derives free-slot display items', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const variant = {
      id: 'variant_1',
      title: '轻松版',
      summary: '慢慢来',
      tags: ['轻松'],
      segments: plan.segments,
      score: 0.9,
      reasons: ['匹配'],
    }

    expect(buildPlanVariantCommand('action_1', variant)).toEqual({
      type: 'CHOOSE_PLAN_VARIANT',
      source: 'action-card',
      actionId: 'action_1',
      variantId: 'variant_1',
    })
    const items = deriveWorkspaceDisplayItems(plan.segments)
    expect(items.some((item) => item.kind === 'transit-summary')).toBe(true)
    expect(items.some((item) => item.kind === 'free-slot')).toBe(true)
  })

  it('requires BYOK config and non-empty draft for chat sends', () => {
    const config = {
      baseURL: 'https://api.example.com/v1',
      apiKey: 'sk-demo',
      model: 'demo',
    }

    expect(canSendAgentChat(null, '把晚饭换近一点')).toBe(false)
    expect(canSendAgentChat(config, '   ')).toBe(false)
    expect(canSendAgentChat(config, '把晚饭换近一点', true)).toBe(false)
    expect(canSendAgentChat(config, '把晚饭换近一点')).toBe(true)
  })

  it('explains chat disabled reasons and execution paths', () => {
    const config = {
      baseURL: 'https://api.example.com/v1',
      apiKey: 'sk-demo',
      model: 'demo',
    }

    expect(getAgentChatDisabledReason(null, '你好')).toBe('请先完整填写并保存模型配置')
    expect(canSendAgentChat({ ...config, apiKey: '' }, '你好')).toBe(false)
    expect(getAgentChatDisabledReason({ ...config, apiKey: '' }, '你好')).toBe('请先完整填写并保存模型配置')
    expect(getAgentChatDisabledReason(config, '')).toBe('请输入要发送给 Agent 的内容')
    expect(getAgentChatDisabledReason(config, '你好', true)).toBe('Agent 正在处理上一条消息')
    expect(getAgentChatDisabledReason(config, '你好')).toBe('')
    expect(getChatExecutionPathLabel(null, '你好')).toBe('离线 fallback')
    expect(getChatExecutionPathLabel(config, '你是什么模型')).toBe('模型回答')
    expect(getChatExecutionPathLabel(config, '把晚饭换近一点')).toBe('模型意图理解 + 确定性拼图命令')
    expect(getChatExecutionPathLabel(config, '中间再加个咖啡休息')).toBe('模型意图理解 + 确定性拼图命令')
  })

  it('keeps model error events out of chat bubbles and renders terminal agent results', () => {
    const baseEvent = {
      id: 'evt_1',
      runId: 'run_1',
      planId: 'plan_1',
      sequence: 1,
      createdAt: '2026-06-18T00:00:00.000Z',
    }

    expect(chatMessageFromAgentEvent({
      ...baseEvent,
      type: 'agent.model.error',
      message: '模型调用失败：HTTP 404',
    })).toBeNull()
    expect(chatMessageFromAgentEvent({
      ...baseEvent,
      id: 'evt_error',
      sequence: 2,
      type: 'agent.error',
      message: 'Candidate action is no longer active',
    })).toEqual({
      role: 'planpal',
      content: 'Agent 运行失败：Candidate action is no longer active',
    })
    expect(shouldOpenChatForAgentEvent({
      ...baseEvent,
      id: 'evt_error',
      sequence: 2,
      type: 'agent.error',
      message: 'Candidate action is no longer active',
    })).toBe(true)
    expect(chatMessageFromAgentEvent({
      ...baseEvent,
      id: 'evt_2',
      sequence: 3,
      type: 'agent.finished',
      message: '模型调用失败，已切换离线 fallback：我可以解释当前安排。',
    })).toEqual({
      role: 'planpal',
      content: '模型调用失败，已切换离线 fallback：我可以解释当前安排。',
    })
    expect(shouldOpenChatForAgentEvent({
      ...baseEvent,
      id: 'evt_2',
      sequence: 3,
      type: 'agent.finished',
      message: '模型调用失败，已切换离线 fallback：我可以解释当前安排。',
    })).toBe(true)
    expect(shouldOpenChatForAgentEvent({
      ...baseEvent,
      type: 'agent.model.error',
      message: '模型调用失败：HTTP 404',
    })).toBe(false)
  })




  it('derives execution readiness and merchant references from plan data', () => {
    const plan = createPlanFromPrompt('明天下雨，2 个人下午到晚上约会，室内优先，晚饭别排队')
    const brief = derivePlanExecutionBrief(plan)

    expect(brief.complexityLabel).toBe('标准多节点任务')
    expect(brief.nodeCountLabel).toBe('3 个执行节点')
    expect(brief.canConfirm).toBe(true)
    expect(brief.checks.map((check) => check.id)).toContain('route-reference')

    const withPending = attachPlanVariants(plan)
    const pendingBrief = derivePlanExecutionBrief(withPending)
    expect(pendingBrief.canConfirm).toBe(false)
    expect(pendingBrief.confirmBlockedReason).toContain('先处理待办')

    const dining = derivePlanSegmentDisplays(plan.segments).find((display) => display.phase === 'dining')!
    const reference = deriveMerchantReference(dining)
    expect(reference.tags).toContain('用餐')
    expect(reference.constraints.length).toBeGreaterThan(0)
    expect(reference.address).toContain('坐标')
    expect(reference.contact).toContain('虚构电话')
    expect(reference.sourceLabel).toBe('fictional-local-mock-v2')
    expect(reference.mockItems.length).toBeGreaterThan(0)
  })

  it('derives merchant offering displays and service item commands', () => {
    const plan = createPlanFromPrompt('晚上两个人看电影')
    const movieSegment = {
      ...plan.segments[0]!,
      id: 'seg_movie_web',
      phase: 'activity' as const,
      serviceCategory: 'movie' as const,
      poiId: 'poi_orbit_cinema',
      place: '轨道影厅',
      title: '电影场次',
    }
    const withMovie = { ...plan, segments: [movieSegment, ...plan.segments.slice(1)] }
    const displays = derivePlanSegmentDisplays(withMovie.segments, [])
    const offerings = deriveMerchantOfferingDisplays(displays[0]!, [])

    expect(displays[0]?.serviceCategory).toBe('movie')
    expect(deriveItineraryTicketDisplay(displays[0]!, 0).phaseLabel).toBe('电影')
    expect(offerings).toHaveLength(3)
    expect(offerings[0]).toMatchObject({
      category: 'movie',
      categoryLabel: '电影',
      selected: false,
    })

    const selectCommand = buildSelectServiceItemCommand({
      segmentId: movieSegment.id,
      merchantId: offerings[0]!.merchantId,
      offeringId: offerings[0]!.id,
      quantity: 2,
    })
    expect(selectCommand).toEqual({
      type: 'SELECT_SERVICE_ITEM',
      source: 'action-card',
      segmentId: movieSegment.id,
      merchantId: offerings[0]!.merchantId,
      offeringId: offerings[0]!.id,
      quantity: 2,
    })
    const selected = applyPlanCommand(withMovie, selectCommand).plan
    const selectedDisplays = derivePlanSegmentDisplays(selected.segments, selected.serviceSelections)
    const selectedOfferings = deriveMerchantOfferingDisplays(selectedDisplays[0]!, selected.serviceSelections)
    expect(selectedDisplays[0]?.serviceSelectionCount).toBe(1)
    expect(selectedOfferings[0]?.selected).toBe(true)
    expect(buildUpdateServiceItemQuantityCommand(selected.serviceSelections![0]!.id, 3)).toMatchObject({
      type: 'UPDATE_SERVICE_ITEM_QUANTITY',
      quantity: 3,
    })
    expect(buildRemoveServiceItemCommand(selected.serviceSelections![0]!.id)).toMatchObject({
      type: 'REMOVE_SERVICE_ITEM',
      selectionId: selected.serviceSelections![0]!.id,
    })
  })

  it('derives explainable action-card display text without changing domain payloads', () => {
    const plan = attachPlanVariants(createPlanFromPrompt('下午两个人附近轻松玩'))
    const variantAction = plan.pendingAction!
    if (variantAction.kind !== 'plan-variant-selection') throw new Error('expected variants')
    const variantDisplay = derivePlanVariantCardDisplay(variantAction.variants[0]!)

    expect(variantDisplay.badges).toContain('匹配 94%')
    expect(variantDisplay.badges).toContain('4 个节点')
    expect(variantDisplay.reasons.length).toBeGreaterThan(0)
    expect(variantDisplay.timeline[0]).toContain('小型展览')
    expect(variantDisplay.writeLabel).toBe('选中后写入拼图主轴')

    const initialTicket = deriveVariantTicketDisplay(plan.variantSelection!)
    expect(initialTicket.expandedByDefault).toBe(true)
    expect(initialTicket.alternateCount).toBe(3)
    expect(initialTicket.title).toBe('选择一个方案方向')
    expect(initialTicket.variants).toHaveLength(3)
    expect(initialTicket.variants[0]).toMatchObject({
      active: false,
      id: variantAction.variants[0]!.id,
      title: variantDisplay.title,
    })

    const selectedPlan = applyPlanCommand(plan, buildPlanVariantCommand(variantAction.id, variantAction.variants[0]!)).plan
    const selectedTicket = deriveVariantTicketDisplay(selectedPlan.variantSelection!)
    expect(selectedTicket.expandedByDefault).toBe(false)
    expect(selectedTicket.alternateCount).toBe(2)
    expect(selectedTicket.title).toBe(`当前：${variantAction.variants[0]!.title}`)
    expect(selectedTicket.variants[0]?.active).toBe(true)

    const dining = plan.segments.find((segment) => segment.phase === 'dining')!
    const candidateAction = applyPlanCommand(plan, {
      type: 'REPLACE_SEGMENT',
      source: 'puzzle',
      segmentId: dining.id,
      searchQuery: '近一点',
    }).plan.pendingAction
    if (candidateAction?.kind !== 'candidate-selection') throw new Error('expected candidate action')
    const candidateDisplay = deriveCandidateCardDisplay(candidateAction, candidateAction.candidates[0]!, plan)

    expect(candidateDisplay.badges.some((badge) => badge.startsWith('匹配 '))).toBe(true)
    expect(candidateDisplay.badges).toContain('用餐')
    expect(candidateDisplay.badges).toContain('Mock POI')
    expect(candidateDisplay.title.length).toBeGreaterThan(2)
    expect(candidateDisplay.title).not.toBe('风味餐厅')
    expect(candidateDisplay.subtitle).toBe(candidateAction.candidates[0]!.segment.title)
    expect(candidateDisplay.placementLabel).toBe(`替换「${dining.title}」`)
    expect(candidateDisplay.writeLabel).toBe('选中后替换当前节点')
    expect(candidateDisplay.reasons).toContain('匹配近距离偏好')

    const after = plan.segments[0]!
    const addAction = applyPlanCommand(plan, {
      type: 'REFRESH_CANDIDATES',
      source: 'puzzle',
      mode: 'add-after',
      afterSegmentId: after.id,
    }).plan.pendingAction
    if (addAction?.kind !== 'candidate-selection') throw new Error('expected add-after candidate action')
    const addDisplay = deriveCandidateCardDisplay(addAction, addAction.candidates[0]!, plan)

    expect(addDisplay.placementLabel).toBe(`插入在「${after.title}」之后、「${dining.title}」之前`)
    expect(addDisplay.badges).toContain('16:00-17:00')
    expect(addDisplay.writeLabel).toBe('选中后新增到这个空档')
  })
  it('derives readable progress items from the latest agent run only', () => {
    const baseEvent = {
      planId: 'plan_1',
      createdAt: '2026-06-18T00:00:00.000Z',
    }
    const events: AgentEvent[] = [
      {
        ...baseEvent,
        id: 'evt_old',
        runId: 'run_old',
        sequence: 1,
        type: 'agent.model.started',
        message: 'Calling old model',
        payload: { phase: 'answer' },
      },
      {
        ...baseEvent,
        id: 'evt_1',
        runId: 'run_new',
        sequence: 1,
        type: 'agent.started',
        message: 'Agent run started',
      },
      {
        ...baseEvent,
        id: 'evt_2',
        runId: 'run_new',
        sequence: 2,
        type: 'agent.model.started',
        message: 'Calling model for intent interpretation',
        payload: { phase: 'intent' },
      },
      {
        ...baseEvent,
        id: 'evt_3',
        runId: 'run_new',
        sequence: 3,
        type: 'tool.called',
        message: 'Searching replacement candidates',
      },
      {
        ...baseEvent,
        id: 'evt_4',
        runId: 'run_new',
        sequence: 4,
        type: 'action.required',
        message: 'Choose an option',
      },
    ]

    expect(deriveAgentProgressItems(events)).toEqual([
      {
        id: 'evt_1',
        label: '接收请求',
        detail: '整理当前计划和选中节点上下文',
        state: 'done',
      },
      {
        id: 'evt_2',
        label: '理解意图',
        detail: 'Calling model for intent interpretation',
        state: 'active',
      },
      {
        id: 'evt_3',
        label: '查找候选',
        detail: 'Searching replacement candidates',
        state: 'active',
      },
      {
        id: 'evt_4',
        label: '等待选择',
        detail: 'Choose an option',
        state: 'active',
      },
    ])
  })
  it('merges streamed answer deltas into one temporary chat bubble', () => {
    const baseEvent = {
      id: 'evt_delta',
      runId: 'run_1',
      planId: 'plan_1',
      sequence: 1,
      createdAt: '2026-06-18T00:00:00.000Z',
      type: 'agent.message.delta' as const,
      message: '我是',
      payload: { delta: '我是' },
    }

    expect(assistantDeltaFromAgentEvent(baseEvent)).toBe('我是')
    const first = appendAssistantDeltaMessage([], '我是')
    expect(first).toEqual([{ role: 'planpal', content: '我是', streaming: true }])
    const second = appendAssistantDeltaMessage(first, ' demo-chat')
    expect(second).toEqual([{ role: 'planpal', content: '我是 demo-chat', streaming: true }])
    expect(finalizeAssistantStreamingMessage(second, '我是 demo-chat。')).toEqual([
      { role: 'planpal', content: '我是 demo-chat。' },
    ])
    expect(shouldOpenChatForAgentEvent(baseEvent)).toBe(true)
  })
  it('turns transport-level agent failures into redacted chat receipts', () => {
    const runMessage = chatMessageFromAgentFailure(
      'run',
      new Error('Fetch failed with sk-secret-for-test and Bearer abc.def'),
    ).content
    const resumeMessage = chatMessageFromAgentFailure(
      'resume',
      new Error('Resume failed with Bearer retry.token'),
    ).content

    expect(runMessage).toContain('Agent 调用失败')
    expect(runMessage).not.toContain('sk-secret-for-test')
    expect(runMessage).not.toContain('Bearer abc.def')
    expect(runMessage).toContain('[redacted]')
    expect(runMessage).toContain('Bearer [redacted]')
    expect(resumeMessage).toBe('Agent 继续执行失败：Resume failed with Bearer [redacted]')
  })

  it('classifies streaming events for run cleanup and plan refresh', () => {
    const baseEvent = {
      id: 'evt_1',
      runId: 'run_1',
      planId: 'plan_1',
      sequence: 1,
      createdAt: '2026-06-18T00:00:00.000Z',
      message: 'event',
    }

    expect(shouldClearActiveRunForAgentEvent({ ...baseEvent, type: 'action.required' })).toBe(false)
    expect(shouldRefreshPlanForAgentEvent({ ...baseEvent, type: 'action.required' })).toBe(true)
    expect(shouldClearActiveRunForAgentEvent({ ...baseEvent, type: 'plan.updated' })).toBe(true)
    expect(shouldRefreshPlanForAgentEvent({ ...baseEvent, type: 'plan.updated' })).toBe(true)
    expect(shouldClearActiveRunForAgentEvent({ ...baseEvent, type: 'agent.finished' })).toBe(true)
    expect(shouldRefreshPlanForAgentEvent({ ...baseEvent, type: 'agent.finished' })).toBe(false)
    expect(shouldClearActiveRunForAgentEvent({ ...baseEvent, type: 'agent.error' })).toBe(true)
    expect(shouldRefreshPlanForAgentEvent({ ...baseEvent, type: 'agent.error' })).toBe(true)
    expect(shouldClearActiveRunForAgentEvent({ ...baseEvent, type: 'agent.model.error' })).toBe(false)
    expect(shouldRefreshPlanForAgentEvent({ ...baseEvent, type: 'agent.model.error' })).toBe(false)
  })

  it('extracts streamed pending actions for immediate chat display', () => {
    const plan = createPlanFromPrompt('晚上两个人吃饭')
    const dining = plan.segments.find((segment) => segment.phase === 'dining')!
    const action = applyPlanCommand(plan, {
      type: 'REPLACE_SEGMENT',
      source: 'agent',
      segmentId: dining.id,
      searchQuery: '近一点',
    }).plan.pendingAction
    if (action?.kind !== 'candidate-selection') throw new Error('expected candidate action')
    const eventBase = {
      id: 'evt_1',
      runId: 'run_1',
      planId: plan.id,
      sequence: 1,
      createdAt: '2026-06-18T00:00:00.000Z',
      message: 'Choose an option',
    }

    const actionEvent = {
      ...eventBase,
      type: 'action.required' as const,
      payload: { action },
    }

    expect(pendingActionFromAgentEvent(actionEvent)).toBe(action)
    expect(shouldOpenChatForAgentEvent(actionEvent)).toBe(true)
    expect(pendingActionFromAgentEvent({
      ...eventBase,
      type: 'action.required',
      payload: { action: { kind: 'candidate-selection' } },
    })).toBeUndefined()
    expect(shouldOpenChatForAgentEvent({ ...eventBase, type: 'agent.finished' })).toBe(true)
  })

  it('anchors active decision tickets to the message that created them', () => {
    const plan = createPlanFromPrompt('晚上两个人吃饭')
    const dining = plan.segments.find((segment) => segment.phase === 'dining')!
    const action = applyPlanCommand(plan, {
      type: 'REPLACE_SEGMENT',
      source: 'agent',
      segmentId: dining.id,
      searchQuery: '近一点',
    }).plan.pendingAction
    if (action?.kind !== 'candidate-selection') throw new Error('expected candidate action')

    const anchored = attachPendingActionToLatestPlanpalMessage([
      { role: 'user', content: '把晚饭换近一点' },
      { role: 'planpal', content: '我找到几个更近的选择。' },
    ], action)

    expect(anchored).toHaveLength(2)
    expect(anchored[1]?.action).toBe(action)
    expect(lastAttachedActionMessageIndex(anchored, action)).toBe(1)
    expect(chatMessageFromPendingAction(action)).toMatchObject({
      role: 'planpal',
      receipt: true,
      action,
    })

    const appended = attachPendingActionToLatestPlanpalMessage([
      { role: 'planpal', content: '上一轮回答' },
      { role: 'user', content: '直接换一批' },
    ], action)
    expect(appended).toHaveLength(3)
    expect(appended[1]?.role).toBe('user')
    expect(appended[2]).toMatchObject({
      role: 'planpal',
      receipt: true,
      action,
    })

    const planWithVariants = attachPlanVariants(createPlanFromPrompt('下午两个人附近轻松玩'))
    const variantAction = planWithVariants.pendingAction
    if (variantAction?.kind !== 'plan-variant-selection') throw new Error('expected variant action')
    const selectedPlan = applyPlanCommand(
      planWithVariants,
      buildPlanVariantCommand(variantAction.id, variantAction.variants[0]!),
    ).plan

    expect(activePlanVariantSelectionFromAction(variantAction, planWithVariants.variantSelection)).toMatchObject({
      actionId: variantAction.id,
    })
    expect(activePlanVariantSelectionFromAction(undefined, selectedPlan.variantSelection)).toBeUndefined()
    const visiblePendingVariant = visiblePlanVariantSelectionFromState(variantAction, planWithVariants.variantSelection)
    expect(visiblePendingVariant).toMatchObject({
      actionId: variantAction.id,
    })
    expect(visiblePendingVariant?.selectedVariantId).toBeUndefined()
    expect(visiblePlanVariantSelectionFromState(undefined, selectedPlan.variantSelection)).toMatchObject({
      actionId: variantAction.id,
      selectedVariantId: variantAction.variants[0]!.id,
    })
    expect(deriveVariantTicketDisplay(selectedPlan.variantSelection!)).toMatchObject({
      expandedByDefault: false,
      selectedVariantId: variantAction.variants[0]!.id,
      title: `当前：${variantAction.variants[0]!.title}`,
    })

    const variantAnchored = attachPendingActionToLatestPlanpalMessage([
      { role: 'user', content: '给我三个方向' },
      { role: 'planpal', content: '我准备了三个方向。' },
    ], variantAction)
    expect(lastVariantSelectionMessageIndex(variantAnchored, selectedPlan.variantSelection)).toBe(1)
  })

  it('keeps generated plan variant receipts out of the chat thread', () => {
    const plan = attachPlanVariants(createPlanFromPrompt('下午两个人附近轻松玩'))
    const eventBase = {
      id: 'evt_1',
      runId: 'run_1',
      planId: plan.id,
      sequence: 1,
      createdAt: '2026-06-18T00:00:00.000Z',
    } satisfies Omit<AgentEvent, 'type' | 'message' | 'payload'>

    expect(initialChatMessagesFromPlanEvents(plan, [{
      ...eventBase,
      type: 'agent.finished',
      message: 'created',
      payload: { usedModel: true, fallbackUsed: false },
    }])).toEqual([])

    expect(initialChatMessagesFromPlanEvents(plan, [{
      ...eventBase,
      type: 'agent.model.error',
      message: '模型调用失败：HTTP 404',
    }])).toEqual([])
  })


  it('derives a confirmed itinerary receipt without implying real booking', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    expect(buildSandboxOrderCommand()).toEqual({
      type: 'CREATE_SANDBOX_ORDER',
      source: 'puzzle',
    })
    const confirmed = applyPlanCommand(plan, buildSandboxOrderCommand()).plan
    const receipt = derivePlanReceiptDisplay(confirmed)

    expect(receipt.statusLabel).toBe('模拟确认')
    expect(receipt.versionLabel).toBe(`Version ${confirmed.currentVersion}`)
    expect(receipt.receiptId).toBe(confirmed.sandboxOrder?.receiptId)
    expect(receipt.totalEstimateLabel).toContain('CNY')
    expect(receipt.itemLines.length).toBeGreaterThan(0)
    expect(receipt.segments).toHaveLength(confirmed.segments.filter((segment) => !segment.isTransit).length)
    expect(receipt.segments[0]).toMatchObject({
      index: 1,
      place: confirmed.segments[0]?.place,
      time: '14:00-16:00',
      title: confirmed.segments[0]?.title,
    })
    expect(receipt.text).toContain('PlanPal Sandbox 模拟确认单')
    expect(receipt.text).toContain('不代表真实预订')
    expect(receipt.text).not.toContain('预订成功')
    expect(receipt.text).not.toContain('支付成功')
  })
  it('turns deterministic command results into short chat receipts', () => {
    const planWithVariants = attachPlanVariants(createPlanFromPrompt('下午两个人附近轻松玩'))
    const variantAction = planWithVariants.pendingAction!
    if (variantAction.kind !== 'plan-variant-selection') throw new Error('expected variants')
    const variantCommand = buildPlanVariantCommand(variantAction.id, variantAction.variants[0]!)
    const variantResult = applyPlanCommand(planWithVariants, variantCommand)

    expect(chatMessageFromCommandResult(variantCommand, variantResult)).toEqual({
      role: 'planpal',
      content: `V${variantResult.version} · 方案已应用`,
      receipt: true,
    })
    expect(shouldOpenChatForCommandResult(variantCommand, variantResult)).toBe(false)

    const dining = variantResult.plan.segments.find((segment) => segment.phase === 'dining')!
    const candidateCommand = {
      type: 'REPLACE_SEGMENT',
      source: 'puzzle',
      segmentId: dining.id,
      searchQuery: '近一点',
    } as const
    const candidateResult = applyPlanCommand(variantResult.plan, candidateCommand)

    expect(chatMessageFromCommandResult(candidateCommand, candidateResult)?.content).toContain('3 个候选')
    expect(shouldOpenChatForCommandResult(candidateCommand, candidateResult)).toBe(true)
  })

  it('turns deterministic command failures into redacted chat receipts', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const dining = plan.segments.find((segment) => segment.phase === 'dining')!
    const command = {
      type: 'CHOOSE_CANDIDATE',
      source: 'action-card',
      actionId: 'action_1',
      candidateId: 'candidate_1',
    } as const

    expect(chatMessageFromCommandError(command, new Error('Candidate action is no longer active'))).toEqual({
      role: 'planpal',
      content: '候选应用失败：Candidate action is no longer active',
    })

    const message = chatMessageFromCommandError({
      type: 'REPLACE_SEGMENT',
      source: 'puzzle',
      segmentId: dining.id,
      searchQuery: '近一点',
    }, new Error('Provider rejected sk-secret-for-test with Bearer abc.def')).content

    expect(message).toContain('候选生成失败')
    expect(message).not.toContain('sk-secret-for-test')
    expect(message).not.toContain('Bearer abc.def')
    expect(message).toContain('[redacted]')
    expect(message).toContain('Bearer [redacted]')
  })

  it('keeps the workspace board on equal-width column tracks', () => {
    expect(getWorkspaceBoardStyle(3)).toEqual({
      '--workspace-board-width': 'min(1680px, calc(100% - 108px))',
      '--workspace-column-count': '3',
    })
    expect(getWorkspaceBoardStyle(6)).toEqual({
      '--workspace-board-width': 'min(2400px, calc(100% - 108px))',
      '--workspace-column-count': '6',
    })
  })

  it('defaults to the old-style chat and puzzle workspace and tracks closed columns', () => {
    const columns = getDefaultWorkspaceColumns()

    expect(columns).toEqual(['chat', 'puzzle'])
    expect(getClosedWorkspaceColumns(columns)).toEqual(['merchant', 'details', 'map', 'trace'])
    expect(addWorkspaceColumn(columns, 'map')).toEqual(['chat', 'puzzle', 'map'])
    expect(addWorkspaceColumn(['chat', 'puzzle', 'map'], 'map')).toEqual(['chat', 'puzzle', 'map'])
  })

  it('normalizes persisted workspace layouts without letting puzzle disappear', () => {
    expect(getDefaultWorkspaceLayout()).toEqual({
      activeMobileColumn: 'puzzle',
      columns: ['chat', 'puzzle'],
    })
    expect(normalizeWorkspaceColumns(['trace', 'map', 'trace', 'legacy', 'chat'])).toEqual([
      'trace',
      'map',
      'chat',
      'puzzle',
    ])
    expect(normalizeWorkspaceLayout({
      activeMobileColumn: 'map',
      columns: ['chat', 'map', 'trace'],
      selectedRouteModes: {
        'seg_1->seg_2': 'taxi',
        'seg_2->seg_3': 'spaceship',
      },
    })).toEqual({
      activeMobileColumn: 'map',
      columns: ['chat', 'puzzle', 'map', 'trace'],
    })
    expect(normalizeWorkspaceLayout({
      activeMobileColumn: 'merchant',
      columns: ['chat', 'puzzle'],
    }).activeMobileColumn).toBe('puzzle')
  })

  it('keeps puzzle mandatory and opens merchant after puzzle', () => {
    expect(removeWorkspaceColumn(['chat', 'puzzle', 'map'], 'puzzle')).toEqual(['chat', 'puzzle', 'map'])
    expect(removeWorkspaceColumn(['chat', 'puzzle', 'map'], 'map')).toEqual(['chat', 'puzzle'])
    expect(openMerchantWorkspaceColumn(['chat', 'puzzle', 'trace'])).toEqual(['chat', 'puzzle', 'merchant', 'trace'])
    expect(openMerchantWorkspaceColumn(['chat', 'puzzle', 'merchant'])).toEqual(['chat', 'puzzle', 'merchant'])
  })

  it('moves workspace columns without changing column identity', () => {
    expect(moveWorkspaceColumn(['chat', 'puzzle', 'merchant', 'trace'], 'trace', 'puzzle')).toEqual([
      'chat',
      'trace',
      'puzzle',
      'merchant',
    ])
  })

  it('derives web-only segment display data without requiring legacy node fields', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const displays = derivePlanSegmentDisplays(plan.segments)

    expect(displays[0]).toMatchObject({
      id: plan.segments[0]!.id,
      segmentId: plan.segments[0]!.id,
      time: '14:00-16:00',
      place: plan.segments[0]!.place,
      reason: plan.segments[0]!.reason,
      poiId: plan.segments[0]!.poiId,
      locked: false,
      isTransit: false,
    })
  })

  it('derives compact itinerary tickets and route leg labels for column cards', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const first = {
      ...plan.segments[0]!,
      reason: '这个安排适合作为低压力开场，位置靠近后续动线，并且天气变化时也比较容易替换，不会把整条计划拖乱。'.repeat(3),
    }
    const ticket = deriveItineraryTicketDisplay(first, 0)

    expect(ticket).toMatchObject({
      indexLabel: '01',
      phaseLabel: '活动',
      primaryActionLabel: '换一个',
      time: '14:00-16:00',
      title: first.title,
    })
    expect(ticket.chips).toContain('活动')
    expect(ticket.chips).toContain(`${first.durationMinutes} 分钟`)
    expect(ticket.reason.endsWith('…')).toBe(true)

    const lockedTicket = deriveItineraryTicketDisplay({ ...first, locked: true }, 1)
    expect(lockedTicket.lockLabel).toBe('已锁定')
    expect(lockedTicket.primaryActionLabel).toBe('查看地点')

    expect(compactUiText('一二三四五六七八九十', 5)).toBe('一二三四…')

    const routes = buildRouteEstimates(derivePlanSegmentDisplays(plan.segments))
    const route = routes[0]!
    expect(deriveRouteLegDisplay(route).statusLabel).toBe('推荐 · Mock')
    expect(deriveRouteLegDisplay(route).sourceLabel).toBe('mock-route estimated')
    expect(deriveRouteLegDisplay(route, { [route.id]: 'taxi' })).toMatchObject({
      modeLabel: '打车',
      statusLabel: '已选 · Mock',
    })
  })

  it('clears stale selected segment ids while keeping still-valid selected places', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const selected = plan.segments[0]!

    expect(reconcileWorkspaceSelection(plan.segments, selected.id, selected.place)).toEqual({
      selectedSegmentId: selected.id,
      selectedPlace: selected.place,
    })
    expect(reconcileWorkspaceSelection(plan.segments, 'seg_missing', selected.place)).toEqual({
      selectedSegmentId: undefined,
      selectedPlace: selected.place,
    })
    expect(reconcileWorkspaceSelection(plan.segments, selected.id, '不存在地点')).toEqual({
      selectedSegmentId: selected.id,
      selectedPlace: null,
    })
  })

  it('builds local route estimates from segment coordinates only', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const routes = buildRouteEstimates(derivePlanSegmentDisplays(plan.segments))
    const firstRoute = routes[0]!

    expect(routes).toHaveLength(2)
    expect(firstRoute.id).toBe(`${plan.segments[0]!.id}->${plan.segments[1]!.id}`)
    expect(firstRoute.options.map((option) => option.mode)).toEqual(['walk', 'transit', 'taxi'])
    expect(firstRoute.distanceKm).toBeGreaterThan(0)
    expect(buildRouteChoiceCommand(firstRoute, 'taxi')).toEqual({
      type: 'SET_ROUTE_CHOICE',
      source: 'puzzle',
      fromSegmentId: plan.segments[0]!.id,
      toSegmentId: plan.segments[1]!.id,
      mode: 'taxi',
    })
    expect(buildClearRouteChoiceCommand(firstRoute)).toEqual({
      type: 'CLEAR_ROUTE_CHOICE',
      source: 'puzzle',
      fromSegmentId: plan.segments[0]!.id,
      toSegmentId: plan.segments[1]!.id,
    })

    const withChoice = applyPlanCommand(plan, buildRouteChoiceCommand(firstRoute, 'taxi')).plan
    expect(deriveSelectedRouteModes(withChoice)).toEqual({
      [firstRoute.id]: 'taxi',
    })
    const cleared = applyPlanCommand(withChoice, buildClearRouteChoiceCommand(firstRoute)).plan
    expect(deriveSelectedRouteModes(cleared)).toEqual({})
  })
})









