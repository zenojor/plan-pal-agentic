import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { applyPlanCommand, createId, nowIso, type AgentEvent, type Plan, type PlanCommand } from '@planpal/domain'
import { createPlanWithVariants, testOpenAICompatibleModel } from '@planpal/agent'
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
  clientContext?: unknown
  baseURL?: string
  model?: string
  providerMode?: 'auto' | 'openai-compatible'
  resolvedBaseURL?: string
}

type AgentResumeBody = {
  runId?: string
  actionId?: string
  payload?: unknown
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
  const modelConfig = hasModelConfig(context.req.header('authorization'), body)
    ? modelConfigFromRequest(context, body)
    : undefined
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
    fallbackUsed: result.fallbackUsed,
    usedModel: result.usedModel,
  })
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
  const modelConfig = hasModelConfig(context.req.header('authorization'), body)
    ? modelConfigFromRequest(context, body)
    : undefined

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
        fallbackUsed: result.fallbackUsed,
        usedModel: result.usedModel,
      })
    } catch (error) {
      await writeCreatePlanStreamError(stream, error)
    }
  })
})

app.get('/api/plans/:planId', async (context) => {
  const plan = await stores.plans.getPlan(context.req.param('planId'))
  if (!plan) return context.json({ error: 'Plan not found' }, 404)
  const events = await stores.agents.listEvents(plan.id)
  const versions = await stores.plans.listPlanVersions(plan.id)
  return context.json({ plan, events, versions: versions.map(summarizePlanVersion) })
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

  const modelConfig = hasModelConfig(context.req.header('authorization'), body)
    ? modelConfigFromRequest(context, body)
    : undefined

  return streamSSE(context, async (stream) => {
    let runId = createId('run')
    let sequence = 0
    try {
      await agentRuntime.run({
        planId,
        message: body.message!.trim(),
        selectedSegmentId: body.selectedSegmentId,
        clientContext: body.clientContext,
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
  return streamSSE(context, async (stream) => {
    let sequence = 0
    try {
      await agentRuntime.resume({
        planId,
        runId: body.runId!,
        actionId: body.actionId!,
        payload: body.payload,
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

function hasModelConfig(authorization: string | undefined, body: ModelConfigBody) {
  return Boolean(authorization && body.baseURL && body.model)
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
    fallbackUsed: boolean
    planId: string
    plan: unknown
    status: string
    usedModel: boolean
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
  const event: AgentEvent = {
    id: createId('evt'),
    runId: input.runId,
    planId: input.planId,
    type: 'agent.error',
    sequence: input.sequence,
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





