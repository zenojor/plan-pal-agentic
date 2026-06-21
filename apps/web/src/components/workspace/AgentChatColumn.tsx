import { Button, Card, Icon, Input } from 'animal-island-ui'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { CandidateOption, PendingAction, Plan, PlanVariantOption, PlanVariantSelection } from '@planpal/domain'
import type { StoredModelConfig } from '../../lib/modelConfig'
import {
  deriveCandidateCardDisplay,
  deriveVariantTicketDisplay,
  getAgentChatDisabledReason,
  getChatExecutionPathLabel,
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
  onDraftChange: (draft: string) => void
  onPendingActionDismiss: (actionId: string) => void
  onSend: () => void
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
  onDraftChange,
  onPendingActionDismiss,
  onSend,
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

  return (
    <div className="agent-chat-column">
      <div className="column-content-scroll chat-scroll">
        <section className="chat-status-strip" aria-label="Agent 状态">
          <div className="chat-status-main">
            <span className="column-icon-pill compact" aria-hidden="true">
              <Icon name="icon-chat" size={22} bounce />
            </span>
            <div>
              <span className="eyebrow">Agent</span>
              <strong>{config ? `已连接 ${config.model}` : '需要模型配置'}</strong>
            </div>
          </div>
          <div className="chat-status-chips">
            <span>{pathLabel}</span>
            {config?.resolvedBaseURL && <span title={`已验证端点：${config.resolvedBaseURL}`}>端点已验证</span>}
          </div>
        </section>

        {messages.length === 0 && !variantSelection && pendingAction?.kind !== 'candidate-selection' && (
          <div className="empty-message chat-empty-state">
            <Icon name="icon-miles" size={28} />
            <span>可以直接说“把晚饭换近一点”。输入栏旁的 @ 可以切换活动，也可以保持全局计划。</span>
          </div>
        )}

        <div className="chat-thread" aria-live="polite">
          {messages.map((message, index) => (
            <div
              className={`chat-bubble ${message.role} ${message.streaming ? 'streaming' : ''} ${message.receipt ? 'receipt' : ''}`}
              key={`${message.role}-${index}`}
            >
              {!message.receipt && (
                <span className="chat-bubble-avatar" aria-hidden="true">
                  {message.role === 'user' ? '你' : 'P'}
                </span>
              )}
              <p>{message.content}</p>
            </div>
          ))}
        </div>

        {variantSelection && (
          <VariantDecisionTicket
            busy={isStreaming || commandBusy}
            selection={variantSelection}
            onDismiss={pendingAction?.kind === 'plan-variant-selection' && pendingAction.id === variantSelection.actionId
              ? onPendingActionDismiss
              : undefined}
            onVariantSelect={onVariantSelect}
          />
        )}

        {pendingAction?.kind === 'candidate-selection' && (
          <CandidateDecisionTicket
            action={pendingAction}
            busy={isStreaming || commandBusy}
            candidateRequirement={candidateRequirement}
            plan={plan}
            onCandidateRequirementChange={setCandidateRequirement}
            onCandidateDismiss={onPendingActionDismiss}
            onCandidateRefresh={onCandidateRefresh}
            onCandidateSelect={onCandidateSelect}
          />
        )}

        {isStreaming && progressItems.length > 0 && (
          <div className="agent-progress-card" aria-live="polite">
            {progressItems.map((item) => (
              <div className={`agent-progress-item ${item.state}`} key={item.id}>
                <span />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
              </div>
            ))}
          </div>
        )}
        {isStreaming && progressItems.length === 0 && <div className="streaming-pill">PlanPal 正在处理...</div>}
      </div>
      <div className="chat-composer">
        <div className="chat-context-anchor" ref={contextMenuRef}>
          <button
            className={`chat-context-trigger ${selectedSegment ? 'active' : ''}`}
            type="button"
            title={`当前上下文：${contextLabel}`}
            aria-expanded={contextMenuOpen}
            aria-haspopup="menu"
            onClick={() => setContextMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">@</span>
            <strong>{contextLabel}</strong>
          </button>
          {selectedSegment && (
            <button
              className="chat-context-clear"
              type="button"
              aria-label="取消活动上下文，切回全局计划"
              title="切回全局计划"
              onClick={() => selectContext(undefined)}
            >
              ×
            </button>
          )}
          {contextMenuOpen && (
            <div className="chat-context-menu" role="menu" aria-label="选择消息上下文">
              <button
                className={!selectedSegment ? 'active' : ''}
                role="menuitem"
                type="button"
                onClick={() => selectContext(undefined)}
              >
                <strong>全局计划</strong>
                <small>让 Agent 自己判断要改哪里</small>
              </button>
              {executableSegments.map((segment, index) => (
                <button
                  className={selectedSegment?.id === segment.id ? 'active' : ''}
                  key={segment.id}
                  role="menuitem"
                  title={segment.title}
                  type="button"
                  onClick={() => selectContext(segment.id)}
                >
                  <strong>{index + 1}. {segment.title}</strong>
                  <small>{segment.place}</small>
                </button>
              ))}
            </div>
          )}
        </div>
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
        {disabledReason && <p className="chat-disabled-reason">{disabledReason}</p>}
      </div>
    </div>
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
    <Card className="decision-ticket variant-decision-ticket" color="app-teal">
      <button
        className="variant-ticket-summary"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="column-icon-pill compact" aria-hidden="true">
          <Icon name="icon-variant" size={22} bounce />
        </span>
        <span>
          <em>方案方向</em>
          <strong>{display.title}</strong>
          <small>{display.subtitle}</small>
        </span>
        <b>{open ? '收起' : '展开'}</b>
      </button>
      {open && (
        <div className="variant-ticket-list">
          {selection.variants.map((variant) => {
            const variantDisplay = display.variants.find((item) => item.id === variant.id)
            if (!variantDisplay) return null
            return (
              <button
                className={variantDisplay.active ? 'active' : ''}
                disabled={busy || variantDisplay.active}
                key={variant.id}
                type="button"
                onClick={() => onVariantSelect(selection.actionId, variant)}
              >
                <strong>{variantDisplay.title}</strong>
                <small>{variantDisplay.summary}</small>
                <div className="ticket-chip-row">
                  {variantDisplay.badges.map((badge) => <span key={badge}>{badge}</span>)}
                </div>
                <em>{variantDisplay.active ? '当前方案' : variantDisplay.writeLabel}</em>
              </button>
            )
          })}
        </div>
      )}
      {onDismiss && !selection.selectedVariantId && (
        <div className="decision-ticket-footer">
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
    <Card className="decision-ticket candidate-ticket" color="app-yellow">
      <DecisionTicketHeader title={action.title} description={action.description} />
      {activeRequirement && (
        <p className="candidate-active-query">
          当前需求：{activeRequirement}
        </p>
      )}
      <div className="candidate-list action-choice-list">
        {action.candidates.map((candidate) => {
          const display = deriveCandidateCardDisplay(action, candidate, plan)
          return (
            <button
              className="action-choice-card"
              key={candidate.id}
              type="button"
              disabled={busy}
              onClick={() => onCandidateSelect(action.id, candidate)}
            >
              <header>
                <strong className="action-choice-title" title={display.title}>{display.title}</strong>
                <small>{display.subtitle}</small>
              </header>
              <p>{display.description}</p>
              <small className="action-card-placement">{display.placementLabel}</small>
              <div className="ticket-chip-row">
                {display.badges.map((badge) => <span key={badge}>{badge}</span>)}
              </div>
              <ul className="action-card-reasons">
                {display.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              <em className="primary-action-pill">{display.writeLabel}</em>
            </button>
          )
        })}
      </div>
      <div className="candidate-control-row">
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

function DecisionTicketHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="decision-ticket-header">
      <span className="column-icon-pill compact" aria-hidden="true">
        <Icon name="icon-miles" size={24} bounce />
      </span>
      <div>
        <span className="eyebrow">决策票据</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  )
}
