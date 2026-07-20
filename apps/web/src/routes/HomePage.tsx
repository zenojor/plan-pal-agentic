import { useEffect, useRef, useState } from 'react'
import type { AgentEvent } from '@planpal/domain'
import { CaretRightIcon as CaretRight } from '@phosphor-icons/react/CaretRight'
import { ChatCircleDotsIcon as ChatCircleDots } from '@phosphor-icons/react/ChatCircleDots'
import { SlidersHorizontalIcon as SlidersHorizontal } from '@phosphor-icons/react/SlidersHorizontal'
import { SparkleIcon as Sparkle } from '@phosphor-icons/react/Sparkle'
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
    prompt: '明天下雨，2 个人下午到晚上约会，室内优先，少走路，晚饭别排队，最后想有一个安静收尾。',
  },
  {
    title: '客户接待',
    prompt: '周五下午接待 4 位客户，从产品演示到晚餐和简短复盘，路线要稳，不能太赶，预算中高。',
  },
  {
    title: '生日聚会',
    prompt: '周末给朋友过生日，6 个人，从下午玩到晚上，需要一个小惊喜，晚餐适合聊天，预算别失控。',
  },
  {
    title: '亲子半日',
    prompt: '周日上午亲子 3 人室内半日计划，孩子 6 岁，节奏轻松，要有休息点，尽量不依赖天气。',
  },
] satisfies Array<{
  prompt: string
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
      <section className={homeClasses.launchPad} aria-label="创建计划">
        <div className={homeClasses.launchCopy}>
          <h1 className={homeClasses.launchTitle}>
            <span>今天想安排什么？</span>
            <span className={homeClasses.launchSparkles} aria-hidden="true">
              <Sparkle className={homeClasses.launchSparkleLarge} size={30} weight="fill" />
              <Sparkle className={homeClasses.launchSparkleSmall} size={16} weight="fill" />
            </span>
          </h1>
          <p className={homeClasses.launchText}>把时间、人数和偏好告诉我</p>
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
                  placeholder="描述你的计划"
                  onChange={(event) => setPrompt(event.target.value)}
                />
                <div className={homeClasses.promptActions}>
                  <div className={homeClasses.actionMeta}>
                    <button
                      className={homeClasses.quickToggleState}
                      type="button"
                      aria-expanded={quickOpen}
                      onClick={() => setQuickOpen((open) => !open)}
                    >
                      <SlidersHorizontal aria-hidden="true" size={18} weight="bold" />
                      {quickOpen ? '收起条件' : '按条件填写'}
                    </button>
                  </div>
                  <button className={homeClasses.primaryButton} type="button" onClick={() => void submit()} disabled={isSubmitting || !prompt.trim() || !config}>
                    <Sparkle aria-hidden="true" size={18} weight="fill" />
                    {isSubmitting ? '创建中' : '生成计划'}
                  </button>
                </div>
              </section>
              <div className={homeClasses.promptSuggestions} aria-label="常用计划示例">
                <span className={homeClasses.promptSuggestionLabel}>常用计划示例</span>
                {demoPromptExamples.map((preset) => (
                  <button
                    className={homeClasses.promptSuggestionButton}
                    key={preset.title}
                    type="button"
                    onClick={() => setPrompt(preset.prompt)}
                  >
                    <ChatCircleDots aria-hidden="true" className={homeClasses.promptSuggestionIcon} size={17} weight="bold" />
                    {preset.title}
                  </button>
                ))}
              </div>
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
                  onClick={applyQuickPlan}
                >
                  填入描述
                </button>
              </div>
            )}
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
      {recentPlansQuery.isError && (
        <p className={homeClasses.note}>最近计划暂时不可用；仍然可以直接创建新计划。</p>
      )}
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
