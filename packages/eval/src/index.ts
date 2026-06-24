import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDefaultToolRegistry, PlanPalAgentRuntime, type AgentModelGateway, type ClientModelConfig } from '../../agent/src/index.ts'
import { createInMemoryStores } from '../../db/src/index.ts'
import {
  applyPlanCommand,
  buildAgentTraceSnapshot,
  containsTraceSecret,
  createId,
  createPlanFromPrompt,
  getFictionalPoiById,
  normalizeTraceForComparison,
  type AgentEvent,
  type AgentTraceSnapshot,
  type MerchantServiceCategory,
  type PendingAction,
  type Plan,
  type PlanSegment,
  type ToolCallRecord,
} from '../../domain/src/index.ts'

type EvalSuite = 'golden' | 'live-smoke'
type EvalProvider = 'deepseek'
type SetupKind = 'default' | 'movie' | 'hotel' | 'locked-dining'
type ResumeMode = 'candidate-first' | 'service-first' | 'confirm-command'

type EvalExpectation = {
  commandTypes?: string[]
  errorIncludes?: string
  finalStatus?: Plan['status']
  pendingKind?: PendingAction['kind']
  planHasServiceSelection?: boolean
  runStatus?: 'completed' | 'waiting_for_user'
  toolNames?: string[]
}

type EvalScenario = {
  id: string
  title: string
  tags: string[]
  initialPrompt: string
  message: string
  setup?: SetupKind
  selectedPhase?: PlanSegment['phase']
  modelError?: string
  modelReply?: string
  resume?: ResumeMode
  streamReply?: string[]
  useModel?: boolean
  expect: EvalExpectation
}

type EvalCaseResult = {
  id: string
  title: string
  tags: string[]
  passed: boolean
  checks: Array<{ label: string; passed: boolean; detail: string }>
  trace?: ReturnType<typeof normalizeTraceForComparison>
}

type EvalReport = {
  generatedAt: string
  provider?: string
  results: EvalCaseResult[]
  skipped?: boolean
  suite: EvalSuite
  summary: {
    failed: number
    passed: number
    total: number
  }
}

const fakeModelConfig: ClientModelConfig = {
  apiKey: 'sk-eval-secret-for-test',
  baseURL: 'https://api.example.com',
  model: 'eval-fake-chat',
  providerMode: 'openai-compatible',
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.suite === 'live-smoke') {
    const report = await runLiveSmoke(args.provider)
    await writeReport(report)
    printReport(report)
    return
  }

  const report = await runGoldenSuite()
  await writeReport(report)
  printReport(report)
  if (report.summary.failed > 0) process.exitCode = 1
}

function parseArgs(args: string[]): { provider: EvalProvider; suite: EvalSuite } {
  const suiteValue = readArg(args, '--suite') ?? 'golden'
  const providerValue = readArg(args, '--provider') ?? 'deepseek'
  return {
    provider: providerValue === 'deepseek' ? 'deepseek' : 'deepseek',
    suite: suiteValue === 'live-smoke' ? 'live-smoke' : 'golden',
  }
}

function readArg(args: string[], key: string) {
  const index = args.indexOf(key)
  if (index >= 0) return args[index + 1]
  const prefix = `${key}=`
  return args.find((item) => item.startsWith(prefix))?.slice(prefix.length)
}

async function runGoldenSuite(): Promise<EvalReport> {
  const results: EvalCaseResult[] = []
  for (const scenario of goldenScenarios()) {
    results.push(await runScenario(scenario))
  }
  const passed = results.filter((result) => result.passed).length
  return {
    generatedAt: new Date().toISOString(),
    results,
    suite: 'golden',
    summary: {
      failed: results.length - passed,
      passed,
      total: results.length,
    },
  }
}

async function runLiveSmoke(provider: EvalProvider): Promise<EvalReport> {
  const apiKey = process.env.PLANPAL_EVAL_API_KEY?.trim()
  if (!apiKey) {
    return {
      generatedAt: new Date().toISOString(),
      provider,
      results: [],
      skipped: true,
      suite: 'live-smoke',
      summary: { failed: 0, passed: 0, total: 0 },
    }
  }
  const baseURL = process.env.PLANPAL_EVAL_BASE_URL?.trim() || 'https://api.deepseek.com'
  const model = process.env.PLANPAL_EVAL_MODEL?.trim() || 'deepseek-chat'
  const modelConfig: ClientModelConfig = {
    apiKey,
    baseURL,
    model,
    providerMode: 'openai-compatible',
  }
  const liveScenarios: EvalScenario[] = [
    {
      id: 'live-deepseek-qa',
      title: 'DeepSeek QA streaming stays read-only',
      tags: ['live', 'qa'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '你是什么模型，用一句话回答',
      useModel: true,
      expect: { runStatus: 'completed' },
    },
    {
      id: 'live-deepseek-replace',
      title: 'DeepSeek interprets dinner replacement',
      tags: ['live', 'intent', 'candidate'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '把晚饭换近一点',
      useModel: true,
      expect: { pendingKind: 'candidate-selection', runStatus: 'waiting_for_user', toolNames: ['poi.search'] },
    },
    {
      id: 'live-deepseek-add-coffee',
      title: 'DeepSeek interprets add-after request',
      tags: ['live', 'intent', 'candidate'],
      initialPrompt: '下午两个人附近轻松玩',
      message: '中间再加个咖啡休息',
      useModel: true,
      expect: { pendingKind: 'candidate-selection', runStatus: 'waiting_for_user', toolNames: ['poi.search'] },
    },
  ]
  const results: EvalCaseResult[] = []
  for (const scenario of liveScenarios) {
    results.push(await runScenario(scenario, modelConfig))
  }
  const passed = results.filter((result) => result.passed).length
  return {
    generatedAt: new Date().toISOString(),
    provider,
    results,
    suite: 'live-smoke',
    summary: {
      failed: results.length - passed,
      passed,
      total: results.length,
    },
  }
}

async function runScenario(scenario: EvalScenario, liveModelConfig?: ClientModelConfig): Promise<EvalCaseResult> {
  const stores = createInMemoryStores()
  const initialPlan = preparePlan(createPlanFromPrompt(scenario.initialPrompt), scenario.setup)
  const plan = await stores.plans.createPlan(initialPlan)
  const gateway = liveModelConfig ? undefined : createScenarioGateway(scenario)
  const runtime = new PlanPalAgentRuntime(stores, createDefaultToolRegistry(), gateway)
  const events: AgentEvent[] = []
  const selectedSegmentId = findSelectedSegmentId(plan, scenario.selectedPhase)
  let runStatus = ''
  let thrownError = ''
  let pendingAfterRun: PendingAction | undefined

  try {
    const result = await runtime.run({
      planId: plan.id,
      message: scenario.message,
      selectedSegmentId,
      modelConfig: scenario.useModel ? liveModelConfig ?? fakeModelConfig : undefined,
    }, (event) => {
      events.push(event)
    })
    runStatus = result.status
    pendingAfterRun = (await stores.plans.getPlan(plan.id))?.pendingAction
    if (scenario.resume && result.status === 'waiting_for_user' && pendingAfterRun) {
      await runtime.resume({
        planId: plan.id,
        runId: result.runId,
        actionId: pendingAfterRun.id,
        payload: resumePayload(pendingAfterRun, scenario.resume),
      }, (event) => {
        events.push(event)
      })
      runStatus = 'completed'
    }
  } catch (error) {
    thrownError = error instanceof Error ? error.message : String(error)
  }

  const finalPlan = await stores.plans.getPlan(plan.id)
  const runs = await stores.agents.listRuns(plan.id)
  const latestRun = runs.at(-1)
  const toolCalls = latestRun ? await stores.agents.listToolCalls(latestRun.id) : []
  const trace = latestRun
    ? buildAgentTraceSnapshot({
        events: await stores.agents.listEvents(plan.id),
        run: latestRun,
        toolCalls,
        versions: await stores.plans.listPlanVersions(plan.id),
      })
    : undefined
  const checks = evaluateScenario({
    events,
    finalPlan,
    pendingAfterRun,
    runStatus,
    scenario,
    thrownError,
    toolCalls,
    trace,
  })
  return {
    id: scenario.id,
    title: scenario.title,
    tags: scenario.tags,
    passed: checks.every((check) => check.passed),
    checks,
    trace: trace ? normalizeTraceForComparison(trace) : undefined,
  }
}

function createScenarioGateway(scenario: EvalScenario): AgentModelGateway {
  return {
    generateAssistantReply: async () => {
      if (scenario.modelError) throw new Error(scenario.modelError)
      if (scenario.modelReply) return scenario.modelReply
      return JSON.stringify({ action: 'qa', answer: 'PlanPal eval fake model ready.' })
    },
    streamAssistantReply: async (_config, _messages, onDelta) => {
      if (scenario.modelError) throw new Error(scenario.modelError)
      const chunks = scenario.streamReply ?? ['PlanPal ', 'eval ', 'answer']
      for (const chunk of chunks) await onDelta(chunk)
      return chunks.join('')
    },
  }
}

function evaluateScenario(input: {
  events: AgentEvent[]
  finalPlan: Plan | null
  pendingAfterRun?: PendingAction
  runStatus: string
  scenario: EvalScenario
  thrownError: string
  toolCalls: ToolCallRecord[]
  trace?: AgentTraceSnapshot
}) {
  const checks: Array<{ label: string; passed: boolean; detail: string }> = []
  const serializedOutput = JSON.stringify({
    events: input.events,
    finalPlan: input.finalPlan,
    trace: input.trace,
    thrownError: input.thrownError,
  })
  checks.push({
    label: 'secret_redaction',
    passed: !containsTraceSecret(serializedOutput),
    detail: 'events, plan, trace, and errors must not expose API keys',
  })
  if (input.scenario.expect.runStatus) {
    checks.push({
      label: 'run_status',
      passed: input.runStatus === input.scenario.expect.runStatus,
      detail: `expected ${input.scenario.expect.runStatus}, got ${input.runStatus || input.thrownError}`,
    })
  }
  if (input.scenario.expect.errorIncludes) {
    checks.push({
      label: 'expected_error',
      passed: input.thrownError.includes(input.scenario.expect.errorIncludes),
      detail: `expected error containing ${input.scenario.expect.errorIncludes}, got ${input.thrownError || 'none'}`,
    })
  }
  if (input.scenario.expect.pendingKind) {
    checks.push({
      label: 'pending_action',
      passed: input.pendingAfterRun?.kind === input.scenario.expect.pendingKind,
      detail: `expected ${input.scenario.expect.pendingKind}, got ${input.pendingAfterRun?.kind ?? 'none'}`,
    })
  }
  if (input.scenario.expect.toolNames?.length) {
    const actual = new Set(input.toolCalls.map((call) => call.toolName))
    for (const toolName of input.scenario.expect.toolNames) {
      checks.push({
        label: `tool_selection:${toolName}`,
        passed: actual.has(toolName),
        detail: `tools: ${[...actual].join(', ') || 'none'}`,
      })
    }
  }
  if (input.scenario.expect.commandTypes?.length) {
    const actual = new Set<string>(input.trace?.commandWrites.map((write) => write.commandType) ?? [])
    for (const commandType of input.scenario.expect.commandTypes) {
      checks.push({
        label: `command_gate:${commandType}`,
        passed: actual.has(commandType),
        detail: `commands: ${[...actual].join(', ') || 'none'}`,
      })
    }
  }
  if (input.scenario.expect.finalStatus) {
    checks.push({
      label: 'final_plan_status',
      passed: input.finalPlan?.status === input.scenario.expect.finalStatus,
      detail: `expected ${input.scenario.expect.finalStatus}, got ${input.finalPlan?.status ?? 'missing'}`,
    })
  }
  if (input.scenario.expect.planHasServiceSelection) {
    checks.push({
      label: 'service_selection',
      passed: Boolean(input.finalPlan?.serviceSelections?.length),
      detail: `${input.finalPlan?.serviceSelections?.length ?? 0} selected service items`,
    })
  }
  if (input.trace) {
    checks.push({
      label: 'safety_no_external_write',
      passed: input.trace.safetyFindings.every((finding) => finding.id !== 'external-write' || finding.status !== 'fail'),
      detail: 'external-write tools must not succeed',
    })
  }
  return checks
}

function preparePlan(plan: Plan, setup: SetupKind = 'default') {
  if (setup === 'movie') return addServiceSegment(plan, 'poi_orbit_cinema', 'activity', 'movie')
  if (setup === 'hotel') return addServiceSegment(plan, 'poi_linen_clock_hotel', 'leisure', 'hotel')
  if (setup === 'locked-dining') {
    const dining = plan.segments.find((segment) => segment.phase === 'dining') ?? plan.segments[0]
    if (!dining) return plan
    return applyPlanCommand(plan, {
      type: 'LOCK_SEGMENT',
      source: 'system',
      segmentId: dining.id,
    }).plan
  }
  return plan
}

function addServiceSegment(plan: Plan, poiId: string, phase: PlanSegment['phase'], category: MerchantServiceCategory) {
  const poi = getFictionalPoiById(poiId)
  if (!poi) return plan
  const anchor = plan.segments[0]
  const segment: PlanSegment = {
    id: createId('seg'),
    phase,
    serviceCategory: category,
    title: poi.activityTitle,
    place: poi.name,
    startTime: '20:00',
    endTime: category === 'hotel' ? '21:00' : '22:00',
    durationMinutes: category === 'hotel' ? 60 : 120,
    status: '待确认',
    reason: poi.description,
    budget: poi.budget,
    notes: poi.notes,
    poiId: poi.id,
    lnglat: poi.lnglat,
  }
  return applyPlanCommand(plan, {
    type: 'ADD_SEGMENT',
    source: 'system',
    afterSegmentId: anchor?.id,
    segment,
  }).plan
}

function findSelectedSegmentId(plan: Plan, phase: PlanSegment['phase'] | undefined) {
  if (!phase) return undefined
  return plan.segments.find((segment) => segment.phase === phase && !segment.isTransit)?.id
}

function resumePayload(action: PendingAction, mode: ResumeMode) {
  if (mode === 'service-first' && action.kind === 'service-item-selection') {
    return {
      offeringId: action.offerings[0]?.id ?? '',
      quantity: action.offerings[0]?.category === 'hotel' ? 1 : 2,
    }
  }
  if (mode === 'candidate-first' && action.kind === 'candidate-selection') {
    return {
      candidateId: action.candidates[0]?.id ?? '',
    }
  }
  if (mode === 'confirm-command' && action.kind === 'command-confirmation') {
    return { confirmed: true }
  }
  return {}
}

function goldenScenarios(): EvalScenario[] {
  const replaceQueries = [
    ['golden-replace-nearby', 'Nearby dinner replacement', '把晚饭换近一点'],
    ['golden-replace-hotpot', 'Hotpot replacement', '晚上想吃火锅啊'],
    ['golden-replace-spicy', 'Spicy dinner replacement', '想吃辣的'],
    ['golden-replace-no-spicy', 'No-spicy dinner replacement', '不吃辣'],
    ['golden-replace-family-chuanxiang', 'Family-aware Sichuan/Hunan replacement', '想吃川湘但带孩子'],
    ['golden-replace-chatty-spicy', 'Chat-friendly spicy replacement', '换个能聊天的辣味餐厅'],
    ['golden-replace-quiet', 'Quiet replacement', '换个安静点的餐厅'],
    ['golden-replace-budget', 'Budget replacement', '晚饭换个预算友好的'],
    ['golden-replace-photo', 'Photo-friendly replacement', '换一个适合拍照的点'],
    ['golden-replace-family', 'Family-friendly replacement', '换一个亲子友好一点的'],
    ['golden-replace-business', 'Business replacement', '换一个适合商务聊天的'],
    ['golden-replace-night', 'Night replacement', '换一个夜间还开的地方'],
  ] as const
  const addQueries = [
    ['golden-add-coffee', 'Add coffee break', '中间再加个咖啡休息'],
    ['golden-add-dessert', 'Add dessert after dinner', '饭后加个甜品'],
    ['golden-add-photo', 'Add photo stop', '中间加一个拍照点'],
    ['golden-add-walk', 'Add walk stop', '最后加个散步'],
    ['golden-add-hotel', 'Add quiet hotel', '帮我加个安静双床酒店'],
    ['golden-add-movie', 'Add IMAX movie', '饭后看个 IMAX 电影'],
    ['golden-add-movie-after-dinner', 'Add movie after dinner', '饭后想看电影'],
    ['golden-add-rainy', 'Add rainy-day indoor stop', '下雨了再加个室内备选'],
    ['golden-add-gift', 'Add gift stop', '中间加个买礼物的地方'],
  ] as const
  const scenarios: EvalScenario[] = [
    ...replaceQueries.map(([id, title, message]) => ({
      id,
      title,
      tags: ['golden', 'candidate', 'replace'],
      initialPrompt: '晚上两个人附近吃饭',
      message,
      resume: 'candidate-first' as const,
      expect: {
        commandTypes: ['CHOOSE_CANDIDATE'],
        runStatus: 'completed' as const,
        toolNames: ['poi.search'],
      },
    })),
    ...addQueries.map(([id, title, message]) => ({
      id,
      title,
      tags: ['golden', 'candidate', 'add-after'],
      initialPrompt: '下午两个人附近轻松玩',
      message,
      resume: 'candidate-first' as const,
      expect: {
        commandTypes: ['CHOOSE_CANDIDATE'],
        runStatus: 'completed' as const,
        toolNames: ['poi.search'],
      },
    })),
    {
      id: 'golden-movie-ticket',
      title: 'Select movie ticket through service ticket',
      tags: ['golden', 'service', 'movie'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '买两张电影票',
      setup: 'movie',
      resume: 'service-first',
      expect: { commandTypes: ['SELECT_SERVICE_ITEM'], planHasServiceSelection: true, runStatus: 'completed', toolNames: ['offering.search'] },
    },
    {
      id: 'golden-hotel-room',
      title: 'Select hotel room through service ticket',
      tags: ['golden', 'service', 'hotel'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '订双床房',
      setup: 'hotel',
      resume: 'service-first',
      expect: { commandTypes: ['SELECT_SERVICE_ITEM'], planHasServiceSelection: true, runStatus: 'completed', toolNames: ['offering.search'] },
    },
    {
      id: 'golden-model-dining-service',
      title: 'Model routes dining package to service selection',
      tags: ['golden', 'model', 'service'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '加一个套餐',
      modelReply: JSON.stringify({ action: 'service', category: 'dining', query: '双人套餐', reason: 'user wants a package' }),
      selectedPhase: 'dining',
      useModel: true,
      expect: { pendingKind: 'service-item-selection', runStatus: 'waiting_for_user', toolNames: ['offering.search'] },
    },
    {
      id: 'golden-order-preview',
      title: 'Sandbox order previews before command write',
      tags: ['golden', 'order', 'sandbox'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '可以模拟下单了',
      resume: 'confirm-command',
      expect: { commandTypes: ['CREATE_SANDBOX_ORDER'], finalStatus: 'confirmed', runStatus: 'completed', toolNames: ['order.preview'] },
    },
    {
      id: 'golden-confirm-command',
      title: 'Confirm command remains command gated',
      tags: ['golden', 'confirm'],
      initialPrompt: '下午两个人附近轻松玩',
      message: '确认这个计划',
      resume: 'confirm-command',
      expect: { commandTypes: ['CONFIRM_PLAN'], finalStatus: 'confirmed', runStatus: 'completed', toolNames: ['order.preview'] },
    },
    {
      id: 'golden-delete-command',
      title: 'Delete command writes through PlanCommand',
      tags: ['golden', 'command'],
      initialPrompt: '下午两个人附近轻松玩',
      message: '删除这个安排',
      resume: 'confirm-command',
      expect: { commandTypes: ['DELETE_SEGMENT'], runStatus: 'completed' },
    },
    {
      id: 'golden-clear-plan-command',
      title: 'Clear all nodes pauses for confirmation before clearing',
      tags: ['golden', 'command', 'destructive'],
      initialPrompt: '下午两个人附近轻松玩',
      message: '删除所有节点',
      resume: 'confirm-command',
      expect: { commandTypes: ['CLEAR_PLAN_SEGMENTS'], runStatus: 'completed' },
    },
    {
      id: 'golden-rewrite-command',
      title: 'Rewrite command writes through PlanCommand',
      tags: ['golden', 'command'],
      initialPrompt: '下午两个人附近轻松玩',
      message: '改成轻松一点',
      resume: 'confirm-command',
      expect: { commandTypes: ['REWRITE_SEGMENT'], runStatus: 'completed' },
    },
    {
      id: 'golden-qa-stream',
      title: 'QA streams answer without command write',
      tags: ['golden', 'qa', 'stream'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '你是什么模型',
      streamReply: ['我是', ' eval-fake-chat'],
      useModel: true,
      expect: { runStatus: 'completed' },
    },
    {
      id: 'golden-model-invalid-intent-fallback',
      title: 'Invalid model intent falls back deterministically',
      tags: ['golden', 'fallback', 'model'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '把晚饭换近一点',
      modelReply: 'not json',
      resume: 'candidate-first',
      useModel: true,
      expect: { commandTypes: ['CHOOSE_CANDIDATE'], runStatus: 'completed', toolNames: ['poi.search'] },
    },
    {
      id: 'golden-model-error-fallback',
      title: 'Model error is redacted and falls back',
      tags: ['golden', 'fallback', 'redaction'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '把晚饭换近一点',
      modelError: 'provider failed with sk-eval-secret-for-test Bearer abc.def',
      resume: 'candidate-first',
      useModel: true,
      expect: { commandTypes: ['CHOOSE_CANDIDATE'], runStatus: 'completed', toolNames: ['poi.search'] },
    },
    {
      id: 'golden-locked-segment-error',
      title: 'Locked segment cannot be rewritten',
      tags: ['golden', 'guardrail', 'locked'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '改成轻松一点',
      setup: 'locked-dining',
      selectedPhase: 'dining',
      resume: 'confirm-command',
      expect: { errorIncludes: 'Locked segments cannot be rewritten' },
    },
    {
      id: 'golden-hotel-add-no-direct-booking',
      title: 'Hotel request creates candidate before service selection',
      tags: ['golden', 'hotel', 'confirm-boundary'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '订个酒店住一晚',
      expect: { pendingKind: 'candidate-selection', runStatus: 'waiting_for_user', toolNames: ['poi.search'] },
    },
    {
      id: 'golden-movie-add-no-direct-ticket',
      title: 'Movie request creates candidate before ticket selection',
      tags: ['golden', 'movie', 'confirm-boundary'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '看电影',
      expect: { pendingKind: 'candidate-selection', runStatus: 'waiting_for_user', toolNames: ['poi.search'] },
    },
    {
      id: 'golden-read-only-plan-question',
      title: 'Read-only plan question does not mutate plan',
      tags: ['golden', 'qa'],
      initialPrompt: '下午两个人附近轻松玩',
      message: '这个安排为什么这么排',
      expect: { runStatus: 'completed' },
    },
    {
      id: 'golden-model-rewrite-intent',
      title: 'Model rewrite intent still uses PlanCommand',
      tags: ['golden', 'model', 'command'],
      initialPrompt: '下午两个人附近轻松玩',
      message: '把第一个安排调轻松点',
      modelReply: JSON.stringify({ action: 'rewrite', targetPhase: 'activity', query: '节奏放慢', reason: 'user wants slower pace' }),
      resume: 'confirm-command',
      useModel: true,
      expect: { commandTypes: ['REWRITE_SEGMENT'], runStatus: 'completed' },
    },
    {
      id: 'golden-model-add-intent',
      title: 'Model add intent becomes candidate workflow',
      tags: ['golden', 'model', 'candidate'],
      initialPrompt: '下午两个人附近轻松玩',
      message: '加一个休息点',
      modelReply: JSON.stringify({ action: 'add', targetPhase: 'activity', query: '咖啡休息点', reason: 'extra break' }),
      useModel: true,
      expect: { pendingKind: 'candidate-selection', runStatus: 'waiting_for_user', toolNames: ['poi.search'] },
    },
    {
      id: 'golden-model-confirm-order',
      title: 'Model confirm order still previews sandbox receipt',
      tags: ['golden', 'model', 'order'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '帮我预订',
      modelReply: JSON.stringify({ action: 'confirm', query: '预订', reason: 'user wants sandbox order' }),
      resume: 'confirm-command',
      useModel: true,
      expect: { commandTypes: ['CREATE_SANDBOX_ORDER'], finalStatus: 'confirmed', runStatus: 'completed', toolNames: ['order.preview'] },
    },
    {
      id: 'golden-movie-ticket-pending-without-resume',
      title: 'Movie ticket request pauses for user choice',
      tags: ['golden', 'service', 'user-confirm-boundary'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '买两张电影票',
      setup: 'movie',
      expect: { pendingKind: 'service-item-selection', runStatus: 'waiting_for_user', toolNames: ['offering.search'] },
    },
    {
      id: 'golden-hotel-room-pending-without-resume',
      title: 'Hotel room request pauses for user choice',
      tags: ['golden', 'service', 'user-confirm-boundary'],
      initialPrompt: '晚上两个人附近吃饭',
      message: '订双床房',
      setup: 'hotel',
      expect: { pendingKind: 'service-item-selection', runStatus: 'waiting_for_user', toolNames: ['offering.search'] },
    },
    {
      id: 'golden-model-delete-intent',
      title: 'Model delete intent still writes through PlanCommand',
      tags: ['golden', 'model', 'command'],
      initialPrompt: '下午两个人附近轻松玩',
      message: '删掉第一个安排',
      modelReply: JSON.stringify({ action: 'delete', targetPhase: 'activity', reason: 'user wants removal' }),
      resume: 'confirm-command',
      useModel: true,
      expect: { commandTypes: ['DELETE_SEGMENT'], runStatus: 'completed' },
    },
  ]
  if (scenarios.length !== 42) {
    throw new Error(`Golden suite must contain 42 scenarios, got ${scenarios.length}`)
  }
  return scenarios
}

async function writeReport(report: EvalReport) {
  const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url))
  const dir = resolve(workspaceRoot, 'docs', 'evals')
  await mkdir(dir, { recursive: true })
  const baseName = report.suite === 'live-smoke' ? 'agent-live-smoke' : 'agent-golden'
  await writeFile(resolve(dir, `${baseName}.json`), `${JSON.stringify(redactReport(report), null, 2)}\n`, 'utf8')
  await writeFile(resolve(dir, `${baseName}.md`), markdownReport(report), 'utf8')
}

function redactReport(report: EvalReport): EvalReport {
  return JSON.parse(JSON.stringify(report).replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]').replace(/Bearer\s+(?!token\b)[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')) as EvalReport
}

function markdownReport(report: EvalReport) {
  const redacted = redactReport(report)
  const lines = [
    `# PlanPal Agent ${redacted.suite} Eval`,
    '',
    `Generated: ${redacted.generatedAt}`,
    `Summary: ${redacted.summary.passed}/${redacted.summary.total} passed`,
    redacted.provider ? `Provider: ${redacted.provider}` : '',
    redacted.skipped ? 'Status: skipped because PLANPAL_EVAL_API_KEY was not set.' : '',
    '',
    '| Scenario | Result | Checks |',
    '| --- | --- | --- |',
    ...redacted.results.map((result) => {
      const failed = result.checks.filter((check) => !check.passed)
      const checkText = failed.length
        ? failed.map((check) => `${check.label}: ${check.detail}`).join('<br>')
        : `${result.checks.length} checks passed`
      return `| ${result.id} | ${result.passed ? 'PASS' : 'FAIL'} | ${checkText} |`
    }),
    '',
  ].filter((line) => line !== '')
  return `${lines.join('\n')}\n`
}

function printReport(report: EvalReport) {
  if (report.skipped) {
    console.log(`${report.suite}: skipped; PLANPAL_EVAL_API_KEY is not set`)
    return
  }
  console.log(`${report.suite}: ${report.summary.passed}/${report.summary.total} passed`)
  for (const result of report.results.filter((item) => !item.passed)) {
    console.log(`FAIL ${result.id}`)
    for (const check of result.checks.filter((item) => !item.passed)) {
      console.log(`  - ${check.label}: ${check.detail}`)
    }
  }
}

void main()
