import { useState } from 'react'
import { Button, Icon } from 'animal-island-ui'
import type { AgentEvent, Plan } from '@planpal/domain'
import type { PlanVersionSummary } from '../../lib/api'
import { derivePlanReceiptDisplay, type PlanExecutionBrief } from './workspaceModel'

type TraceColumnProps = {
  commandBusy: boolean
  confirmDisabled: boolean
  confirmLabel: string
  events: AgentEvent[]
  executionBrief: PlanExecutionBrief
  plan: Plan
  versions: PlanVersionSummary[]
  onConfirm: () => void
}

export function TraceColumn({ commandBusy, confirmDisabled, confirmLabel, events, executionBrief, plan, versions, onConfirm }: TraceColumnProps) {
  const [receiptCopyState, setReceiptCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const latestEvents = events.filter((event) => event.type !== 'agent.message.delta').slice(-10).reverse()
  const latestVersions = versions.slice(-4).reverse()
  const receipt = derivePlanReceiptDisplay(plan)

  async function copyReceipt() {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setReceiptCopyState('failed')
      return
    }
    try {
      await navigator.clipboard.writeText(receipt.text)
      setReceiptCopyState('copied')
    } catch {
      setReceiptCopyState('failed')
    }
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setReceiptCopyState('idle'), 1400)
    }
  }

  return (
    <div className="trace-column column-content-scroll confirm-column">
      <section className="confirm-center-card" aria-label="执行检查">
        <div className="confirm-center-head">
          <span className="column-icon-pill compact" aria-hidden="true">
            <Icon name="icon-miles" size={24} bounce />
          </span>
          <div>
            <span className="eyebrow">确认中心</span>
            <strong>{executionBrief.checkSummary}</strong>
            <small>{executionBrief.complexityLabel} · {executionBrief.durationLabel}</small>
          </div>
        </div>
        <div className="execution-check-list">
          {executionBrief.checks.map((check) => (
            <article className={`execution-check ${check.state}`} key={check.id}>
              <span>{check.state === 'ok' ? 'OK' : check.state === 'blocked' ? '阻塞' : '提醒'}</span>
              <div>
                <strong>{check.label}</strong>
                <small>{check.detail}</small>
              </div>
            </article>
          ))}
        </div>
        <Button
          block
          type="primary"
          disabled={confirmDisabled || commandBusy}
          title={executionBrief.confirmBlockedReason || executionBrief.checkSummary}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </section>

      <section className="version-strip-card" aria-label="版本状态">
        <div className="version-strip-head">
          <div>
            <span className="eyebrow">Plan Version</span>
            <strong>V{plan.currentVersion}</strong>
            <small>{plan.status} · {plan.segments.length} 节点</small>
          </div>
          <p>{plan.summary}</p>
        </div>
        {latestVersions.length > 0 && (
          <div className="version-history compact-history" aria-label="Plan version history">
            {latestVersions.map((version) => (
              <article
                className={version.version === plan.currentVersion ? 'version-history-item active' : 'version-history-item'}
                key={`${version.version}-${version.updatedAt}`}
              >
                <strong>V{version.version}</strong>
                <div>
                  <span>{version.status}</span>
                  <small>{version.segmentCount} 节点 · {formatVersionTime(version.updatedAt)}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {plan.status === 'confirmed' && (
        <section className="plan-receipt-card">
          <div className="plan-receipt-header">
            <div>
              <span className="eyebrow">确认摘要</span>
              <h3>{receipt.title}</h3>
              <p>{receipt.statusLabel} · {receipt.versionLabel}</p>
            </div>
            <Button size="small" type="dashed" onClick={() => void copyReceipt()}>
              {receiptCopyState === 'copied' ? '已复制' : receiptCopyState === 'failed' ? '复制失败' : '复制摘要'}
            </Button>
          </div>
          <div className="plan-receipt-list">
            {receipt.segments.map((segment) => (
              <article key={segment.id}>
                <span>{segment.index}</span>
                <div>
                  <strong>{segment.time} · {segment.title}</strong>
                  <small>{segment.place} · {segment.budget}</small>
                </div>
              </article>
            ))}
          </div>
          <p className="plan-receipt-disclaimer">{receipt.disclaimer}</p>
        </section>
      )}

      <section className="trace-log-panel compact-log" aria-label="运行日志">
        <div className="section-heading-row compact">
          <strong>运行日志</strong>
          <small>{latestEvents.length || 0} 条</small>
        </div>
        <div className="trace-list">
          {latestEvents.length === 0 && <div className="empty-message">还没有运行记录。</div>}
          {latestEvents.map((event) => (
            <article className="trace-event" key={event.id}>
              <span>{event.type}</span>
              <p>{event.message}</p>
              <small>{new Date(event.createdAt).toLocaleTimeString()}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function formatVersionTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
