import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { AgentEvent } from '@planpal/domain'
import { CaretRightIcon as CaretRight } from '@phosphor-icons/react/CaretRight'
import { SlidersHorizontalIcon as SlidersHorizontal } from '@phosphor-icons/react/SlidersHorizontal'
import { SparkleIcon as Sparkle } from '@phosphor-icons/react/Sparkle'
import { XIcon as X } from '@phosphor-icons/react/X'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { deletePlan, isAbortError, listPlans, streamCreatePlan } from '../lib/api'
import { appClasses, homeClasses } from '../lib/appClasses'
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
    summary: '明天下雨，两个人下午约会…',
    prompt: '明天下雨，2 个人下午到晚上约会，室内优先，少走路，晚饭别排队，最后想有一个安静收尾。',
  },
  {
    title: '客户接待',
    summary: '周五下午接待 4 位客户…',
    prompt: '周五下午接待 4 位客户，从产品演示到晚餐和简短复盘，路线要稳，不能太赶，预算中高。',
  },
  {
    title: '生日聚会',
    summary: '周末给朋友过生日，想有惊喜…',
    prompt: '周末给朋友过生日，6 个人，从下午玩到晚上，需要一个小惊喜，晚餐适合聊天，预算别失控。',
  },
] satisfies Array<{
  prompt: string
  summary: string
  title: string
}>

export function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [quickPlan, setQuickPlan] = useState<QuickPlanState>(defaultQuickPlan)
  const [quickOpen, setQuickOpen] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [creationEvents, setCreationEvents] = useState<AgentEvent[]>([])
  const createPlanAbortRef = useRef<AbortController | null>(null)
  const config = useStoredModelConfig()
  const recentPlansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: ({ signal }) => listPlans(signal),
  })
  const deletePlanMutation = useMutation({
    mutationFn: deletePlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plans'] })
    },
  })
  const recentPlans = recentPlansQuery.data ?? []
  const visibleRecentPlans = showAllRecent ? recentPlans : recentPlans.slice(0, 4)

  useEffect(() => () => {
    const activeRequest = createPlanAbortRef.current
    createPlanAbortRef.current = null
    activeRequest?.abort()
  }, [])

  useEffect(() => {
    if (!quickOpen) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQuickOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [quickOpen])

  async function submit(customPrompt = prompt) {
    const nextPrompt = customPrompt.trim()
    if (!nextPrompt || isSubmitting) return
    if (!config) {
      setError('请先在模型设置中完成连接测试并保存配置。')
      return
    }
    const abortController = new AbortController()
    createPlanAbortRef.current?.abort()
    createPlanAbortRef.current = abortController
    setIsSubmitting(true)
    setError('')
    setCreationEvents([])
    try {
      const result = await streamCreatePlan(nextPrompt, config, (event) => {
        setCreationEvents((current) => mergeCreationEvent(current, event))
      }, abortController.signal)
      await navigate({ to: '/plans/$planId', params: { planId: result.planId } })
    } catch (createError) {
      if (!isAbortError(createError)) {
        setError(createError instanceof Error ? createError.message : '创建计划失败')
      }
    } finally {
      if (createPlanAbortRef.current === abortController) {
        createPlanAbortRef.current = null
        setIsSubmitting(false)
      }
    }
  }

  function updateQuickPlan<T extends keyof QuickPlanState>(field: T, value: QuickPlanState[T]) {
    setQuickPlan((current) => ({ ...current, [field]: value }))
  }

  function applyQuickPlan() {
    const nextPrompt = buildQuickPlanPrompt(quickPlan)
    setPrompt(nextPrompt)
    setQuickOpen(false)
  }

  return (
    <main className={homeClasses.root}>
      <div className={homeClasses.landscape} aria-hidden="true" />
      <section className={homeClasses.launchPad} aria-label="创建计划">
        <div className={homeClasses.launchCopy}>
          <span className={homeClasses.heroMascot} aria-hidden="true">:D</span>
          <h1 className={homeClasses.launchTitle}>今天想安排什么？</h1>
          <p className={homeClasses.launchText}>说说时间、人数和偏好，我来把它安排好。</p>
        </div>
        <div className={homeClasses.heroMain}>
          <div className={homeClasses.inputStack}>
            <div className={homeClasses.promptLabel}>
              <span className={homeClasses.promptLabelText}>描述你的计划</span>
              <section className={homeClasses.promptShell} aria-label="计划开局要求">
                <textarea
                  aria-label="计划开局要求"
                  className={homeClasses.textarea}
                  value={prompt}
                  placeholder="告诉我想安排什么，或者点快速计划补齐信息…"
                  onChange={(event) => setPrompt(event.target.value)}
                />
                <div className={homeClasses.promptActions}>
                  <div className={homeClasses.actionMeta}>
                    <button
                      className={homeClasses.quickToggleState}
                      type="button"
                      aria-expanded={quickOpen}
                      onClick={() => setQuickOpen(true)}
                    >
                      <SlidersHorizontal aria-hidden="true" size={18} weight="bold" />
                      快速计划
                    </button>
                  </div>
                  <span className={homeClasses.connectionMeta}>
                    {config ? '模型已就绪' : '连接模型后即可开始'}
                  </span>
                  <button className={homeClasses.primaryButton} type="button" onClick={() => void submit()} disabled={isSubmitting || !prompt.trim() || !config}>
                    <Sparkle aria-hidden="true" size={18} weight="fill" />
                    {isSubmitting ? '安排中' : '开始'}
                  </button>
                </div>
              </section>
              <div className={homeClasses.promptSuggestions} aria-label="常用计划示例">
                <span className={homeClasses.promptSuggestionLabel}>常用计划示例</span>
                {demoPromptExamples.map((preset) => (
                  <button
                    className={homeClasses.promptSuggestionButton}
                    key={preset.title}
                    title={preset.prompt}
                    type="button"
                    onClick={() => setPrompt(preset.prompt)}
                  >
                    {preset.summary}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {(isSubmitting || creationEvents.length > 0) && (
            <CreationProgress events={creationEvents} />
          )}
          {!config && (
            <p className={homeClasses.note}>
              Agent 工作台需要可用的模型连接。请先前往 <Link to="/settings/model">模型设置</Link> 完成测试并保存。
            </p>
          )}
          {error && <p className={homeClasses.launchError}>{error}</p>}
        </div>
      </section>

      {recentPlans.length > 0 && (
        <section className={homeClasses.recentRail} aria-label="最近计划">
          <div className={homeClasses.recentHeading}>
            <span className={homeClasses.recentHeadingCopy}>
              <strong className={homeClasses.recentHeadingTitle}>最近计划</strong>
            </span>
          </div>
          {visibleRecentPlans.length > 0 && (
            <div className={homeClasses.recentList}>
              {visibleRecentPlans.map((plan) => (
                <article className={homeClasses.recentItem} key={plan.id}>
                  <Link className={homeClasses.recentLink} to="/plans/$planId" params={{ planId: plan.id }}>
                    <strong className={homeClasses.recentTitle}>{plan.title}</strong>
                    <time className={homeClasses.recentMeta} dateTime={plan.updatedAt}>{formatRecentPlanTime(plan.updatedAt)}</time>
                    <span className={homeClasses.recentChevron} aria-hidden="true">
                      <CaretRight size={18} weight="bold" />
                    </span>
                  </Link>
                  <button
                    className={homeClasses.recentDelete}
                    type="button"
                    aria-label={`删除计划：${plan.title}`}
                    disabled={deletePlanMutation.isPending}
                    onClick={() => deletePlanMutation.mutate(plan.id)}
                  >
                    删除
                  </button>
                </article>
              ))}
              {recentPlans.length > 4 && (
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
                      {showAllRecent ? `当前显示全部 ${recentPlans.length} 条` : `还有 ${recentPlans.length - 4} 条计划`}
                    </small>
                  </span>
                  <span className={homeClasses.recentFooterAction}>{showAllRecent ? '收起' : '展开'}</span>
                </button>
              )}
            </div>
          )}
          {deletePlanMutation.isError && (
            <p className={appClasses.errorText}>{deletePlanMutation.error.message}</p>
          )}
        </section>
      )}
      {quickOpen && (
        <QuickPlanDialog
          value={quickPlan}
          onApply={applyQuickPlan}
          onClose={() => setQuickOpen(false)}
          onChange={updateQuickPlan}
        />
      )}
    </main>
  )
}

function QuickPlanDialog({
  onApply,
  onChange,
  onClose,
  value,
}: {
  onApply: () => void
  onChange: <T extends keyof QuickPlanState>(field: T, value: QuickPlanState[T]) => void
  onClose: () => void
  value: QuickPlanState
}) {
  const startPercent = (value.startHour / 24) * 100
  const endPercent = (value.endHour / 24) * 100
  const bubblePercent = Math.max(12, Math.min(88, (startPercent + endPercent) / 2))

  return (
    <div
      className={homeClasses.quickBackdrop}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <section
        aria-describedby="quick-plan-description"
        aria-labelledby="quick-plan-title"
        aria-modal="true"
        className={homeClasses.quickDialog}
        role="dialog"
      >
        <header className={homeClasses.quickHeader}>
          <span className={homeClasses.quickBadge}>补充信息</span>
          <h2 className={homeClasses.quickTitle} id="quick-plan-title">补充出行信息</h2>
          <p className={homeClasses.quickDescription} id="quick-plan-description">
            填好后会整理成一段完整描述，你还可以继续修改。
          </p>
          <button aria-label="关闭快速计划" className={homeClasses.quickClose} type="button" onClick={onClose}>
            <X aria-hidden="true" size={19} weight="bold" />
          </button>
        </header>

        <div className={homeClasses.quickBody}>
          <div className={homeClasses.controlStrip}>
            <div className={homeClasses.range}>
              <span className={homeClasses.segmentedLabel}>出行时间段</span>
              <div className={homeClasses.timeControl}>
                <output
                  className={homeClasses.timeBubble}
                  style={{ left: `${bubblePercent}%` }}
                >
                  {formatHourLabel(value.startHour)} <span aria-hidden="true">到</span> {formatHourLabel(value.endHour)}
                </output>
                <div className={homeClasses.timeRail}>
                  <span
                    className={homeClasses.timeSelection}
                    style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }}
                  />
                  <input
                    aria-label="开始时间"
                    className={homeClasses.timeSlider}
                    max={23.5}
                    min={0}
                    step={0.5}
                    type="range"
                    value={value.startHour}
                    onChange={(event) => onChange('startHour', Math.min(Number(event.target.value), value.endHour - 0.5))}
                  />
                  <input
                    aria-label="结束时间"
                    className={homeClasses.timeSlider}
                    max={24}
                    min={0.5}
                    step={0.5}
                    type="range"
                    value={value.endHour}
                    onChange={(event) => onChange('endHour', Math.max(Number(event.target.value), value.startHour + 0.5))}
                  />
                </div>
                <div className={homeClasses.timeTicks} aria-hidden="true">
                  {[0, 6, 12, 18, 24].map((hour) => (
                    <span className={homeClasses.timeTick} key={hour}>{hour}</span>
                  ))}
                </div>
              </div>
            </div>

            <QuickOptionGroup
              label="出行人数"
              value={value.headcount}
              options={[
                ['1', '1 人'],
                ['2', '2 人'],
                ['3', '3 人'],
                ['4', '4+ 人'],
              ]}
              onChange={(nextValue) => onChange('headcount', nextValue)}
            />
            <QuickOptionGroup
              label="地点范围"
              value={value.locationScope}
              options={[
                ['nearby', '就近安排'],
                ['business', '指定商圈'],
                ['flexible', '范围放宽'],
              ]}
              onChange={(nextValue) => onChange('locationScope', nextValue as QuickPlanState['locationScope'])}
            />
            <QuickOptionGroup
              label="活动节奏"
              value={value.pace}
              options={[
                ['relaxed', '轻松一点'],
                ['normal', '正常安排'],
                ['compact', '多安排一点'],
              ]}
              onChange={(nextValue) => onChange('pace', nextValue as QuickPlanState['pace'])}
            />
            <label className={homeClasses.segmentedGroup}>
              <span className={homeClasses.segmentedLabel}>其它偏好</span>
              <input
                className={homeClasses.inlineInput()}
                value={value.extra}
                placeholder="室内、少排队、带孩子、不能吃辣、预算低一点…"
                onChange={(event) => onChange('extra', event.target.value)}
              />
            </label>
          </div>
          <button className={homeClasses.quickSubmit} type="button" onClick={onApply}>
            填入计划描述
          </button>
        </div>
      </section>
    </div>
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
      <div
        className={homeClasses.segmentedOptions}
        style={{ '--option-count': options.length } as CSSProperties}
      >
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

function CreationProgress({ events }: { events: AgentEvent[] }) {
  const latest = events[events.length - 1]
  const started = events.some((event) => event.type === 'agent.started')
  const modelStarted = events.some((event) => event.type === 'agent.model.started')
  const modelSettled = events.some((event) => event.type === 'agent.model.finished' || event.type === 'agent.model.error')
  const finished = events.some((event) => event.type === 'agent.finished')
  const message = latest?.message ?? '正在准备创建计划...'
  const steps = [
    { key: 'understand', label: '理解需求', state: started ? 'done' : 'active' },
    {
      key: 'generate',
      label: '生成候选方案',
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
      <small className={homeClasses.progressHint}>模型只生成候选方向；进入拼图后仍由确定性命令修改计划。</small>
    </section>
  )
}

function mergeCreationEvent(events: AgentEvent[], next: AgentEvent) {
  if (events.some((event) => event.id === next.id)) return events
  return [...events, next]
}

function formatRecentPlanTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚更新'

  const elapsed = Math.max(0, Date.now() - date.getTime())
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (elapsed < minute) return '刚刚'
  if (elapsed < hour) return `${Math.floor(elapsed / minute)} 分钟前`
  if (elapsed < day) return `${Math.floor(elapsed / hour)} 小时前`
  if (elapsed < 2 * day) {
    return `昨天 ${new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)}`
  }
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)} 天前`

  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}
