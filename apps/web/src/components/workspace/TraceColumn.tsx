import { useEffect, useState } from 'react'
import { Button, Icon } from 'animal-island-ui'
import { useQuery } from '@tanstack/react-query'
import type { AgentEvent, AgentTraceSnapshot, Plan, TraceReplayFrame, TraceSafetyFinding, TraceStep, TraceToolCallSummary } from '@planpal/domain'
import classNames from 'classnames'
import { getAgentRunTrace, listAgentRuns, type AgentRunSummary, type PlanVersionSummary } from '../../lib/api'
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
  const [activeTab, setActiveTab] = useState<'timeline' | 'tools' | 'replay' | 'safety'>('timeline')
  const [selectedRunId, setSelectedRunId] = useState('')
  const [replayIndex, setReplayIndex] = useState(0)
  const latestEvents = events.filter((event) => event.type !== 'agent.message.delta').slice(-10).reverse()
  const latestVersions = versions.slice(-4).reverse()
  const receipt = derivePlanReceiptDisplay(plan)
  const runsQuery = useQuery({
    queryKey: ['agent-runs', plan.id, events.length, plan.currentVersion],
    queryFn: () => listAgentRuns(plan.id),
  })
  const runs = runsQuery.data?.runs ?? []
  const activeRunId = runs.find((run) => run.id === selectedRunId)?.id ?? runs.at(-1)?.id ?? ''
  const traceQuery = useQuery({
    enabled: Boolean(activeRunId),
    queryKey: ['agent-run-trace', plan.id, activeRunId, events.length, plan.currentVersion],
    queryFn: () => getAgentRunTrace(plan.id, activeRunId),
  })
  const trace = traceQuery.data

  useEffect(() => {
    if (!runs.length) {
      if (selectedRunId) setSelectedRunId('')
      return
    }
    if (!selectedRunId || !runs.some((run) => run.id === selectedRunId)) {
      setSelectedRunId(runs.at(-1)!.id)
    }
  }, [runs, selectedRunId])

  useEffect(() => {
    setReplayIndex(0)
  }, [activeRunId])

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
              <span className="grid h-8 min-w-[42px] place-items-center rounded-[var(--animal-radius-pill)] bg-[#fffdf5] px-2 text-[0.68rem] font-[850]">{check.state === 'ok' ? 'OK' : check.state === 'blocked' ? '阻塞' : '提醒'}</span>
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
          <strong className={workspacePrimitives.sectionHeadingTitle}>Trace Replay</strong>
          <small className={workspacePrimitives.sectionHeadingMeta}>{runs.length || 0} runs</small>
        </div>
        <TraceExplorer
          activeTab={activeTab}
          events={latestEvents}
          loading={runsQuery.isLoading || traceQuery.isLoading}
          replayIndex={replayIndex}
          runs={runs}
          selectedRunId={activeRunId}
          trace={trace}
          onReplayIndexChange={setReplayIndex}
          onRunChange={setSelectedRunId}
          onTabChange={setActiveTab}
        />
      </section>
    </div>
  )
}

function TraceExplorer({
  activeTab,
  events,
  loading,
  replayIndex,
  runs,
  selectedRunId,
  trace,
  onReplayIndexChange,
  onRunChange,
  onTabChange,
}: {
  activeTab: 'timeline' | 'tools' | 'replay' | 'safety'
  events: AgentEvent[]
  loading: boolean
  replayIndex: number
  runs: AgentRunSummary[]
  selectedRunId: string
  trace?: AgentTraceSnapshot
  onReplayIndexChange: (index: number) => void
  onRunChange: (runId: string) => void
  onTabChange: (tab: 'timeline' | 'tools' | 'replay' | 'safety') => void
}) {
  const tabs = [
    ['timeline', 'Timeline'],
    ['tools', 'Tools'],
    ['replay', 'Replay'],
    ['safety', 'Safety'],
  ] as const
  return (
    <div className="grid gap-2">
      <div className="grid gap-2 rounded-[18px] border-2 border-animal-border bg-[#fffdf5] p-2">
        <label className="grid gap-1 text-[0.72rem] font-[900] text-[var(--animal-text-muted)]">
          Agent Run
          <select
            className="min-w-0 rounded-[14px] border-2 border-animal-border bg-white px-2 py-2 text-[0.76rem] font-[850] text-animal-text outline-none"
            disabled={!runs.length}
            value={selectedRunId}
            onChange={(event) => onRunChange(event.target.value)}
          >
            {runs.length === 0 && <option value="">暂无 run</option>}
            {runs.map((run, index) => (
              <option value={run.id} key={run.id}>
                {index + 1}. {run.status} · {truncate(run.inputMessage, 24)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex min-w-0 flex-wrap gap-1">
          {tabs.map(([id, label]) => (
            <button
              className={traceTabClassName(activeTab === id)}
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className={workspacePrimitives.emptyState}>正在加载 trace...</div>}
      {!loading && activeTab === 'timeline' && <TraceTimeline events={events} steps={trace?.steps ?? []} />}
      {!loading && activeTab === 'tools' && <TraceTools toolCalls={trace?.toolCalls ?? []} />}
      {!loading && activeTab === 'replay' && (
        <TraceReplay
          frames={trace?.replayFrames ?? []}
          replayIndex={replayIndex}
          onReplayIndexChange={onReplayIndexChange}
        />
      )}
      {!loading && activeTab === 'safety' && <TraceSafety findings={trace?.safetyFindings ?? []} />}
    </div>
  )
}

function TraceTimeline({ events, steps }: { events: AgentEvent[]; steps: TraceStep[] }) {
  if (!steps.length && !events.length) return <div className={workspacePrimitives.emptyState}>还没有运行记录。</div>
  if (steps.length) {
    return (
      <div className={workspacePrimitives.list}>
        {steps.map((step) => (
          <article className={traceRowClassName(step.status)} key={step.id}>
            <span className={chipClassName(step.status === 'error' ? 3 : step.status === 'active' ? 1 : 0)}>{step.kind}</span>
            <strong className={workspacePrimitives.listTitle}>{step.label}</strong>
            <p className="m-0 text-[0.74rem] font-[780] leading-[1.45] text-animal-text-body">{step.summary}</p>
            <small className={workspacePrimitives.listMeta}>
              #{step.sequence}
              {step.toolName ? ` · ${step.toolName}` : ''}
              {step.commandType ? ` · ${step.commandType}` : ''}
              {step.version ? ` · V${step.version}` : ''}
            </small>
          </article>
        ))}
      </div>
    )
  }
  return (
    <div className={workspacePrimitives.list}>
      {events.map((event) => (
        <article className="grid gap-1 rounded-[16px] bg-[#fffdf5] p-2" key={event.id}>
          <span className={chipClassName(0)}>{event.type}</span>
          <p className="m-0 text-[0.76rem] font-[820] leading-[1.45] text-animal-text-body">{event.message}</p>
          <small className={workspacePrimitives.listMeta}>{new Date(event.createdAt).toLocaleTimeString()}</small>
        </article>
      ))}
    </div>
  )
}

function TraceTools({ toolCalls }: { toolCalls: TraceToolCallSummary[] }) {
  if (!toolCalls.length) return <div className={workspacePrimitives.emptyState}>这个 run 没有工具调用。</div>
  return (
    <div className={workspacePrimitives.list}>
      {toolCalls.map((call) => (
        <article className={traceRowClassName(call.status === 'failed' ? 'error' : call.status === 'blocked' ? 'blocked' : 'done')} key={call.id}>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <span className={chipClassName(call.effect === 'external-write' ? 3 : 0)}>{call.effect}</span>
            <span className={chipClassName(call.status === 'success' ? 1 : 2)}>{call.status}</span>
            <small className={workspacePrimitives.listMeta}>{call.durationMs}ms</small>
          </div>
          <strong className={workspacePrimitives.listTitle}>{call.toolName}</strong>
          <small className={workspacePrimitives.listMeta}>args · {call.argsSummary}</small>
          {call.resultSummary && <small className={workspacePrimitives.listMeta}>result · {call.resultSummary}</small>}
        </article>
      ))}
    </div>
  )
}

function TraceReplay({
  frames,
  replayIndex,
  onReplayIndexChange,
}: {
  frames: TraceReplayFrame[]
  replayIndex: number
  onReplayIndexChange: (index: number) => void
}) {
  if (!frames.length) return <div className={workspacePrimitives.emptyState}>这个 run 还没有可回放帧。</div>
  const index = Math.max(0, Math.min(replayIndex, frames.length - 1))
  const frame = frames[index]!
  return (
    <div className="grid gap-2 rounded-[18px] border-2 border-animal-border bg-[#fffdf5] p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className={chipClassName(0)}>Frame {index + 1}/{frames.length}</span>
        <div className="flex gap-1">
          <button className={traceStepButtonClassName} type="button" disabled={index <= 0} onClick={() => onReplayIndexChange(index - 1)}>上一步</button>
          <button className={traceStepButtonClassName} type="button" disabled={index >= frames.length - 1} onClick={() => onReplayIndexChange(index + 1)}>下一步</button>
        </div>
      </div>
      <strong className={workspacePrimitives.headingTitle}>{frame.title}</strong>
      <p className={workspacePrimitives.note}>{frame.description}</p>
      <input
        className="w-full accent-[var(--animal-primary)]"
        max={frames.length - 1}
        min={0}
        type="range"
        value={index}
        onChange={(event) => onReplayIndexChange(Number(event.target.value))}
      />
    </div>
  )
}

function TraceSafety({ findings }: { findings: TraceSafetyFinding[] }) {
  if (!findings.length) return <div className={workspacePrimitives.emptyState}>这个 run 暂无安全检查。</div>
  return (
    <div className={workspacePrimitives.list}>
      {findings.map((finding) => (
        <article className={traceRowClassName(finding.status === 'fail' ? 'error' : finding.status === 'warn' ? 'active' : 'done')} key={finding.id}>
          <span className={chipClassName(finding.status === 'pass' ? 0 : finding.status === 'warn' ? 2 : 3)}>{finding.status}</span>
          <strong className={workspacePrimitives.listTitle}>{finding.label}</strong>
          <small className={workspacePrimitives.listMeta}>{finding.detail}</small>
        </article>
      ))}
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

function traceTabClassName(active: boolean) {
  return classNames(
    'rounded-[var(--animal-radius-pill)] border-2 px-3 py-1 text-[0.68rem] font-[850] transition',
    active
      ? 'border-animal-green bg-[#ecffd9] text-animal-text shadow-[0_3px_0_var(--animal-success-shadow)]'
      : 'border-animal-border bg-[#fffdf5] text-[var(--animal-text-muted)] hover:text-animal-text',
  )
}

function traceRowClassName(status: string) {
  return classNames(
    'grid min-w-0 gap-1 rounded-[16px] border-2 p-2 [overflow-wrap:anywhere]',
    status === 'error'
      ? 'border-[#d46a4c] bg-[#ffe7dc]'
      : status === 'blocked'
        ? 'border-[#e1a44f] bg-[#fff1c9]'
        : status === 'active'
          ? 'border-animal-green bg-[#ecffd9]'
          : 'border-animal-border bg-[#fffdf5]',
  )
}

const traceStepButtonClassName = 'rounded-[var(--animal-radius-pill)] border-2 border-animal-border bg-white px-2 py-1 text-[0.68rem] font-[850] text-animal-text disabled:cursor-not-allowed disabled:opacity-45'

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value
}
