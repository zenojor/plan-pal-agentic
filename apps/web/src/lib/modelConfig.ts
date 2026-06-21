export const MODEL_CONFIG_STORAGE_KEY = 'planpal.modelConfig.v1'
export const MODEL_CONFIG_UPDATED_EVENT = 'planpal:model-config-updated'

export type ProviderMode = 'auto' | 'openai-compatible'

export type StoredModelConfig = {
  baseURL: string
  apiKey: string
  model: string
  providerMode?: ProviderMode
  resolvedBaseURL?: string
  lastTestedAt?: string
}

export type PublicStoredModelConfig = {
  baseURL: string
  maskedApiKey: string
  model: string
  providerMode: ProviderMode
  resolvedBaseURL?: string
  lastTestedAt?: string
}

export function loadModelConfig(storage: Pick<Storage, 'getItem'> = window.localStorage): StoredModelConfig | null {
  const raw = storage.getItem(MODEL_CONFIG_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = normalizeModelConfig(JSON.parse(raw) as StoredModelConfig)
    return isCompleteModelConfig(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveModelConfig(config: StoredModelConfig, storage: Pick<Storage, 'setItem'> = window.localStorage) {
  storage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(normalizeModelConfig(config)))
  notifyModelConfigUpdated(storage)
}

export function clearModelConfig(storage: Pick<Storage, 'removeItem'> = window.localStorage) {
  storage.removeItem(MODEL_CONFIG_STORAGE_KEY)
  notifyModelConfigUpdated(storage)
}

export function maskApiKey(apiKey: string) {
  if (!apiKey) return ''
  if (apiKey.length <= 8) return '••••'
  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`
}

export function publicModelConfig(config: StoredModelConfig | null): PublicStoredModelConfig | null {
  if (!isCompleteModelConfig(config)) return null
  const normalized = normalizeModelConfig(config)
  return {
    baseURL: normalized.baseURL,
    maskedApiKey: maskApiKey(normalized.apiKey),
    model: normalized.model,
    providerMode: normalized.providerMode ?? 'auto',
    resolvedBaseURL: normalized.resolvedBaseURL,
    lastTestedAt: normalized.lastTestedAt,
  }
}

export function modelConfigsEqual(left: StoredModelConfig | null, right: StoredModelConfig | null) {
  if (!left || !right) return left === right
  const normalizedLeft = normalizeModelConfig(left)
  const normalizedRight = normalizeModelConfig(right)
  return (
    normalizedLeft.baseURL === normalizedRight.baseURL &&
    normalizedLeft.apiKey === normalizedRight.apiKey &&
    normalizedLeft.model === normalizedRight.model &&
    (normalizedLeft.providerMode ?? 'auto') === (normalizedRight.providerMode ?? 'auto') &&
    (normalizedLeft.resolvedBaseURL ?? '') === (normalizedRight.resolvedBaseURL ?? '')
  )
}

export function normalizeModelConfig(config: StoredModelConfig): StoredModelConfig {
  return {
    baseURL: config.baseURL?.trim().replace(/\/+$/, '') ?? '',
    apiKey: config.apiKey?.trim() ?? '',
    model: config.model?.trim() ?? '',
    providerMode: config.providerMode ?? 'auto',
    resolvedBaseURL: config.resolvedBaseURL?.trim().replace(/\/+$/, ''),
    lastTestedAt: config.lastTestedAt,
  }
}

export function isCompleteModelConfig(config: StoredModelConfig | null | undefined): config is StoredModelConfig {
  if (!config) return false
  const normalized = normalizeModelConfig(config)
  return Boolean(normalized.baseURL && normalized.apiKey && normalized.model)
}

function notifyModelConfigUpdated(storage: unknown) {
  if (typeof window === 'undefined' || storage !== window.localStorage) return
  window.dispatchEvent(new CustomEvent(MODEL_CONFIG_UPDATED_EVENT, {
    detail: publicModelConfig(loadModelConfig()),
  }))
}
