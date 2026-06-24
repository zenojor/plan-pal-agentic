import { useState } from 'react'
import type { AgentEvent } from '@planpal/domain'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { deletePlan, listPlans, streamCreatePlan } from '../lib/api'
import { appClasses, homeClasses } from '../lib/appClasses'
import { maskApiKey } from '../lib/modelConfig'
import { buildQuickPlanPrompt, formatHourLabel, type QuickPlanState } from '../lib/quickPlan'
import { useStoredModelConfig } from '../lib/useStoredModelConfig'

const defaultQuickPlan: QuickPlanState = {
  endHour: 21.5,
  extra: '',
  headcount: '2',
  locationScope: 'nearby',
  pace: 'relaxed',
  startHour: 14,
  topic: '附近轻松玩到晚上，晚饭别太远',
}

const demoPromptExamples = [
  {
    title: '雨天约会',
    summary: '室内优先 · 少走路',
    prompt: '明天下雨，2 个人下午到晚上约会，室内优先，少走路，晚饭别排队，最后想有一个安静收尾。',
  },
  {
    title: '客户接待',
    summary: '稳妥路线 · 留复盘',
    prompt: '周五下午接待 4 位客户，从产品演示到晚餐和简短复盘，路线要稳，不能太赶，预算中高。',
  },
  {
    title: '生日多人',
    summary: '惊喜节点 · 预算可控',
    prompt: '周末给朋友过生日，6 个人，从下午玩到晚上，需要一个小惊喜，晚餐适合聊天，预算别失控。',
  },
  {
    title: '亲子半日',
    summary: '低风险 · 可跳过',
    prompt: '周日上午亲子 3 人室内半日计划，孩子 6 岁，节奏轻松，要有休息点，尽量不依赖天气。',
  },
] satisfies Array<{
  prompt: string
  summary: string
  title: string
}>

export function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [prompt, setPrompt] = useState('明天下午 2 个人想在附近轻松玩到晚上，晚饭别太远')
  const [quickPlan, setQuickPlan] = useState<QuickPlanState>(defaultQuickPlan)
  const [quickOpen, setQuickOpen] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [creationEvents, setCreationEvents] = useState<AgentEvent[]>([])
  const config = useStoredModelConfig()
  const recentPlansQuery = useQuery({ queryKey: ['plans'], queryFn: listPlans })
  const deletePlanMutation = useMutation({
    mutationFn: deletePlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plans'] })
    },
  })
  const recentPlans = (recentPlansQuery.data ?? []).slice(0, 6)
  const visibleRecentPlans = showAllRecent ? recentPlans : recentPlans.slice(0, 3)

  async function submit(customPrompt = prompt) {
    const nextPrompt = customPrompt.trim()
    if (!nextPrompt || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    setCreationEvents([])
    try {
      const result = await streamCreatePlan(nextPrompt, config, (event) => {
        setCreationEvents((current) => mergeCreationEvent(current, event))
      })
      await navigate({ to: '/plans/$planId', params: { planId: result.planId } })
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '创建计划失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  function updateQuickPlan<T extends keyof QuickPlanState>(field: T, value: QuickPlanState[T]) {
    setQuickPlan((current) => ({ ...current, [field]: value }))
  }

  function submitQuickPlan() {
    const nextPrompt = buildQuickPlanPrompt(quickPlan)
    setPrompt(nextPrompt)
    void submit(nextPrompt)
  }

  return (
    <main className={homeClasses.root}>
      <section className={homeClasses.launchPad} aria-label="创建计划">
        <div className={homeClasses.launchHeader}>
          <span className={appClasses.eyebrow}>Start</span>
          <Link className={homeClasses.modelLink(Boolean(config))} to="/settings/model">
            {config ? `${config.model} · ${maskApiKey(config.apiKey)}` : '离线 fallback 可用'}
          </Link>
        </div>
        <div className={homeClasses.launchCopy}>
          <h1 className={homeClasses.launchTitle}>今天想怎么安排？</h1>
          <p className={homeClasses.launchText}>把时间、人数和偏好说清楚。PlanPal 会先给 3 个方向，选定后进入多列工作台继续改。</p>
        </div>

        <div className={homeClasses.inputStack}>
          <div className={homeClasses.promptLabel}>
            <span className={homeClasses.promptLabelText}>计划开局要求</span>
            <section className={homeClasses.promptShell} aria-label="计划开局要求">
              <textarea
                aria-label="计划开局要求"
                className={homeClasses.textarea}
                value={prompt}
                placeholder="比如：明天下午 2 个人，附近轻松玩到晚上，晚饭别太远..."
                onChange={(event) => setPrompt(event.target.value)}
              />
              <div className={homeClasses.promptActions}>
                <button className={homeClasses.primaryButton} type="button" onClick={() => void submit()} disabled={isSubmitting || !prompt.trim()}>
                  <span aria-hidden="true">✦</span>
                  {isSubmitting ? '创建中' : '生成计划'}
                </button>
              </div>
            </section>
          </div>

          <section className={homeClasses.quickPanel(quickOpen)} aria-label="快速参数生成">
            <div className={homeClasses.quickToggle}>
              <span className={homeClasses.quickToggleIcon} aria-hidden="true">↯</span>
              <span className={homeClasses.quickToggleCopy}>
                <strong className={homeClasses.quickToggleTitle}>快速参数生成</strong>
                <small className={homeClasses.quickToggleHint}>可选辅助：用结构化参数拼一条完整开局描述。</small>
              </span>
              <button
                className={homeClasses.quickToggleState}
                type="button"
                aria-expanded={quickOpen}
                onClick={() => setQuickOpen((open) => !open)}
              >
                <span className={homeClasses.quickToggleStateLabel}>{quickOpen ? '收起' : '展开'}</span>
                <span className={homeClasses.quickToggleChevron(quickOpen)} aria-hidden="true">▾</span>
              </button>
            </div>

            {quickOpen && (
              <div className={homeClasses.quickBody}>
                <section className={homeClasses.controlStrip} aria-label="快速补充">
                  <label className={homeClasses.range}>
                    <span>开始 {formatHourLabel(quickPlan.startHour)}</span>
                    <input
                      max={23}
                      min={0}
                      step={0.5}
                      type="range"
                      value={quickPlan.startHour}
                      onChange={(event) => updateQuickPlan('startHour', Math.min(Number(event.target.value), quickPlan.endHour - 0.5))}
                    />
                  </label>
                  <label className={homeClasses.range}>
                    <span>结束 {formatHourLabel(quickPlan.endHour)}</span>
                    <input
                      max={24}
                      min={1}
                      step={0.5}
                      type="range"
                      value={quickPlan.endHour}
                      onChange={(event) => updateQuickPlan('endHour', Math.max(Number(event.target.value), quickPlan.startHour + 0.5))}
                    />
                  </label>
                  <QuickOptionGroup
                    label="人数"
                    value={quickPlan.headcount}
                    options={[
                      ['1', '1 人'],
                      ['2', '2 人'],
                      ['3', '3 人'],
                      ['4', '4 人'],
                    ]}
                    onChange={(value) => updateQuickPlan('headcount', value)}
                  />
                  <QuickOptionGroup
                    label="范围"
                    value={quickPlan.locationScope}
                    options={[
                      ['nearby', '就近'],
                      ['business', '商圈'],
                      ['flexible', '放宽'],
                    ]}
                    onChange={(value) => updateQuickPlan('locationScope', value as QuickPlanState['locationScope'])}
                  />
                  <QuickOptionGroup
                    label="节奏"
                    value={quickPlan.pace}
                    options={[
                      ['relaxed', '轻松'],
                      ['normal', '正常'],
                      ['compact', '多安排'],
                    ]}
                    onChange={(value) => updateQuickPlan('pace', value as QuickPlanState['pace'])}
                  />
                  <input
                    className={homeClasses.inlineInput(true)}
                    value={quickPlan.topic}
                    placeholder="想做什么"
                    onChange={(event) => updateQuickPlan('topic', event.target.value)}
                  />
                  <input
                    className={homeClasses.inlineInput()}
                    value={quickPlan.extra}
                    placeholder="补充：室内优先、别太贵..."
                    onChange={(event) => updateQuickPlan('extra', event.target.value)}
                  />
                </section>
                <button
                  type="button"
                  className={homeClasses.quickSubmit}
                  onClick={submitQuickPlan}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '生成中' : '用快速参数生成'}
                </button>
              </div>
            )}
          </section>
        </div>

        {(isSubmitting || creationEvents.length > 0) && (
          <CreationProgress events={creationEvents} hasModelConfig={Boolean(config)} />
        )}
        {error && <p className={homeClasses.launchError}>{error}</p>}
      </section>

      <section className={homeClasses.promptRail} aria-label="复杂任务示例">
        <div className={homeClasses.sectionHeading}>
          <strong className={homeClasses.sectionTitle}>试试这些方向</strong>
        </div>
        {demoPromptExamples.map((preset, index) => (
          <button className={homeClasses.promptButton} key={preset.title} type="button" onClick={() => setPrompt(preset.prompt)}>
            <span className={homeClasses.promptButtonIcon} aria-hidden="true">{formatHomeIndex(index)}</span>
            <span className={homeClasses.promptButtonCopy}>
              <strong className={homeClasses.promptButtonTitle}>{preset.title}</strong>
              <small className={homeClasses.promptButtonSummary}>{preset.summary}</small>
            </span>
            <span className={homeClasses.promptButtonArrow} aria-hidden="true">→</span>
          </button>
        ))}
      </section>

      <section className={homeClasses.recentRail} aria-label="最近计划">
        <div className={homeClasses.recentHeading}>
          <strong className={homeClasses.recentHeadingTitle}>最近计划</strong>
          <small className={homeClasses.recentHeadingMeta}>{recentPlans.length > 0 ? `${recentPlans.length} 条` : '暂无历史'}</small>
        </div>
        {visibleRecentPlans.length > 0 ? (
          <div className={homeClasses.recentList}>
            {visibleRecentPlans.map((plan, index) => (
              <article className={homeClasses.recentItem} key={plan.id}>
                <span className={homeClasses.recentIcon} aria-hidden="true">{formatHomeIndex(index)}</span>
                <Link className={homeClasses.recentLink} to="/plans/$planId" params={{ planId: plan.id }}>
                  <strong className={homeClasses.recentTitle}>{plan.title}</strong>
                  <span className={homeClasses.recentType}>{formatPlanType(plan.title)}</span>
                  <span className={homeClasses.recentMeta}>{formatPlanStatus(plan.status)} · V{plan.currentVersion} · {plan.segments.length} 节点</span>
                  <time className={homeClasses.recentMeta} dateTime={plan.updatedAt}>{formatRecentPlanTime(plan.updatedAt)}</time>
                </Link>
                <button
                  className={homeClasses.recentDelete}
                  type="button"
                  disabled={deletePlanMutation.isPending}
                  onClick={() => deletePlanMutation.mutate(plan.id)}
                >
                  清理
                </button>
                <span className={homeClasses.recentMore} aria-hidden="true">•••</span>
              </article>
            ))}
            {recentPlans.length > 3 && (
              <button
                aria-expanded={showAllRecent}
                className={homeClasses.recentFooter}
                type="button"
                onClick={() => setShowAllRecent((current) => !current)}
              >
                <span className={homeClasses.recentFooterCopy}>
                  <strong className={homeClasses.recentFooterTitle}>
                    {showAllRecent ? '收起计划列表' : '展开全部计划'}
                  </strong>
                  <small className={homeClasses.recentFooterHint}>
                    {showAllRecent ? `当前显示全部 ${recentPlans.length} 条` : `已显示 3 条，还有 ${recentPlans.length - 3} 条可展开`}
                  </small>
                </span>
                <span className={homeClasses.recentFooterAction}>
                  {showAllRecent ? '收起' : '展开'}
                  <span className={homeClasses.recentFooterIcon} aria-hidden="true">{showAllRecent ? '▴' : '▾'}</span>
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className={homeClasses.recentEmpty}>
            <span className={homeClasses.recentEmptyIcon} aria-hidden="true">00</span>
            <span className={homeClasses.recentEmptyCopy}>
              <strong className={homeClasses.recentEmptyTitle}>还没有最近计划</strong>
              <small className={homeClasses.recentEmptyHint}>
                生成第一个计划后，这里会保留最近工作台入口，方便继续修改、确认和回放。
              </small>
            </span>
            <button
              className={homeClasses.recentEmptyAction}
              type="button"
              disabled={isSubmitting || !prompt.trim()}
              onClick={() => void submit()}
            >
              {isSubmitting ? '创建中' : '生成当前计划'}
            </button>
          </div>
        )}
        {deletePlanMutation.isError && (
          <p className={appClasses.errorText}>{deletePlanMutation.error.message}</p>
        )}
        {recentPlansQuery.isError && (
          <p className={homeClasses.note}>最近计划暂时不可用；仍然可以直接创建新计划。</p>
        )}
      </section>
    </main>
  )
}

function QuickOptionGroup({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<[string, string]>
  value: string
}) {
  return (
    <div className={homeClasses.segmentedGroup}>
      <span className={homeClasses.segmentedLabel}>{label}</span>
      <div className={homeClasses.segmentedOptions}>
        {options.map(([optionValue, optionLabel]) => (
          <button
            className={homeClasses.segmentedButton(value === optionValue)}
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  )
}

function CreationProgress({ events, hasModelConfig }: { events: AgentEvent[]; hasModelConfig: boolean }) {
  const latest = events[events.length - 1]
  const started = events.some((event) => event.type === 'agent.started')
  const modelStarted = events.some((event) => event.type === 'agent.model.started')
  const modelSettled = events.some((event) => event.type === 'agent.model.finished' || event.type === 'agent.model.error')
  const finished = events.some((event) => event.type === 'agent.finished')
  const message = latest?.message ?? '正在准备创建计划...'
  const generationLabel = hasModelConfig ? '生成候选方案' : '准备离线方案'
  const steps = [
    { key: 'understand', label: '理解需求', state: started ? 'done' : 'active' },
    {
      key: 'generate',
      label: generationLabel,
      state: finished || modelSettled ? 'done' : started || modelStarted ? 'active' : 'pending',
    },
    { key: 'workspace', label: '准备工作台', state: finished ? 'done' : modelSettled ? 'active' : 'pending' },
  ]

  return (
    <section className={homeClasses.progress} aria-live="polite">
      <span className={appClasses.eyebrow}>Creating</span>
      <strong className={homeClasses.progressTitle}>{message}</strong>
      <ol className={homeClasses.progressList}>
        {steps.map((step) => (
          <li className={homeClasses.progressStep(step.state)} key={step.key}>
            <span className={homeClasses.progressDot(step.state)} />
            {step.label}
          </li>
        ))}
      </ol>
      <small className={homeClasses.progressHint}>
        {hasModelConfig
          ? '模型只生成候选方向；进入拼图后仍由确定性命令修改计划。'
          : '当前没有保存模型配置，会使用本地 fallback 方案。'}
      </small>
    </section>
  )
}

function mergeCreationEvent(events: AgentEvent[], next: AgentEvent) {
  if (events.some((event) => event.id === next.id)) return events
  return [...events, next]
}

function formatPlanStatus(status: string) {
  const labels: Record<string, string> = {
    confirmed: '已确认',
    draft: '草稿',
    failed: '失败',
    pending_confirmation: '待确认',
    ready: '可编辑',
  }
  return labels[status] ?? status
}

function formatHomeIndex(index: number) {
  return String(index + 1).padStart(2, '0')
}

function formatPlanType(title: string) {
  if (/客户|接待|工作|产品|复盘/.test(title)) return '工作计划'
  if (/生日|约会|亲子|朋友|玩/.test(title)) return '生活计划'
  return '个人计划'
}

function formatRecentPlanTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚更新'
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(date)
}
