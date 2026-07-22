import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import {
  applyPlanCommand,
  buildAgentTraceSnapshot,
  buildMockRouteEstimates,
  createId,
  fictionalPoiCatalog,
  getFictionalPoiById,
  getMerchantOfferings,
  nowIso,
  searchMerchantOfferings,
  searchFictionalPois,
  summarizeCommand,
  type AgentEvent,
  type AgentRun,
  type CommandResult,
  type MerchantServiceCategory,
  type Plan,
  type PlanCommand,
  type SegmentPhase,
  redactTraceText,
} from '@planpal/domain'
import { testOpenAICompatibleModel } from '@planpal/agent/model'
import { createPlanWithVariants } from '@planpal/agent/planner'
import { agentRuntime, stores } from './store'
import { modelConfigFromRequest, readJson, toPublicError } from './http'

type PlanVersionSummary = {
  createdAt: string
  segmentCount: number
  status: Plan['status']
  summary: string
  title: string
  updatedAt: string
  version: number
}

type ModelTestBody = {
  baseURL?: string
  model?: string
  providerMode?: 'auto' | 'openai-compatible'
  resolvedBaseURL?: string
}

type CreatePlanBody = {
  prompt?: string
  modelConfigRef?: 'client-byok'
  baseURL?: string
  model?: string
  providerMode?: 'auto' | 'openai-compatible'
  resolvedBaseURL?: string
}

type AgentRunBody = {
  message?: string
  selectedSegmentId?: string
  candidateActionId?: string
  interactionSource?: 'chat' | 'candidate-card'
  baseURL?: string
  model?: string
  providerMode?: 'auto' | 'openai-compatible'
  resolvedBaseURL?: string
}

type AgentResumeBody = {
  runId?: string
  actionId?: string
  payload?: unknown
  baseURL?: string
  model?: string
  providerMode?: 'auto' | 'openai-compatible'
  resolvedBaseURL?: string
}

type ModelConfigBody = {
  baseURL?: string
  model?: string
  providerMode?: 'auto' | 'openai-compatible'
  resolvedBaseURL?: string
}

export const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Model-Base-URL',
    'X-Model-Name',
    'X-Model-Provider-Mode',
    'X-Model-Resolved-Base-URL',
  ],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}))

app.get('/api/health', (context) => context.json({ ok: true, service: 'planpal-agentic-api' }))

app.get('/api/mock/pois', (context) => {
  const lng = parseFiniteNumber(context.req.query('lng') ?? context.req.query('nearLng'))
  const lat = parseFiniteNumber(context.req.query('lat') ?? context.req.query('nearLat'))
  const results = searchFictionalPois({
    area: context.req.query('area'),
    limit: parsePositiveInt(context.req.query('limit'), 20),
    maxPriceLevel: parsePositiveInt(context.req.query('maxPriceLevel') ?? context.req.query('priceLevel'), 0) || undefined,
    nearLnglat: Number.isFinite(lng) && Number.isFinite(lat) ? [lng!, lat!] : undefined,
    maxDistanceKm: parseFiniteNumber(context.req.query('maxDistanceKm')),
    phase: parseSegmentPhase(context.req.query('phase')),
    query: context.req.query('q') ?? context.req.query('query'),
    tags: parseCsv(context.req.query('tags')),
    requiredTags: parseCsv(context.req.query('requiredTags')),
    excludedTags: parseCsv(context.req.query('excludedTags')),
    headcount: parsePositiveInt(context.req.query('headcount'), 0) || undefined,
    timeWindow: parseTimeWindow(context.req.query('startTime'), context.req.query('endTime')),
    indoorOnly: parseBoolean(context.req.query('indoorOnly')),
    quietOnly: parseBoolean(context.req.query('quietOnly')),
    avoidSpicy: parseBoolean(context.req.query('avoidSpicy')),
  })
  return context.json({
    source: 'fictional-local-mock-v2',
    count: results.length,
    pois: results.map((result) => ({
      ...result.poi,
      searchScore: result.score,
      reasons: result.reasons,
    })),
  })
})

app.get('/api/mock/pois/:poiId', (context) => {
  const poi = getFictionalPoiById(context.req.param('poiId'))
  if (!poi) return context.json({ error: 'Mock POI not found' }, 404)
  return context.json({ source: 'fictional-local-mock-v2', poi })
})

app.get('/api/mock/merchants', (context) => {
  const category = parseMerchantServiceCategory(context.req.query('category') ?? context.req.query('serviceCategory'))
  const phase = parseSegmentPhase(context.req.query('phase'))
  const query = context.req.query('q') ?? context.req.query('query')
  const lng = parseFiniteNumber(context.req.query('lng') ?? context.req.query('nearLng'))
  const lat = parseFiniteNumber(context.req.query('lat') ?? context.req.query('nearLat'))
  const hasSearchConstraints = query || phase || category || context.req.query('area') || context.req.query('tags')
    || context.req.query('requiredTags') || context.req.query('excludedTags') || context.req.query('headcount')
    || context.req.query('startTime') || context.req.query('maxDistanceKm') || context.req.query('indoorOnly')
    || context.req.query('quietOnly') || context.req.query('avoidSpicy')
  const results = hasSearchConstraints
    ? searchFictionalPois({
        area: context.req.query('area'),
        limit: parsePositiveInt(context.req.query('limit'), 20),
        maxPriceLevel: parsePositiveInt(context.req.query('maxPriceLevel') ?? context.req.query('priceLevel'), 0) || undefined,
        nearLnglat: Number.isFinite(lng) && Number.isFinite(lat) ? [lng!, lat!] : undefined,
        maxDistanceKm: parseFiniteNumber(context.req.query('maxDistanceKm')),
        phase,
        query,
        serviceCategory: category,
        tags: parseCsv(context.req.query('tags')),
        requiredTags: parseCsv(context.req.query('requiredTags')),
        excludedTags: parseCsv(context.req.query('excludedTags')),
        headcount: parsePositiveInt(context.req.query('headcount'), 0) || undefined,
        timeWindow: parseTimeWindow(context.req.query('startTime'), context.req.query('endTime')),
        indoorOnly: parseBoolean(context.req.query('indoorOnly')),
        quietOnly: parseBoolean(context.req.query('quietOnly')),
        avoidSpicy: parseBoolean(context.req.query('avoidSpicy')),
      }).map((result) => ({
        ...result.poi,
        searchScore: result.score,
        reasons: result.reasons,
      }))
    : fictionalPoiCatalog
        .filter((poi) => !category || poi.serviceCategory === category)
        .slice(0, parsePositiveInt(context.req.query('limit'), 20))
  return context.json({
    source: 'fictional-local-mock-v2',
    count: results.length,
    merchants: results,
  })
})

app.get('/api/mock/merchants/:merchantId', (context) => {
  const merchant = getFictionalPoiById(context.req.param('merchantId'))
  if (!merchant) return context.json({ error: 'Mock merchant not found' }, 404)
  return context.json({ source: 'fictional-local-mock-v2', merchant })
})

app.get('/api/mock/merchants/:merchantId/offerings', (context) => {
  const merchant = getFictionalPoiById(context.req.param('merchantId'))
  if (!merchant) return context.json({ error: 'Mock merchant not found' }, 404)
  const category = parseMerchantServiceCategory(context.req.query('category'))
  const offerings = getMerchantOfferings(merchant.id)
    .filter((offering) => !category || offering.category === category)
  return context.json({
    source: 'fictional-local-mock-v2',
    merchantId: merchant.id,
    count: offerings.length,
    offerings,
  })
})

app.get('/api/mock/offerings', (context) => {
  const results = searchMerchantOfferings({
    availableAt: context.req.query('availableAt'),
    category: parseMerchantServiceCategory(context.req.query('category')),
    limit: parsePositiveInt(context.req.query('limit'), 20),
    merchantId: context.req.query('merchantId'),
    query: context.req.query('q') ?? context.req.query('query'),
    tags: parseCsv(context.req.query('tags')),
  })
  return context.json({
    source: 'fictional-local-mock-v2',
    count: results.length,
    offerings: results.map((result) => ({
      ...result.offering,
      merchant: {
        id: result.merchant.id,
        name: result.merchant.name,
        phase: result.merchant.phase,
        area: result.merchant.area,
        serviceCategory: result.merchant.serviceCategory,
      },
      searchScore: result.score,
      reasons: result.reasons,
    })),
  })
})

app.post('/api/model/test', async (context) => {
  const body = await readJson<ModelTestBody>(context)
  try {
    const config = modelConfigFromRequest(context, body)
    const result = await testOpenAICompatibleModel(config)
    return context.json(result, result.ok ? 200 : 400)
  } catch (error) {
    return context.json({ ok: false, error: toPublicError(error) }, 400)
  }
})

app.get('/api/plans', async (context) => {
  return context.json({ plans: await stores.plans.listPlans() })
})

app.post('/api/plans', async (context) => {
  const body = await readJson<CreatePlanBody>(context)
  const prompt = body.prompt?.trim()
  if (!prompt) {
    return context.json({ error: 'prompt is required' }, 400)
  }
  if (body.modelConfigRef !== 'client-byok') {
    return context.json({ error: 'modelConfigRef must be client-byok' }, 400)
  }
  if (!hasModelConfig(context.req.header('authorization'), body)) {
    return context.json({ error: 'A model connection is required' }, 400)
  }
  try {
    const modelConfig = modelConfigFromRequest(context, body)
    const result = await createPlanWithVariants(prompt, modelConfig)
    const plan = await stores.plans.createPlan(result.plan)
    for (const event of result.events) {
      await stores.agents.appendEvent(event)
    }
    return context.json({
      planId: plan.id,
      status: plan.status,
      plan,
      events: result.events,
    })
  } catch (error) {
    return context.json({ error: toPublicError(error) }, 502)
  }
})

app.post('/api/plans/stream', async (context) => {
  const body = await readJson<CreatePlanBody>(context)
  const prompt = body.prompt?.trim()
  if (!prompt) {
    return context.json({ error: 'prompt is required' }, 400)
  }
  if (body.modelConfigRef !== 'client-byok') {
    return context.json({ error: 'modelConfigRef must be client-byok' }, 400)
  }
  if (!hasModelConfig(context.req.header('authorization'), body)) {
    return context.json({ error: 'A model connection is required' }, 400)
  }
  const modelConfig = modelConfigFromRequest(context, body)

  return streamSSE(context, async (stream) => {
    try {
      const result = await createPlanWithVariants(prompt, modelConfig, async (event) => {
        await writeAgentEvent(stream, event)
      })
      const plan = await stores.plans.createPlan(result.plan)
      for (const event of result.events) {
        await stores.agents.appendEvent(event)
      }
      await writeCreatePlanCreatedEvent(stream, {
        planId: plan.id,
        status: plan.status,
        plan,
        events: result.events,
      })
    } catch (error) {
      await writeCreatePlanStreamError(stream, error)
    }
  })
})

app.get('/api/plans/:planId/mock/routes', async (context) => {
  const plan = await stores.plans.getPlan(context.req.param('planId'))
  if (!plan) return context.json({ error: 'Plan not found' }, 404)
  return context.json({
    source: 'mock-route',
    planId: plan.id,
    routes: buildMockRouteEstimates(plan.segments),
  })
})

app.get('/api/plans/:planId', async (context) => {
  const plan = await stores.plans.getPlan(context.req.param('planId'))
  if (!plan) return context.json({ error: 'Plan not found' }, 404)
  const events = await stores.agents.listEvents(plan.id)
  const versions = await stores.plans.listPlanVersions(plan.id)
  return context.json({ plan, events, versions: versions.map(summarizePlanVersion) })
})

app.get('/api/plans/:planId/agent/runs', async (context) => {
  const plan = await stores.plans.getPlan(context.req.param('planId'))
  if (!plan) return context.json({ error: 'Plan not found' }, 404)
  const runs = await stores.agents.listRuns(plan.id)
  return context.json({
    planId: plan.id,
    runs: runs.map(summarizeAgentRun),
  })
})

app.get('/api/plans/:planId/agent/runs/:runId/trace', async (context) => {
  const plan = await stores.plans.getPlan(context.req.param('planId'))
  if (!plan) return context.json({ error: 'Plan not found' }, 404)
  const run = await stores.agents.getRun(context.req.param('runId'))
  if (!run || run.planId !== plan.id) return context.json({ error: 'Agent run not found' }, 404)
  const [events, toolCalls, versions] = await Promise.all([
    stores.agents.listEvents(plan.id),
    stores.agents.listToolCalls(run.id),
    stores.plans.listPlanVersions(plan.id),
  ])
  return context.json({
    trace: buildAgentTraceSnapshot({
      events,
      run,
      toolCalls,
      versions,
    }),
  })
})

app.delete('/api/plans/:planId', async (context) => {
  const planId = context.req.param('planId')
  const deleted = await stores.plans.deletePlan(planId)
  if (!deleted) return context.json({ error: 'Plan not found' }, 404)
  await stores.agents.deletePlanData(planId)
  return context.json({ ok: true, planId })
})
app.post('/api/plans/:planId/commands', async (context) => {
  const planId = context.req.param('planId')
  const plan = await stores.plans.getPlan(planId)
  if (!plan) return context.json({ error: 'Plan not found' }, 404)
  try {
    const command = await readJson<PlanCommand>(context)
    if (command.type === 'RESTORE_PLAN_VERSION') {
      const result = await restorePlanVersion(plan, command)
      await stores.plans.savePlan(result.plan, 'command')
      for (const event of result.events) {
        await stores.agents.appendEvent(event)
      }
      return context.json(result)
    }
    const result = applyPlanCommand(plan, command)
    await stores.plans.savePlan(result.plan, 'command')
    for (const event of result.events) {
      await stores.agents.appendEvent(event)
    }
    return context.json(result)
  } catch (error) {
    return context.json({ error: toPublicError(error) }, 400)
  }
})

app.post('/api/plans/:planId/agent/runs', async (context) => {
  const planId = context.req.param('planId')
  const body = await readJson<AgentRunBody>(context)
  if (!body.message?.trim()) {
    return context.json({ error: 'message is required' }, 400)
  }

  if (!hasModelConfig(context.req.header('authorization'), body)) {
    return context.json({ error: 'A model connection is required' }, 400)
  }
  const modelConfig = modelConfigFromRequest(context, body)

  return streamSSE(context, async (stream) => {
    let runId = createId('run')
    let sequence = 0
    try {
      await agentRuntime.run({
        planId,
        message: body.message!.trim(),
        selectedSegmentId: body.selectedSegmentId,
        candidateActionId: body.candidateActionId,
        interactionSource: body.interactionSource,
        modelConfig,
      }, async (event) => {
        runId = event.runId
        sequence = Math.max(sequence, event.sequence)
        await writeAgentEvent(stream, event)
      })
    } catch (error) {
      await writeAgentErrorEvent(stream, {
        error,
        planId,
        runId,
        sequence: sequence + 1,
      })
    }
  })
})

app.post('/api/plans/:planId/agent/resume', async (context) => {
  const planId = context.req.param('planId')
  const body = await readJson<AgentResumeBody>(context)
  if (!body.runId || !body.actionId) {
    return context.json({ error: 'runId and actionId are required' }, 400)
  }
  if (!hasModelConfig(context.req.header('authorization'), body)) {
    return context.json({ error: 'A model connection is required' }, 400)
  }
  const modelConfig = modelConfigFromRequest(context, body)
  return streamSSE(context, async (stream) => {
    let sequence = 0
    try {
      await agentRuntime.resume({
        planId,
        runId: body.runId!,
        actionId: body.actionId!,
        payload: body.payload,
        modelConfig,
      }, async (event) => {
        sequence = Math.max(sequence, event.sequence)
        await writeAgentEvent(stream, event)
      })
    } catch (error) {
      await writeAgentErrorEvent(stream, {
        error,
        planId,
        runId: body.runId!,
        sequence: sequence + 1,
      })
    }
  })
})

async function restorePlanVersion(
  current: Plan,
  command: Extract<PlanCommand, { type: 'RESTORE_PLAN_VERSION' }>,
): Promise<CommandResult> {
  const versions = await stores.plans.listPlanVersions(current.id)
  const target = versions.find((version) => version.currentVersion === command.version)
  if (!target) {
    throw new Error(`Plan version V${command.version} was not found`)
  }
  if (target.currentVersion === current.currentVersion) {
    throw new Error('Plan is already at that version')
  }
  const restored: Plan = {
    ...target,
    currentVersion: current.currentVersion + 1,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
    pendingAction: undefined,
  }
  const patch = {
    operation: command.type,
    summary: summarizeCommand(command),
    beforeVersion: current.currentVersion,
    afterVersion: restored.currentVersion,
  }
  const event: AgentEvent = {
    id: createId('evt'),
    runId: createId('cmd'),
    planId: current.id,
    type: 'plan.updated',
    sequence: 1,
    message: patch.summary,
    payload: {
      command,
      patch,
      restoredFromVersion: current.currentVersion,
      restoredToVersion: target.currentVersion,
      version: restored.currentVersion,
    },
    createdAt: nowIso(),
  }
  return {
    plan: restored,
    events: [event],
    version: restored.currentVersion,
    patch,
  }
}

function summarizePlanVersion(plan: Plan): PlanVersionSummary {
  return {
    createdAt: plan.createdAt,
    segmentCount: plan.segments.length,
    status: plan.status,
    summary: plan.summary,
    title: plan.title,
    updatedAt: plan.updatedAt,
    version: plan.currentVersion,
  }
}

function summarizeAgentRun(run: AgentRun) {
  return {
    id: run.id,
    planId: run.planId,
    status: run.status,
    inputMessage: redactTraceText(run.inputMessage),
    checkpointId: run.checkpointId,
    createdAt: run.createdAt,
    finishedAt: run.finishedAt,
  }
}

function hasModelConfig(authorization: string | undefined, body: ModelConfigBody) {
  return Boolean(authorization && body.baseURL && body.model)
}

function parseSegmentPhase(value: string | undefined): SegmentPhase | undefined {
  if (value === 'activity' || value === 'dining' || value === 'drinks' || value === 'leisure' || value === 'transit') {
    return value
  }
  return undefined
}

function parseMerchantServiceCategory(value: string | undefined): MerchantServiceCategory | undefined {
  if (
    value === 'dining'
    || value === 'drinks'
    || value === 'activity'
    || value === 'hotel'
    || value === 'movie'
    || value === 'retail'
    || value === 'wellness'
    || value === 'ticket'
    || value === 'other'
  ) {
    return value
  }
  return undefined
}

function parseCsv(value: string | undefined) {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseFiniteNumber(value: string | undefined) {
  if (!value) return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseTimeWindow(startTime: string | undefined, endTime: string | undefined) {
  const validClock = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/
  return startTime && endTime && validClock.test(startTime) && validClock.test(endTime)
    ? { startTime, endTime }
    : undefined
}

function parseBoolean(value: string | undefined) {
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return undefined
}

async function writeAgentEvent(stream: Parameters<Parameters<typeof streamSSE>[1]>[0], event: AgentEvent) {
  await stream.writeSSE({
    event: event.type,
    id: event.id,
    data: JSON.stringify(event),
  })
}

async function writeCreatePlanCreatedEvent(
  stream: Parameters<Parameters<typeof streamSSE>[1]>[0],
  result: {
    events: AgentEvent[]
    planId: string
    plan: unknown
    status: string
  },
) {
  await stream.writeSSE({
    event: 'plan.created',
    id: result.planId,
    data: JSON.stringify({ type: 'plan.created', result }),
  })
}

async function writeCreatePlanStreamError(
  stream: Parameters<Parameters<typeof streamSSE>[1]>[0],
  error: unknown,
) {
  const event = {
    type: 'plan.create.error',
    error: toPublicError(error),
  }
  await stream.writeSSE({
    event: event.type,
    id: createId('evt'),
    data: JSON.stringify(event),
  })
}

async function writeAgentErrorEvent(
  stream: Parameters<Parameters<typeof streamSSE>[1]>[0],
  input: { error: unknown; planId: string; runId: string; sequence: number },
) {
  const persistedSequence = (await stores.agents.listEvents(input.planId))
    .filter((event) => event.runId === input.runId)
    .reduce((maximum, event) => Math.max(maximum, event.sequence), 0)
  const event: AgentEvent = {
    id: createId('evt'),
    runId: input.runId,
    planId: input.planId,
    type: 'agent.error',
    sequence: Math.max(input.sequence, persistedSequence + 1),
    message: toPublicError(input.error),
    payload: {
      error: toPublicError(input.error),
      fallbackUsed: false,
      usedModel: false,
    },
    createdAt: nowIso(),
  }
  await stores.agents.appendEvent(event)
  await writeAgentEvent(stream, event)
}

export default app





