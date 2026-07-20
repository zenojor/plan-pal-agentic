import { assertClientModelConfig, readBearerKey, type ClientModelConfig } from '@planpal/agent/model'
import type { Context } from 'hono'

export async function readJson<T>(context: Context): Promise<T> {
  try {
    return (await context.req.json()) as T
  } catch {
    return {} as T
  }
}

export function modelConfigFromRequest(
  context: Context,
  input: { baseURL?: string; model?: string; providerMode?: ClientModelConfig['providerMode']; resolvedBaseURL?: string },
): ClientModelConfig {
  const apiKey = readBearerKey(context.req.header('authorization'))
  const providerMode = parseProviderMode(input.providerMode ?? context.req.header('x-model-provider-mode'))
  return assertClientModelConfig({
    apiKey,
    baseURL: input.baseURL ?? context.req.header('x-model-base-url') ?? '',
    model: input.model ?? context.req.header('x-model-name') ?? '',
    providerMode,
    resolvedBaseURL: input.resolvedBaseURL ?? context.req.header('x-model-resolved-base-url') ?? undefined,
  })
}

export function toPublicError(error: unknown) {
  if (error instanceof Error) {
    return redactPublicError(error.message)
  }
  return 'Request failed'
}

function redactPublicError(value: string) {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+(?!token\b)[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')
}

function parseProviderMode(value: unknown): ClientModelConfig['providerMode'] {
  return value === 'openai-compatible' ? 'openai-compatible' : 'auto'
}
