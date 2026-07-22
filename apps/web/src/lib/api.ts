import type { AgentEvent, AgentTraceSnapshot, CommandResult, FictionalPoi, MerchantOffering, MerchantServiceCategory, MockRouteEstimate, Plan, PlanCommand, SegmentPhase, TraceRunSummary } from '@planpal/domain'
import type { StoredModelConfig } from './modelConfig'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8787' : '')

export type PlanVersionSummary = {
  createdAt: string
  segmentCount: number
  status: Plan['status']
  summary: string
  title: string
  updatedAt: string
  version: number
}

export type PlanEnvelope = {
  plan: Plan
  events: AgentEvent[]
  versions: PlanVersionSummary[]
}

export type PlanListResult = {
  plans: Plan[]
}

export type AgentRunSummary = TraceRunSummary & {
  checkpointId?: string
}

export type AgentRunListResult = {
  planId: string
  runs: AgentRunSummary[]
}

export type MockPoiSearchResult = {
  count: number
  source: 'fictional-local-mock-v2'
  pois: Array<FictionalPoi & {
    searchScore: number
    reasons: string[]
  }>
}

export type MockMerchantSearchResult = {
  count: number
  source: 'fictional-local-mock-v2'
  merchants: Array<FictionalPoi & {
    searchScore?: number
    reasons?: string[]
  }>
}

export type MockOfferingSearchResult = {
  count: number
  source: 'fictional-local-mock-v2'
  offerings: Array<MerchantOffering & {
    merchant: {
      id: string
      name: string
      phase: SegmentPhase
      area: string
      serviceCategory: MerchantServiceCategory
    }
    searchScore: number
    reasons: string[]
  }>
}

export type CreatePlanResult = {
  events?: AgentEvent[]
  planId: string
  status: string
  plan: Plan
}

export async function createPlan(
  prompt: string,
  config: StoredModelConfig,
): Promise<CreatePlanResult> {
  const response = await safeFetch(`${API_BASE}/api/plans`, {
    method: 'POST',
    headers: byokHeaders(config),
    body: JSON.stringify({
      prompt,
      modelConfigRef: 'client-byok',
      baseURL: config.baseURL,
      model: config.model,
      providerMode: config.providerMode,
      resolvedBaseURL: config.resolvedBaseURL,
    }),
  }, '创建计划失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as CreatePlanResult
}

export async function streamCreatePlan(
  prompt: string,
  config: StoredModelConfig,
  onProgress: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<CreatePlanResult> {
  const response = await safeFetch(`${API_BASE}/api/plans/stream`, {
    method: 'POST',
    headers: byokHeaders(config),
    signal,
    body: JSON.stringify({
      prompt,
      modelConfigRef: 'client-byok',
      baseURL: config.baseURL,
      model: config.model,
      providerMode: config.providerMode,
      resolvedBaseURL: config.resolvedBaseURL,
    }),
  }, '创建计划失败')
  if (!response.ok || !response.body) throw new Error(await parseError(response))

  let result: CreatePlanResult | undefined
  let streamError = ''
  await readSse<unknown>(response.body, (payload) => {
    if (isAgentEvent(payload)) {
      onProgress(payload)
      return
    }
    if (isCreatePlanCreatedEvent(payload)) {
      result = payload.result
      return
    }
    if (isCreatePlanErrorEvent(payload)) {
      streamError = payload.error
    }
  })

  if (streamError) throw new Error(redactUiError(streamError))
  if (!result) throw new Error('创建计划流结束但没有返回计划')
  return result
}

export async function getPlan(planId: string, signal?: AbortSignal): Promise<PlanEnvelope> {
  const response = await safeFetch(`${API_BASE}/api/plans/${planId}`, {
    method: 'GET',
    signal,
  }, '加载计划失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as PlanEnvelope
}

export async function listAgentRuns(planId: string, signal?: AbortSignal): Promise<AgentRunListResult> {
  const response = await safeFetch(`${API_BASE}/api/plans/${planId}/agent/runs`, {
    method: 'GET',
    signal,
  }, '加载 Agent runs 失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as AgentRunListResult
}

export async function getAgentRunTrace(planId: string, runId: string, signal?: AbortSignal): Promise<AgentTraceSnapshot> {
  const response = await safeFetch(`${API_BASE}/api/plans/${planId}/agent/runs/${runId}/trace`, {
    method: 'GET',
    signal,
  }, '加载 Agent trace 失败')
  if (!response.ok) throw new Error(await parseError(response))
  const data = (await response.json()) as { trace: AgentTraceSnapshot }
  return data.trace
}

export async function deletePlan(planId: string): Promise<{ ok: true; planId: string }> {
  const response = await safeFetch(`${API_BASE}/api/plans/${planId}`, {
    method: 'DELETE',
  }, '清理计划失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as { ok: true; planId: string }
}
export async function listPlans(signal?: AbortSignal): Promise<Plan[]> {
  const response = await safeFetch(`${API_BASE}/api/plans`, {
    method: 'GET',
    signal,
  }, '加载最近计划失败')
  if (!response.ok) throw new Error(await parseError(response))
  const data = (await response.json()) as PlanListResult
  return Array.isArray(data.plans) ? data.plans : []
}

export async function searchMockPois(input: {
  area?: string
  avoidSpicy?: boolean
  endTime?: string
  excludedTags?: string[]
  headcount?: number
  indoorOnly?: boolean
  lat?: number
  limit?: number
  lng?: number
  maxDistanceKm?: number
  maxPriceLevel?: number
  phase?: SegmentPhase
  q?: string
  quietOnly?: boolean
  requiredTags?: string[]
  startTime?: string
  tags?: string[]
} = {}): Promise<MockPoiSearchResult> {
  const params = new URLSearchParams()
  if (input.area) params.set('area', input.area)
  if (input.limit) params.set('limit', String(input.limit))
  if (input.maxPriceLevel) params.set('maxPriceLevel', String(input.maxPriceLevel))
  if (input.headcount) params.set('headcount', String(input.headcount))
  if (input.lng !== undefined) params.set('lng', String(input.lng))
  if (input.lat !== undefined) params.set('lat', String(input.lat))
  if (input.maxDistanceKm) params.set('maxDistanceKm', String(input.maxDistanceKm))
  if (input.phase) params.set('phase', input.phase)
  if (input.q) params.set('q', input.q)
  if (input.tags?.length) params.set('tags', input.tags.join(','))
  if (input.requiredTags?.length) params.set('requiredTags', input.requiredTags.join(','))
  if (input.excludedTags?.length) params.set('excludedTags', input.excludedTags.join(','))
  if (input.startTime) params.set('startTime', input.startTime)
  if (input.endTime) params.set('endTime', input.endTime)
  if (input.indoorOnly !== undefined) params.set('indoorOnly', String(input.indoorOnly))
  if (input.quietOnly !== undefined) params.set('quietOnly', String(input.quietOnly))
  if (input.avoidSpicy !== undefined) params.set('avoidSpicy', String(input.avoidSpicy))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const response = await safeFetch(`${API_BASE}/api/mock/pois${suffix}`, {
    method: 'GET',
  }, '加载 mock 地点失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as MockPoiSearchResult
}

export async function getMockPoi(poiId: string): Promise<{ source: string; poi: FictionalPoi }> {
  const response = await safeFetch(`${API_BASE}/api/mock/pois/${poiId}`, {
    method: 'GET',
  }, '加载 mock 地点失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as { source: string; poi: FictionalPoi }
}

export async function searchMockMerchants(input: {
  area?: string
  category?: MerchantServiceCategory
  limit?: number
  phase?: SegmentPhase
  q?: string
  tags?: string[]
} = {}): Promise<MockMerchantSearchResult> {
  const params = new URLSearchParams()
  if (input.area) params.set('area', input.area)
  if (input.category) params.set('category', input.category)
  if (input.limit) params.set('limit', String(input.limit))
  if (input.phase) params.set('phase', input.phase)
  if (input.q) params.set('q', input.q)
  if (input.tags?.length) params.set('tags', input.tags.join(','))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const response = await safeFetch(`${API_BASE}/api/mock/merchants${suffix}`, {
    method: 'GET',
  }, '加载 mock 商户失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as MockMerchantSearchResult
}

export async function getMockMerchant(merchantId: string): Promise<{ source: string; merchant: FictionalPoi }> {
  const response = await safeFetch(`${API_BASE}/api/mock/merchants/${merchantId}`, {
    method: 'GET',
  }, '加载 mock 商户失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as { source: string; merchant: FictionalPoi }
}

export async function getMockMerchantOfferings(merchantId: string): Promise<{ source: string; merchantId: string; count: number; offerings: MerchantOffering[] }> {
  const response = await safeFetch(`${API_BASE}/api/mock/merchants/${merchantId}/offerings`, {
    method: 'GET',
  }, '加载 mock 服务项失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as { source: string; merchantId: string; count: number; offerings: MerchantOffering[] }
}

export async function searchMockOfferings(input: {
  availableAt?: string
  category?: MerchantServiceCategory
  limit?: number
  merchantId?: string
  q?: string
  tags?: string[]
} = {}): Promise<MockOfferingSearchResult> {
  const params = new URLSearchParams()
  if (input.availableAt) params.set('availableAt', input.availableAt)
  if (input.category) params.set('category', input.category)
  if (input.limit) params.set('limit', String(input.limit))
  if (input.merchantId) params.set('merchantId', input.merchantId)
  if (input.q) params.set('q', input.q)
  if (input.tags?.length) params.set('tags', input.tags.join(','))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const response = await safeFetch(`${API_BASE}/api/mock/offerings${suffix}`, {
    method: 'GET',
  }, '加载 mock 服务项失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as MockOfferingSearchResult
}

export async function getMockRoutes(planId: string): Promise<{ source: string; planId: string; routes: MockRouteEstimate[] }> {
  const response = await safeFetch(`${API_BASE}/api/plans/${planId}/mock/routes`, {
    method: 'GET',
  }, '加载 mock 路线失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as { source: string; planId: string; routes: MockRouteEstimate[] }
}

export async function sendPlanCommand(planId: string, command: PlanCommand): Promise<CommandResult> {
  const response = await safeFetch(`${API_BASE}/api/plans/${planId}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  }, '执行计划命令失败')
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as CommandResult
}

export async function testModelConfig(config: StoredModelConfig, signal?: AbortSignal) {
  type ModelTestResult = {
    ok: boolean
    providerInfo?: { baseURL: string; resolvedBaseURL?: string; model: string; providerMode?: string }
    attemptedEndpoints?: string[]
    error?: string
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE}/api/model/test`, {
      method: 'POST',
      headers: byokHeaders(config),
      signal,
      body: JSON.stringify({
        baseURL: config.baseURL,
        model: config.model,
        providerMode: config.providerMode,
        resolvedBaseURL: config.resolvedBaseURL,
      }),
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    return { ok: false, error: publicErrorMessage(error, '模型测试请求失败') } satisfies ModelTestResult
  }
  if (!response.ok) {
    return { ok: false, error: await parseError(response) } satisfies ModelTestResult
  }
  try {
    return (await response.json()) as ModelTestResult
  } catch {
    return { ok: false, error: `模型测试响应无法解析 (${response.status})` } satisfies ModelTestResult
  }
}

export async function streamAgentRun(
  planId: string,
  config: StoredModelConfig,
  input: { message: string; selectedSegmentId?: string },
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
) {
  const response = await safeFetch(`${API_BASE}/api/plans/${planId}/agent/runs`, {
    method: 'POST',
    headers: byokHeaders(config),
    signal,
    body: JSON.stringify({
      ...input,
      baseURL: config.baseURL,
      model: config.model,
      providerMode: config.providerMode,
      resolvedBaseURL: config.resolvedBaseURL,
    }),
  }, '运行 Agent 失败')
  if (!response.ok || !response.body) throw new Error(await parseError(response))
  await readSse(response.body, onEvent)
}

export async function streamAgentResume(
  planId: string,
  config: StoredModelConfig,
  input: { runId: string; actionId: string; payload: unknown },
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
) {
  const response = await safeFetch(`${API_BASE}/api/plans/${planId}/agent/resume`, {
    method: 'POST',
    headers: byokHeaders(config),
    body: JSON.stringify({
      ...input,
      baseURL: config.baseURL,
      model: config.model,
      providerMode: config.providerMode,
      resolvedBaseURL: config.resolvedBaseURL,
    }),
    signal,
  }, '继续 Agent 运行失败')
  if (!response.ok || !response.body) throw new Error(await parseError(response))
  await readSse(response.body, onEvent)
}

function byokHeaders(config: StoredModelConfig) {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    'X-Model-Base-URL': config.baseURL,
    'X-Model-Name': config.model,
    'X-Model-Provider-Mode': config.providerMode ?? 'auto',
    'X-Model-Resolved-Base-URL': config.resolvedBaseURL ?? '',
  }
}

async function parseError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string }
    return redactUiError(data.error ?? `Request failed (${response.status})`)
  } catch {
    return `Request failed (${response.status})`
  }
}

async function safeFetch(input: RequestInfo | URL, init: RequestInit, fallback: string) {
  try {
    return await fetch(input, init)
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new Error(publicErrorMessage(error, fallback))
  }
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

function publicErrorMessage(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : String(error || fallback)
  return redactUiError(raw || fallback)
}

function redactUiError(value: string) {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+(?!token\b)[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')
}

async function readSse<T>(body: ReadableStream<Uint8Array>, onEvent: (event: T) => void) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      buffer += decoder.decode()
      break
    }
    buffer += decoder.decode(value, { stream: true })
    buffer = drainSseBuffer(buffer, onEvent)
  }
  drainSseBuffer(buffer, onEvent, true)
}

function drainSseBuffer<T>(
  input: string,
  onEvent: (event: T) => void,
  flush = false,
) {
  let buffer = input
  while (true) {
    const boundary = findSseBoundary(buffer)
    if (!boundary) break
    emitSseChunk(buffer.slice(0, boundary.index), onEvent)
    buffer = buffer.slice(boundary.index + boundary.length)
  }
  if (flush && buffer.trim()) {
    emitSseChunk(buffer, onEvent)
    return ''
  }
  return buffer
}

function findSseBoundary(buffer: string) {
  const lf = buffer.indexOf('\n\n')
  const crlf = buffer.indexOf('\r\n\r\n')
  if (lf < 0 && crlf < 0) return null
  if (lf >= 0 && (crlf < 0 || lf < crlf)) return { index: lf, length: 2 }
  return { index: crlf, length: 4 }
}

function emitSseChunk<T>(chunk: string, onEvent: (event: T) => void) {
  const raw = chunk
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n')
    .trim()
  if (!raw) return
  onEvent(JSON.parse(raw) as T)
}

function isAgentEvent(value: unknown): value is AgentEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<AgentEvent>
  return typeof event.id === 'string'
    && typeof event.runId === 'string'
    && typeof event.planId === 'string'
    && typeof event.type === 'string'
    && typeof event.sequence === 'number'
    && typeof event.message === 'string'
}

function isCreatePlanCreatedEvent(value: unknown): value is { type: 'plan.created'; result: CreatePlanResult } {
  return Boolean(value
    && typeof value === 'object'
    && (value as { type?: unknown }).type === 'plan.created'
    && (value as { result?: unknown }).result
    && typeof (value as { result: { planId?: unknown } }).result.planId === 'string')
}

function isCreatePlanErrorEvent(value: unknown): value is { type: 'plan.create.error'; error: string } {
  return Boolean(value
    && typeof value === 'object'
    && (value as { type?: unknown }).type === 'plan.create.error'
    && typeof (value as { error?: unknown }).error === 'string')
}


