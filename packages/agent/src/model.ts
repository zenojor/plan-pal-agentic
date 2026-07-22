export type CoreMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ClientModelConfig = {
  baseURL: string
  apiKey: string
  model: string
  providerMode?: ProviderMode
  resolvedBaseURL?: string
}

export type PublicModelConfig = Omit<ClientModelConfig, 'apiKey'>

export type ResolvedModelConfig = ClientModelConfig & {
  providerMode: ProviderMode
  resolvedBaseURL: string
  attemptedEndpoints: string[]
}

export type ProviderMode = 'auto' | 'openai-compatible'

export type AssistantDeltaSink = (delta: string) => void | Promise<void>

export function readBearerKey(authorization: string | null | undefined) {
  const value = authorization ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(value)
  return match?.[1]?.trim() || ''
}

export function sanitizeModelConfig(config: ClientModelConfig): PublicModelConfig {
  const safe = assertClientModelConfig(config)
  return {
    baseURL: safe.baseURL,
    model: safe.model,
    providerMode: safe.providerMode,
    resolvedBaseURL: safe.resolvedBaseURL,
  }
}

export function assertClientModelConfig(config: Partial<ClientModelConfig> | null | undefined): ClientModelConfig {
  const baseURL = config?.baseURL?.trim()
  const apiKey = config?.apiKey?.trim()
  const model = config?.model?.trim()
  if (!baseURL || !apiKey || !model) {
    throw new Error('Model baseURL, API key, and model are required')
  }
  return {
    baseURL: baseURL.replace(/\/+$/, ''),
    apiKey,
    model,
    providerMode: config?.providerMode ?? 'auto',
    resolvedBaseURL: config?.resolvedBaseURL?.trim().replace(/\/+$/, ''),
  }
}

export function resolveOpenAICompatibleConfig(config: ClientModelConfig, resolvedBaseURL?: string): ResolvedModelConfig {
  const safe = assertClientModelConfig(config)
  const baseURL = resolvedBaseURL ?? safe.resolvedBaseURL ?? safe.baseURL
  return {
    ...safe,
    providerMode: safe.providerMode ?? 'auto',
    resolvedBaseURL: baseURL.replace(/\/+$/, ''),
    attemptedEndpoints: [],
  }
}

export function getOpenAICompatibleBaseURLCandidates(baseURL: string) {
  const normalized = normalizeBaseURL(baseURL)
  const candidates = [normalized]
  try {
    const url = new URL(normalized)
    const path = url.pathname.replace(/\/+$/, '')
    if (path.endsWith('/v1')) {
      url.pathname = path.slice(0, -3) || '/'
      candidates.push(normalizeBaseURL(url.toString()))
    } else {
      url.pathname = `${path === '/' ? '' : path}/v1`
      candidates.push(normalizeBaseURL(url.toString()))
    }
  } catch {
    if (!normalized.endsWith('/v1')) candidates.push(`${normalized}/v1`)
  }
  return [...new Set(candidates)]
}

export function getOpenAICompatibleBaseURLCandidatesForConfig(
  config: Pick<ClientModelConfig, 'baseURL' | 'resolvedBaseURL'>,
) {
  const resolved = config.resolvedBaseURL ? normalizeBaseURL(config.resolvedBaseURL) : undefined
  return unique([resolved, ...getOpenAICompatibleBaseURLCandidates(config.baseURL)].filter(Boolean) as string[])
}

export function getOpenAICompatibleAttemptedEndpoints(config: Pick<ClientModelConfig, 'baseURL' | 'resolvedBaseURL'>) {
  return getOpenAICompatibleBaseURLCandidatesForConfig(config).map(chatCompletionsEndpoint)
}

export async function testOpenAICompatibleModel(config: ClientModelConfig) {
  const safe = assertClientModelConfig(config)
  const candidates = getOpenAICompatibleBaseURLCandidatesForConfig(safe)
  const errors: string[] = []

  for (const candidate of candidates) {
    const endpoint = chatCompletionsEndpoint(candidate)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${safe.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: safe.model,
          messages: [{ role: 'user', content: 'Reply with ok.' }],
          max_tokens: 8,
          temperature: 0,
        }),
      })

      if (!response.ok) {
        const providerError = await readProviderError(response)
        errors.push(formatProviderError(response.status, response.statusText, providerError))
        continue
      }

      return {
        ok: true,
        providerInfo: {
          baseURL: safe.baseURL,
          resolvedBaseURL: candidate,
          model: safe.model,
          providerMode: safe.providerMode ?? 'auto',
        },
        attemptedEndpoints: candidates.slice(0, candidates.indexOf(candidate) + 1).map(chatCompletionsEndpoint),
      }
    } catch (error) {
      errors.push(redactSecret(error instanceof Error ? error.message : 'Model test failed'))
    }
  }

  const attemptedEndpoints = candidates.map(chatCompletionsEndpoint)
  return {
    ok: false,
    error: formatAttemptedEndpointError(errors, safe.model, attemptedEndpoints),
    attemptedEndpoints,
  }
}

export async function generateAssistantReply(config: ClientModelConfig, messages: CoreMessage[]) {
  const safe = assertClientModelConfig(config)
  const candidates = getOpenAICompatibleBaseURLCandidatesForConfig(safe)
  const errors: string[] = []
  const attemptedEndpoints: string[] = []

  for (const candidate of candidates) {
    const endpoint = chatCompletionsEndpoint(candidate)
    attemptedEndpoints.push(endpoint)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${safe.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: safe.model,
          messages: messages.map(toOpenAICompatibleMessage),
          temperature: 0.2,
        }),
      })

      if (!response.ok) {
        const providerError = await readProviderError(response)
        errors.push(formatProviderError(response.status, response.statusText, providerError))
        continue
      }

      const text = extractAssistantText(await response.json())
      if (text) return text
      errors.push('Provider response did not include assistant text')
    } catch (error) {
      errors.push(redactSecret(error instanceof Error ? error.message : 'Model call failed'))
    }
  }

  throw new Error(formatAttemptedEndpointError(errors, safe.model, attemptedEndpoints))
}

export async function streamAssistantReply(
  config: ClientModelConfig,
  messages: CoreMessage[],
  onDelta: AssistantDeltaSink,
) {
  const safe = assertClientModelConfig(config)
  const candidates = getOpenAICompatibleBaseURLCandidatesForConfig(safe)
  const errors: string[] = []
  const attemptedEndpoints: string[] = []

  for (const candidate of candidates) {
    const endpoint = chatCompletionsEndpoint(candidate)
    attemptedEndpoints.push(endpoint)
    let emittedDelta = false
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${safe.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: safe.model,
          messages: messages.map(toOpenAICompatibleMessage),
          stream: true,
          temperature: 0.2,
        }),
      })

      if (!response.ok) {
        const providerError = await readProviderError(response)
        errors.push(formatProviderError(response.status, response.statusText, providerError))
        continue
      }

      const text = response.body
        ? await readAssistantTextStream(response.body, async (delta) => {
            emittedDelta = true
            await onDelta(delta)
          })
        : extractAssistantText(await response.json())
      if (text) return text
      errors.push('Provider stream did not include assistant text')
    } catch (error) {
      if (emittedDelta) throw error
      errors.push(redactSecret(error instanceof Error ? error.message : 'Model stream failed'))
    }
  }

  throw new Error(formatAttemptedEndpointError(errors, safe.model, attemptedEndpoints))
}
export async function resolveModelConfigForGeneration(config: ClientModelConfig): Promise<ResolvedModelConfig> {
  const safe = assertClientModelConfig(config)
  const testResult = await testOpenAICompatibleModel(safe)
  if (!testResult.ok || !testResult.providerInfo?.resolvedBaseURL) {
    throw new Error(testResult.error ?? 'Model endpoint resolution failed')
  }
  return {
    ...resolveOpenAICompatibleConfig(safe, testResult.providerInfo.resolvedBaseURL),
    attemptedEndpoints: testResult.attemptedEndpoints ?? [],
  }
}

async function readAssistantTextStream(body: ReadableStream<Uint8Array>, onDelta: AssistantDeltaSink) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  const consumeData = async (rawData: string) => {
    const data = rawData.trim()
    if (!data || data === '[DONE]') return
    try {
      const delta = extractAssistantDelta(JSON.parse(data))
      if (!delta) return
      text += delta
      await onDelta(delta)
    } catch {
      // Ignore malformed provider stream chunks and keep reading later chunks.
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      buffer += decoder.decode()
      break
    }
    buffer += decoder.decode(value, { stream: true })
    buffer = await drainAssistantSseBuffer(buffer, consumeData)
  }
  await drainAssistantSseBuffer(buffer, consumeData, true)
  return text
}

async function drainAssistantSseBuffer(
  input: string,
  onData: (data: string) => Promise<void>,
  flush = false,
) {
  let buffer = input
  while (true) {
    const boundary = findSseBoundary(buffer)
    if (!boundary) break
    for (const data of readSseDataLines(buffer.slice(0, boundary.index))) {
      await onData(data)
    }
    buffer = buffer.slice(boundary.index + boundary.length)
  }
  if (flush && buffer.trim()) {
    for (const data of readSseDataLines(buffer)) {
      await onData(data)
    }
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

function readSseDataLines(chunk: string) {
  return chunk
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .filter(Boolean)
}
async function readProviderError(response: Response) {
  try {
    const data = await response.json() as { error?: { message?: string; code?: string } | string; message?: string }
    if (typeof data.error === 'string') return data.error
    return data.error?.message || data.error?.code || data.message || ''
  } catch {
    try {
      return await response.text()
    } catch {
      return ''
    }
  }
}

function formatProviderError(
  status: number,
  statusText: string,
  providerError: string,
) {
  const label = [`HTTP ${status}`, statusText].filter(Boolean).join(' ')
  const detail = redactSecret(providerError).trim()
  return detail ? `${label}: ${detail}` : label
}

function formatAttemptedEndpointError(errors: string[], model: string, endpoints: string[] = []) {
  const uniqueErrors = [...new Set(errors.filter(Boolean))]
  const errorSummary = uniqueErrors.length > 0 ? uniqueErrors.join('；') : 'Model call failed'
  const endpointSummary = endpoints.length > 0 ? `尝试端点：${[...new Set(endpoints)].join('，')}。` : ''
  return `${errorSummary}。模型：${model}。${endpointSummary}`.trim()
}

function chatCompletionsEndpoint(baseURL: string) {
  return `${normalizeBaseURL(baseURL)}/chat/completions`
}

function normalizeBaseURL(baseURL: string) {
  const trimmed = baseURL.trim().replace(/\/+$/, '')
  try {
    const url = new URL(trimmed)
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return trimmed
  }
}

function toOpenAICompatibleMessage(message: CoreMessage) {
  return {
    role: message.role,
    content: message.content,
  }
}

function extractAssistantDelta(data: unknown) {
  if (!data || typeof data !== 'object' || !('choices' in data) || !Array.isArray(data.choices)) return ''
  const choice = data.choices[0]
  if (!choice || typeof choice !== 'object') return ''
  if ('delta' in choice && choice.delta && typeof choice.delta === 'object' && 'content' in choice.delta) {
    const content = choice.delta.content
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') return part.text
          return ''
        })
        .filter(Boolean)
        .join('')
    }
  }
  if ('message' in choice && choice.message && typeof choice.message === 'object' && 'content' in choice.message) {
    const content = choice.message.content
    if (typeof content === 'string') return content
  }
  if ('text' in choice && typeof choice.text === 'string') return choice.text
  return ''
}
function extractAssistantText(data: unknown) {
  if (!data || typeof data !== 'object' || !('choices' in data) || !Array.isArray(data.choices)) return ''
  const choice = data.choices[0]
  if (!choice || typeof choice !== 'object') return ''
  if ('message' in choice && choice.message && typeof choice.message === 'object' && 'content' in choice.message) {
    const content = choice.message.content
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') return part.text
          return ''
        })
        .filter(Boolean)
        .join('\n')
    }
  }
  if ('text' in choice && typeof choice.text === 'string') return choice.text
  return ''
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function redactSecret(value: string) {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+(?!token\b)[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')
}

