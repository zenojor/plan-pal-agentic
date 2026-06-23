import { useState } from 'react'
import { Button, Icon } from 'animal-island-ui'
import type { AgentEvent, Plan } from '@planpal/domain'
import classNames from 'classnames'
import type { PlanVersionSummary } from '../../lib/api'
import { appClasses } from '../../lib/appClasses'
import { chipClassName, workspacePrimitives } from './workspacePrimitives'
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
    <div className={`${workspacePrimitives.scrollColumn} ${workspacePrimitives.columnGrid}`}>
      <section className={workspacePrimitives.panelCard} aria-label="执行检查">
        <div className={workspacePrimitives.headingRow}>
          <span className={workspacePrimitives.iconPillCompact} aria-hidden="true">
            <Icon name="icon-miles" size={24} bounce />
          </span>
          <div className={workspacePrimitives.headingCopy}>
            <span className={appClasses.eyebrow}>确认中心</span>
            <strong className={workspacePrimitives.headingTitle}>{executionBrief.checkSummary}</strong>
            <small className={workspacePrimitives.headingSubtitle}>{executionBrief.complexityLabel} · {executionBrief.durationLabel}</small>
          </div>
        </div>
        <div className="grid gap-[0.38rem]">
          {executionBrief.checks.map((check) => (
            <article className={executionCheckClassName(check.state)} key={check.id}>
              <span className="grid h-8 min-w-[42px] place-items-center rounded-[var(--animal-radius-pill)] bg-[#fffdf5] px-2 text-[0.68rem] font-[950]">{check.state === 'ok' ? 'OK' : check.state === 'blocked' ? '阻塞' : '提醒'}</span>
              <div>
                <strong className={workspacePrimitives.listTitle}>{check.label}</strong>
                <small className={workspacePrimitives.listMeta}>{check.detail}</small>
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

      <section className={workspacePrimitives.panelCard} aria-label="版本状态">
        <div className="grid gap-[0.36rem]">
          <div>
            <span className={appClasses.eyebrow}>Plan Version</span>
            <strong className={workspacePrimitives.headingTitle}>V{plan.currentVersion}</strong>
            <small className={workspacePrimitives.headingSubtitle}>{plan.status} · {plan.segments.length} 节点</small>
          </div>
          <p className={workspacePrimitives.note}>{plan.summary}</p>
        </div>
        {latestVersions.length > 0 && (
          <div className="grid gap-[0.38rem]" aria-label="Plan version history">
            {latestVersions.map((version) => (
              <article
                className={workspacePrimitives.listItem(version.version === plan.currentVersion)}
                key={`${version.version}-${version.updatedAt}`}
              >
                <strong className={workspacePrimitives.listIndex}>V{version.version}</strong>
                <div>
                  <span className={workspacePrimitives.listTitle}>{version.status}</span>
                  <small className={workspacePrimitives.listMeta}>{version.segmentCount} 节点 · {formatVersionTime(version.updatedAt)}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {plan.status === 'confirmed' && (
        <section className={workspacePrimitives.panelCard}>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div>
              <span className={appClasses.eyebrow}>确认摘要</span>
              <h3 className={workspacePrimitives.headingTitle}>{receipt.title}</h3>
              <p className={workspacePrimitives.note}>
                {receipt.statusLabel} · {receipt.versionLabel}
                {receipt.receiptId ? ` · ${receipt.receiptId}` : ''}
              </p>
            </div>
            <Button size="small" type="dashed" onClick={() => void copyReceipt()}>
              {receiptCopyState === 'copied' ? '已复制' : receiptCopyState === 'failed' ? '复制失败' : '复制摘要'}
            </Button>
          </div>
          {(receipt.totalEstimateLabel || receipt.merchantCountLabel) && (
            <div className={workspacePrimitives.chipRow}>
              <span className={chipClassName(0)}>{receipt.merchantCountLabel}</span>
              {receipt.totalEstimateLabel && <span className={chipClassName(1)}>模拟预算 {receipt.totalEstimateLabel}</span>}
            </div>
          )}
          <div className={workspacePrimitives.list}>
            {receipt.segments.map((segment) => (
              <article className={workspacePrimitives.listItem()} key={segment.id}>
                <span className={workspacePrimitives.listIndex}>{segment.index}</span>
                <div>
                  <strong className={workspacePrimitives.listTitle}>{segment.time} · {segment.title}</strong>
                  <small className={workspacePrimitives.listMeta}>{segment.place} · {segment.budget}</small>
                </div>
              </article>
            ))}
          </div>
          {receipt.itemLines.length > 0 && (
            <div className={workspacePrimitives.list}>
              {receipt.itemLines.slice(0, 4).map((line) => (
                <article className={workspacePrimitives.listItem()} key={line}>
                  <span className={workspacePrimitives.listIndex}>M</span>
                  <div>
                    <strong className={workspacePrimitives.listTitle}>{line}</strong>
                    <small className={workspacePrimitives.listMeta}>模拟项目，不会提交给商户</small>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className={workspacePrimitives.note}>{receipt.disclaimer}</p>
        </section>
      )}

      <section className={workspacePrimitives.directory} aria-label="运行日志">
        <div className={workspacePrimitives.sectionHeading}>
          <strong className={workspacePrimitives.sectionHeadingTitle}>运行日志</strong>
          <small className={workspacePrimitives.sectionHeadingMeta}>{latestEvents.length || 0} 条</small>
        </div>
        <div className={workspacePrimitives.list}>
          {latestEvents.length === 0 && <div className={workspacePrimitives.emptyState}>还没有运行记录。</div>}
          {latestEvents.map((event) => (
            <article className="grid gap-1 rounded-[16px] bg-[#fffdf5] p-2" key={event.id}>
              <span className={chipClassName(0)}>{event.type}</span>
              <p className="m-0 text-[0.76rem] font-[820] leading-[1.45] text-animal-text-body">{event.message}</p>
              <small className={workspacePrimitives.listMeta}>{new Date(event.createdAt).toLocaleTimeString()}</small>
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

function executionCheckClassName(state: string) {
  return classNames(
    'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-[16px] border-2 p-2',
    state === 'blocked'
      ? 'border-[#d46a4c] bg-[#ffe7dc] text-[#a43b24]'
      : state === 'ok'
        ? 'border-animal-green bg-[#ecffd9] text-[#3d6d17]'
        : 'border-animal-border bg-[#fffdf5] text-animal-text-body',
  )
}
