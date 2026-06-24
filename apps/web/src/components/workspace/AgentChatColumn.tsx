import { Button, Card, Icon, Input } from 'animal-island-ui'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { CandidateOption, MerchantOffering, PendingAction, Plan, PlanVariantOption, PlanVariantSelection } from '@planpal/domain'
import { appClasses } from '../../lib/appClasses'
import type { StoredModelConfig } from '../../lib/modelConfig'
import { agentChatClasses } from './agentChatClasses'
import { chipClassName, workspacePrimitives } from './workspacePrimitives'
import {
  activePlanVariantSelectionFromAction,
  deriveCandidateCardDisplay,
  deriveVariantTicketDisplay,
  getAgentChatDisabledReason,
  getChatExecutionPathLabel,
  lastAttachedActionMessageIndex,
  lastVariantSelectionMessageIndex,
  visiblePlanVariantSelectionFromState,
  type AgentProgressItem,
  type ChatMessage,
} from './workspaceModel'

type AgentChatColumnProps = {
  canSend: boolean
  commandBusy: boolean
  config: StoredModelConfig | null
  draft: string
  isStreaming: boolean
  messages: ChatMessage[]
  pendingAction?: PendingAction
  plan: Plan
  progressItems: AgentProgressItem[]
  selectedSegmentId?: string
  variantSelection?: PlanVariantSelection
  onCandidateSelect: (actionId: string, candidate: CandidateOption) => void
  onCandidateRefresh: (action: Extract<PendingAction, { kind: 'candidate-selection' }>, searchQuery?: string) => void
  onChatContextChange: (segmentId?: string) => void
  onCommandConfirm: (action: Extract<PendingAction, { kind: 'command-confirmation' }>, confirmed: boolean) => void
  onDraftChange: (draft: string) => void
  onPendingActionDismiss: (actionId: string) => void
  onSend: () => void
  onServiceOfferingSelect: (action: Extract<PendingAction, { kind: 'service-item-selection' }>, offering: MerchantOffering, quantity: number) => void
  onUndo?: (version: number) => void
  onVariantSelect: (actionId: string, variant: PlanVariantOption) => void
}

export function AgentChatColumn({
  canSend,
  commandBusy,
  config,
  draft,
  isStreaming,
  messages,
  pendingAction,
  plan,
  progressItems,
  selectedSegmentId,
  variantSelection,
  onCandidateSelect,
  onCandidateRefresh,
  onChatContextChange,
  onCommandConfirm,
  onDraftChange,
  onPendingActionDismiss,
  onSend,
  onServiceOfferingSelect,
  onUndo,
  onVariantSelect,
}: AgentChatColumnProps) {
  const [candidateRequirement, setCandidateRequirement] = useState('')
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const executableSegments = plan.segments.filter((segment) => !segment.isTransit)
  const selectedSegment = selectedSegmentId
    ? executableSegments.find((segment) => segment.id === selectedSegmentId)
    : undefined
  const disabledReason = getAgentChatDisabledReason(config, draft, isStreaming)
  const pathLabel = getChatExecutionPathLabel(config, draft)
  const contextLabel = selectedSegment ? selectedSegment.title : '全局计划'
  const visibleVariantSelection = visiblePlanVariantSelectionFromState(
    pendingAction?.kind === 'plan-variant-selection' || !pendingAction ? pendingAction : undefined,
    variantSelection,
  )
  const attachedActionIndex = pendingAction?.kind && pendingAction.kind !== 'plan-variant-selection'
    ? lastAttachedActionMessageIndex(messages, pendingAction)
    : -1
  const attachedVariantIndex = lastVariantSelectionMessageIndex(messages, visibleVariantSelection)
  const topPendingAction = pendingAction && pendingAction.kind !== 'plan-variant-selection' && attachedActionIndex < 0
    ? pendingAction
    : undefined
  const topVariantSelection = visibleVariantSelection && attachedVariantIndex < 0
    ? visibleVariantSelection
    : undefined
  const statusLabel = pendingAction ? '等待选择' : isStreaming ? '处理中' : '可对话'

  useEffect(() => {
    if (pendingAction?.kind === 'candidate-selection') setCandidateRequirement('')
  }, [pendingAction?.id, pendingAction?.kind])

  useEffect(() => {
    if (typeof document === 'undefined') return
    function handleClickOutside(event: MouseEvent) {
      if (!contextMenuOpen) return
      if (contextMenuRef.current?.contains(event.target as Node)) return
      setContextMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenuOpen])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing && canSend) {
      onSend()
    }
  }

  function selectContext(segmentId?: string) {
    onChatContextChange(segmentId)
    setContextMenuOpen(false)
  }

  function renderPendingActionTicket(action: PendingAction) {
    if (action.kind === 'plan-variant-selection') {
      const selection = activePlanVariantSelectionFromAction(action, variantSelection)
      if (!selection) return null
      return renderVariantSelectionTicket(selection)
    }
    if (action.kind === 'candidate-selection') {
      return (
        <CandidateDecisionTicket
          action={action}
          busy={isStreaming || commandBusy}
          candidateRequirement={candidateRequirement}
          plan={plan}
          onCandidateRequirementChange={setCandidateRequirement}
          onCandidateDismiss={onPendingActionDismiss}
          onCandidateRefresh={onCandidateRefresh}
          onCandidateSelect={onCandidateSelect}
        />
      )
    }
    if (action.kind === 'service-item-selection') {
      return (
        <ServiceItemDecisionTicket
          action={action}
          busy={isStreaming || commandBusy}
          plan={plan}
          onDismiss={onPendingActionDismiss}
          onServiceOfferingSelect={onServiceOfferingSelect}
        />
      )
    }
    if (action.kind === 'clarification') {
      return (
        <ClarificationTicket
          action={action}
          busy={isStreaming || commandBusy}
          onDismiss={onPendingActionDismiss}
        />
      )
    }
    if (action.kind === 'command-confirmation') {
      return (
        <CommandConfirmationTicket
          action={action}
          busy={isStreaming || commandBusy}
          onConfirm={onCommandConfirm}
        />
      )
    }
    return null
  }

  function renderVariantSelectionTicket(selection: PlanVariantSelection) {
    const canDismiss = pendingAction?.kind === 'plan-variant-selection'
      && pendingAction.id === selection.actionId
      && !selection.selectedVariantId
    return (
      <VariantDecisionTicket
        busy={isStreaming || commandBusy}
        selection={selection}
        onDismiss={canDismiss ? onPendingActionDismiss : undefined}
        onVariantSelect={onVariantSelect}
      />
    )
  }

  return (
    <div className={agentChatClasses.root}>
      <div className={agentChatClasses.scroll}>
        <section className={agentChatClasses.statusStrip} aria-label="Agent 状态">
          <div className={agentChatClasses.statusMain}>
            <span className={agentChatClasses.statusIcon} aria-hidden="true">
              <Icon name="icon-chat" size={22} bounce />
            </span>
            <div>
              <span className={appClasses.eyebrow}>PlanPal Agent</span>
              <strong className={agentChatClasses.statusTitle}>{config ? `已连接 ${config.model}` : '需要模型配置'}</strong>
              <small className={agentChatClasses.statusMeta}>当前上下文：{contextLabel}</small>
            </div>
          </div>
          <div className={agentChatClasses.statusChips}>
            <span className={agentChatClasses.statusChip(true)}>{statusLabel}</span>
            <span className={agentChatClasses.statusChip()}>{pathLabel}</span>
            {config?.resolvedBaseURL && <span className={agentChatClasses.statusChip()} title={`已验证端点：${config.resolvedBaseURL}`}>端点已验证</span>}
          </div>
        </section>

        {(topPendingAction || topVariantSelection) && (
          <div className={agentChatClasses.pendingDock}>
            <span className={agentChatClasses.pendingDockLabel}>
              {topVariantSelection?.selectedVariantId ? '当前方案' : '待处理决策'}
            </span>
            {topVariantSelection ? renderVariantSelectionTicket(topVariantSelection) : topPendingAction ? renderPendingActionTicket(topPendingAction) : null}
          </div>
        )}

        {messages.length === 0 && !pendingAction && !topVariantSelection && (
          <div className={agentChatClasses.emptyState}>
            <Icon name="icon-miles" size={28} />
            <div>
              <strong className={agentChatClasses.emptyTitle}>还没有对话</strong>
              <span className={agentChatClasses.emptyMeta}>{contextLabel} · 等待输入</span>
            </div>
          </div>
        )}

        <div className={agentChatClasses.thread} aria-live="polite">
          {messages.map((message, index) => {
            const activeAction = index === attachedActionIndex ? pendingAction : undefined
            const activeVariantSelection = index === attachedVariantIndex ? visibleVariantSelection : undefined
            return (
              <div
                className={agentChatClasses.turn({
                  role: message.role,
                  receipt: message.receipt,
                  hasAction: Boolean(activeAction || activeVariantSelection),
                })}
                key={`${message.role}-${index}`}
              >
                <div
                  className={agentChatClasses.bubble({ role: message.role, streaming: message.streaming, receipt: message.receipt })}
                >
                  {!message.receipt && (
                    <span className={agentChatClasses.bubbleAvatar(message.role === 'user')} aria-hidden="true">
                      {message.role === 'user' ? '你' : 'P'}
                    </span>
                  )}
                  <p className={agentChatClasses.bubbleText}>{message.content}</p>
                  {message.undoVersion && onUndo && (
                    <Button
                      size="small"
                      type="dashed"
                      disabled={commandBusy || isStreaming}
                      onClick={() => onUndo(message.undoVersion!)}
                    >
                      撤销
                    </Button>
                  )}
                </div>
                {(activeAction || activeVariantSelection) && (
                  <div className={agentChatClasses.actionAttachment()}>
                    {activeVariantSelection ? renderVariantSelectionTicket(activeVariantSelection) : activeAction ? renderPendingActionTicket(activeAction) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {isStreaming && progressItems.length > 0 && (
          <div className={agentChatClasses.progressCard} aria-live="polite">
            {progressItems.map((item) => (
              <div className={agentChatClasses.progressItem} key={item.id}>
                <span className={agentChatClasses.progressDot(item.state)} />
                <div>
                  <strong className={agentChatClasses.progressTitle}>{item.label}</strong>
                  <small className={agentChatClasses.progressMeta}>{item.detail}</small>
                </div>
              </div>
            ))}
          </div>
        )}
        {isStreaming && progressItems.length === 0 && <div className={agentChatClasses.streamingPill}>PlanPal 正在处理...</div>}
      </div>
      <div className={agentChatClasses.composer}>
        <div className={agentChatClasses.contextAnchor} ref={contextMenuRef}>
          <button
            className={agentChatClasses.contextTrigger(Boolean(selectedSegment))}
            type="button"
            title={`当前上下文：${contextLabel}`}
            aria-expanded={contextMenuOpen}
            aria-haspopup="menu"
            onClick={() => setContextMenuOpen((open) => !open)}
          >
            <span className={agentChatClasses.contextTriggerIcon} aria-hidden="true">@</span>
            <strong className={agentChatClasses.contextTriggerText}>{contextLabel}</strong>
          </button>
          {selectedSegment && (
            <button
              className={agentChatClasses.contextClear}
              type="button"
              aria-label="取消活动上下文，切回全局计划"
              title="切回全局计划"
              onClick={() => selectContext(undefined)}
            >
              ×
            </button>
          )}
          {contextMenuOpen && (
            <div className={agentChatClasses.contextMenu} role="menu" aria-label="选择消息上下文">
              <button
                className={agentChatClasses.contextMenuItem(!selectedSegment)}
                role="menuitem"
                type="button"
                onClick={() => selectContext(undefined)}
              >
                <strong className={agentChatClasses.cardTitle}>全局计划</strong>
                <small className={agentChatClasses.cardMeta}>让 Agent 自己判断要改哪里</small>
              </button>
              {executableSegments.map((segment, index) => (
                <button
                  className={agentChatClasses.contextMenuItem(selectedSegment?.id === segment.id)}
                  key={segment.id}
                  role="menuitem"
                  title={segment.title}
                  type="button"
                  onClick={() => selectContext(segment.id)}
                >
                  <strong className={agentChatClasses.cardTitle}>{index + 1}. {segment.title}</strong>
                  <small className={agentChatClasses.cardMeta}>{segment.place}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={agentChatClasses.inputShell}>
          <Input
            allowClear
            shadow
            value={draft}
            placeholder="告诉 PlanPal 想怎么改..."
            onChange={(event) => onDraftChange(event.target.value)}
            onClear={() => onDraftChange('')}
            onKeyDown={handleKeyDown}
          />
          <Button type="primary" disabled={!canSend} loading={isStreaming} title={disabledReason} onClick={onSend}>
            发送
          </Button>
        </div>
        {disabledReason && <p className={agentChatClasses.disabledReason}>{disabledReason}</p>}
      </div>
    </div>
  )
}

function CommandConfirmationTicket({
  action,
  busy,
  onConfirm,
}: {
  action: Extract<PendingAction, { kind: 'command-confirmation' }>
  busy: boolean
  onConfirm: (action: Extract<PendingAction, { kind: 'command-confirmation' }>, confirmed: boolean) => void
}) {
  const preview = action.preview
  const destructive = action.severity === 'destructive'
  const commandLabels = action.commands.map(commandProposalLabel)
  return (
    <Card className={agentChatClasses.decisionTicket} color={destructive ? 'app-yellow' : 'app-teal'}>
      <DecisionTicketHeader title={action.title} description={action.description} />
      <p className={agentChatClasses.activeQuery}>Agent 建议修改拼图，确认后才会写入。</p>
      <div className={workspacePrimitives.chipRow}>
        <span className={chipClassName(0)}>基于 V{preview.beforeVersion}</span>
        <span className={chipClassName(1)}>{commandLabels.join(' + ')}</span>
        <span className={chipClassName(2)}>{preview.affectedSegmentTitles.length || preview.affectedSegmentIds.length} 个影响节点</span>
      </div>
      {preview.affectedSegmentTitles.length > 0 && (
        <p className={agentChatClasses.cardText}>影响：{preview.affectedSegmentTitles.join('、')}</p>
      )}
      {preview.beforeOrder && preview.afterOrder && (
        <div className={agentChatClasses.choiceList}>
          <article className={agentChatClasses.serviceCard(false)}>
            <strong className={agentChatClasses.cardTitle}>当前顺序</strong>
            <small className={agentChatClasses.cardMeta}>{preview.beforeOrder.join(' → ')}</small>
          </article>
          <article className={agentChatClasses.serviceCard(true)}>
            <strong className={agentChatClasses.cardTitle}>应用后</strong>
            <small className={agentChatClasses.cardMeta}>{preview.afterOrder.join(' → ') || '空计划'}</small>
          </article>
        </div>
      )}
      {preview.riskNotes.length > 0 && (
        <ul className={agentChatClasses.reasons}>
          {preview.riskNotes.map((note) => <li className={agentChatClasses.reason} key={note}>{note}</li>)}
        </ul>
      )}
      <div className={agentChatClasses.footer}>
        <Button size="small" type="dashed" disabled={busy} onClick={() => onConfirm(action, false)}>
          {action.cancelLabel}
        </Button>
        <Button size="small" type="primary" danger={destructive} disabled={busy} onClick={() => onConfirm(action, true)}>
          {action.confirmLabel}
        </Button>
      </div>
    </Card>
  )
}

function ClarificationTicket({
  action,
  busy,
  onDismiss,
}: {
  action: Extract<PendingAction, { kind: 'clarification' }>
  busy: boolean
  onDismiss: (actionId: string) => void
}) {
  return (
    <Card className={agentChatClasses.decisionTicket} color="app-teal">
      <DecisionTicketHeader title={action.title} description={action.description} />
      <div className={workspacePrimitives.chipRow}>
        {action.requiredFields.map((field, index) => (
          <span className={chipClassName(index)} key={field}>{field}</span>
        ))}
      </div>
      <div className={agentChatClasses.footer}>
        <Button size="small" type="dashed" disabled={busy} onClick={() => onDismiss(action.id)}>
          暂不处理
        </Button>
      </div>
    </Card>
  )
}

function commandProposalLabel(command: Extract<PendingAction, { kind: 'command-confirmation' }>['commands'][number]) {
  switch (command.type) {
    case 'CLEAR_PLAN_SEGMENTS':
      return '清空'
    case 'DELETE_SEGMENT':
      return '删除'
    case 'REORDER_SEGMENT':
      return '重排'
    case 'REPLACE_SEGMENT':
      return '替换'
    case 'REWRITE_SEGMENT':
      return '改写'
    case 'ADD_SEGMENT':
      return '新增'
    case 'LOCK_SEGMENT':
      return '锁定'
    case 'UNLOCK_SEGMENT':
      return '解锁'
    case 'SET_ROUTE_CHOICE':
    case 'CLEAR_ROUTE_CHOICE':
      return '路线'
    case 'SELECT_SERVICE_ITEM':
    case 'REMOVE_SERVICE_ITEM':
    case 'UPDATE_SERVICE_ITEM_QUANTITY':
      return '服务项'
    case 'CONFIRM_PLAN':
      return '确认计划'
    case 'CREATE_SANDBOX_ORDER':
      return '确认单'
    default:
      return '修改'
  }
}

function ServiceItemDecisionTicket({
  action,
  busy,
  plan,
  onDismiss,
  onServiceOfferingSelect,
}: {
  action: Extract<PendingAction, { kind: 'service-item-selection' }>
  busy: boolean
  plan: Plan
  onDismiss: (actionId: string) => void
  onServiceOfferingSelect: (action: Extract<PendingAction, { kind: 'service-item-selection' }>, offering: MerchantOffering, quantity: number) => void
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const selections = plan.serviceSelections ?? []

  function quantityFor(offering: MerchantOffering) {
    const selected = selections.find((item) => item.segmentId === action.segmentId && item.offeringId === offering.id)
    return quantities[offering.id] ?? selected?.quantity ?? defaultTicketQuantity(offering)
  }

  function setQuantity(offering: MerchantOffering, quantity: number) {
    setQuantities((current) => ({
      ...current,
      [offering.id]: Math.max(1, Math.min(99, quantity)),
    }))
  }

  return (
    <Card className={agentChatClasses.decisionTicket} color="app-teal">
      <DecisionTicketHeader title={action.title} description={action.description} />
      {action.query && <p className={agentChatClasses.activeQuery}>当前需求：{action.query}</p>}
      <div className={agentChatClasses.choiceList}>
        {action.offerings.map((offering) => {
          const quantity = quantityFor(offering)
          const selected = selections.some((item) => item.segmentId === action.segmentId && item.offeringId === offering.id)
          return (
            <article className={agentChatClasses.serviceCard(selected)} key={offering.id}>
              <header>
                <strong className={agentChatClasses.cardTitle} title={offering.title}>{offering.title}</strong>
                <small className={agentChatClasses.cardMeta}>{offeringCategoryLine(offering)}</small>
              </header>
              <p className={agentChatClasses.cardText}>{offering.description}</p>
              <div className={workspacePrimitives.chipRow}>
                <span className={chipClassName(0)}>CNY {offering.priceCny}/{offering.unit}</span>
                <span className={chipClassName(1)}>{offering.showtime ?? offering.availabilitySlots[0] ?? '时段待定'}</span>
                <span className={chipClassName(2)}>{fulfillmentText(offering.fulfillment)}</span>
              </div>
              <div className={agentChatClasses.serviceActions}>
                <button className={agentChatClasses.serviceActionButton} type="button" disabled={busy || quantity <= 1} onClick={() => setQuantity(offering, quantity - 1)}>-</button>
                <strong className={agentChatClasses.quantity}>{quantity}</strong>
                <button className={agentChatClasses.serviceActionButton} type="button" disabled={busy} onClick={() => setQuantity(offering, quantity + 1)}>+</button>
                <Button
                  size="small"
                  type="primary"
                  disabled={busy}
                  onClick={() => onServiceOfferingSelect(action, offering, quantity)}
                >
                  {selected ? '更新选择' : '模拟选择'}
                </Button>
              </div>
            </article>
          )
        })}
      </div>
      <div className={agentChatClasses.footer}>
        <Button size="small" type="dashed" disabled={busy} onClick={() => onDismiss(action.id)}>
          暂不选择
        </Button>
      </div>
    </Card>
  )
}

function VariantDecisionTicket({
  busy,
  selection,
  onDismiss,
  onVariantSelect,
}: {
  busy: boolean
  selection: PlanVariantSelection
  onDismiss?: (actionId: string) => void
  onVariantSelect: (actionId: string, variant: PlanVariantOption) => void
}) {
  const display = deriveVariantTicketDisplay(selection)
  const [open, setOpen] = useState(display.expandedByDefault)

  useEffect(() => {
    setOpen(!selection.selectedVariantId)
  }, [selection.selectedVariantId])

  return (
    <Card className={agentChatClasses.decisionTicket} color="app-teal">
      <button
        className={agentChatClasses.variantSummary}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={workspacePrimitives.iconPillCompact} aria-hidden="true">
          <Icon name="icon-variant" size={22} bounce />
        </span>
        <span className={agentChatClasses.variantSummaryCopy}>
          <em className={agentChatClasses.variantKicker}>方案方向</em>
          <strong className={agentChatClasses.cardTitle}>{display.title}</strong>
          <small className={agentChatClasses.cardMeta}>{display.subtitle}</small>
        </span>
        <b className={agentChatClasses.variantToggle}>{open ? '收起' : '展开'}</b>
      </button>
      {open && (
        <div className={agentChatClasses.variantList}>
          {selection.variants.map((variant) => {
            const variantDisplay = display.variants.find((item) => item.id === variant.id)
            if (!variantDisplay) return null
            return (
              <button
                className={agentChatClasses.variantOption(variantDisplay.active)}
                disabled={busy || variantDisplay.active}
                key={variant.id}
                type="button"
                onClick={() => onVariantSelect(selection.actionId, variant)}
              >
                <strong className={agentChatClasses.cardTitle}>{variantDisplay.title}</strong>
                <small className={agentChatClasses.cardMeta}>{variantDisplay.summary}</small>
                <div className={workspacePrimitives.chipRow}>
                  {variantDisplay.badges.map((badge, index) => <span className={chipClassName(index)} key={badge}>{badge}</span>)}
                </div>
                <em className={workspacePrimitives.primaryActionPill}>{variantDisplay.active ? '当前方案' : variantDisplay.writeLabel}</em>
              </button>
            )
          })}
        </div>
      )}
      {onDismiss && !selection.selectedVariantId && (
        <div className={agentChatClasses.footer}>
          <Button
            size="small"
            type="dashed"
            disabled={busy}
            onClick={() => onDismiss(selection.actionId)}
          >
            保留当前拼图
          </Button>
        </div>
      )}
    </Card>
  )
}

function CandidateDecisionTicket({
  action,
  busy,
  candidateRequirement,
  plan,
  onCandidateRequirementChange,
  onCandidateDismiss,
  onCandidateRefresh,
  onCandidateSelect,
}: {
  action: Extract<PendingAction, { kind: 'candidate-selection' }>
  busy: boolean
  candidateRequirement: string
  plan: Plan
  onCandidateRequirementChange: (value: string) => void
  onCandidateDismiss: (actionId: string) => void
  onCandidateRefresh: (action: Extract<PendingAction, { kind: 'candidate-selection' }>, searchQuery?: string) => void
  onCandidateSelect: (actionId: string, candidate: CandidateOption) => void
}) {
  const activeRequirement = action.searchQuery?.trim()

  function submitRequirement() {
    const requirement = candidateRequirement.trim()
    if (!requirement || busy) return
    onCandidateRefresh(action, requirement)
    onCandidateRequirementChange('')
  }

  function handleRequirementKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    submitRequirement()
  }

  return (
    <Card className={agentChatClasses.decisionTicket} color="app-yellow">
      <DecisionTicketHeader title={action.title} description={action.description} />
      {activeRequirement && (
        <p className={agentChatClasses.activeQuery}>
          当前需求：{activeRequirement}
        </p>
      )}
      <div className={agentChatClasses.choiceList}>
        {action.candidates.map((candidate) => {
          const display = deriveCandidateCardDisplay(action, candidate, plan)
          return (
            <button
              className={agentChatClasses.choiceCard}
              key={candidate.id}
              type="button"
              disabled={busy}
              onClick={() => onCandidateSelect(action.id, candidate)}
            >
              <header>
                <strong className={agentChatClasses.cardTitle} title={display.title}>{display.title}</strong>
                <small className={agentChatClasses.cardMeta}>{display.subtitle}</small>
              </header>
              <p className={agentChatClasses.cardText}>{display.description}</p>
              <small className={agentChatClasses.placement}>{display.placementLabel}</small>
              <div className={workspacePrimitives.chipRow}>
                {display.badges.map((badge, index) => <span className={chipClassName(index)} key={badge}>{badge}</span>)}
              </div>
              <ul className={agentChatClasses.reasons}>
                {display.reasons.map((reason) => <li className={agentChatClasses.reason} key={reason}>{reason}</li>)}
              </ul>
              <em className={workspacePrimitives.primaryActionPill}>{display.writeLabel}</em>
            </button>
          )
        })}
      </div>
      <div className={agentChatClasses.candidateControl}>
        <Button
          size="small"
          type="dashed"
          disabled={busy}
          onClick={() => onCandidateDismiss(action.id)}
        >
          取消推荐
        </Button>
        <Button
          size="small"
          type="dashed"
          disabled={busy}
          title={activeRequirement ? `按“${activeRequirement}”再换一批` : '排除当前候选，再换一批'}
          onClick={() => onCandidateRefresh(action)}
        >
          换一批
        </Button>
        <Input
          allowClear
          value={candidateRequirement}
          placeholder="描述新需求，如近一点、安静、室内..."
          onChange={(event) => onCandidateRequirementChange(event.target.value)}
          onClear={() => onCandidateRequirementChange('')}
          onKeyDown={handleRequirementKeyDown}
        />
        <Button
          size="small"
          type="primary"
          disabled={busy || !candidateRequirement.trim()}
          onClick={submitRequirement}
        >
          按需求刷新
        </Button>
      </div>
    </Card>
  )
}

function defaultTicketQuantity(offering: MerchantOffering) {
  if (offering.category === 'hotel' || offering.priceCny <= 0) return 1
  if (offering.category === 'movie' || offering.category === 'ticket') return 2
  return 1
}

function offeringCategoryLine(offering: MerchantOffering) {
  if (offering.category === 'hotel') {
    return [offering.roomType, offering.bedType, offering.occupancy ? `${offering.occupancy} 人` : ''].filter(Boolean).join(' · ')
  }
  if (offering.category === 'movie') {
    return [offering.filmTitle, offering.screenType, offering.seatClass, offering.runtimeMinutes ? `${offering.runtimeMinutes} 分钟` : ''].filter(Boolean).join(' · ')
  }
  return [offering.category, offering.durationMinutes ? `${offering.durationMinutes} 分钟` : ''].filter(Boolean).join(' · ')
}

function fulfillmentText(value: MerchantOffering['fulfillment']) {
  if (value === 'room-night') return '模拟入住'
  if (value === 'e-ticket') return '模拟电子票'
  if (value === 'pickup') return '到店自提'
  if (value === 'service-slot') return '模拟时段'
  if (value === 'reservation') return '模拟预约'
  if (value === 'onsite') return '到店消费'
  return '仅 mock'
}

function DecisionTicketHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className={agentChatClasses.decisionHeader}>
      <span className={workspacePrimitives.iconPillCompact} aria-hidden="true">
        <Icon name="icon-miles" size={24} bounce />
      </span>
      <div>
        <span className={appClasses.eyebrow}>决策票据</span>
        <strong className={agentChatClasses.decisionHeaderTitle}>{title}</strong>
        <p className={agentChatClasses.decisionHeaderText}>{description}</p>
      </div>
    </div>
  )
}
