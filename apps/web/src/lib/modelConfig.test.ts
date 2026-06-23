import { describe, expect, it } from 'vitest'
import {
  MODEL_PROVIDER_PRESETS,
  applyModelProviderPreset,
  isCompleteModelConfig,
  loadModelConfig,
  maskApiKey,
  modelConfigsEqual,
  normalizeModelConfig,
  publicModelConfig,
  saveModelConfig,
} from './modelConfig'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

describe('model config storage', () => {
  it('saves and loads browser BYOK config', () => {
    const storage = memoryStorage()
    saveModelConfig({
      baseURL: 'https://api.example.com/v1',
      apiKey: 'sk-demo',
      model: 'demo',
      providerMode: 'auto',
      resolvedBaseURL: 'https://api.example.com',
      lastTestedAt: '2026-06-18T00:00:00.000Z',
    }, storage)
    expect(loadModelConfig(storage)).toEqual({
      baseURL: 'https://api.example.com/v1',
      apiKey: 'sk-demo',
      model: 'demo',
      providerMode: 'auto',
      resolvedBaseURL: 'https://api.example.com',
      lastTestedAt: '2026-06-18T00:00:00.000Z',
    })
  })

  it('normalizes config and ignores incomplete saved values', () => {
    const storage = memoryStorage()
    saveModelConfig({
      baseURL: ' https://api.example.com/v1/ ',
      apiKey: ' sk-demo ',
      model: ' demo ',
      providerMode: 'auto',
      resolvedBaseURL: ' https://api.example.com/ ',
    }, storage)
    expect(loadModelConfig(storage)).toMatchObject({
      apiKey: 'sk-demo',
      baseURL: 'https://api.example.com/v1',
      model: 'demo',
      resolvedBaseURL: 'https://api.example.com',
    })

    saveModelConfig({
      baseURL: '   ',
      apiKey: 'sk-demo',
      model: 'demo',
    }, storage)

    expect(loadModelConfig(storage)).toBeNull()
    expect(publicModelConfig({ baseURL: '', apiKey: 'sk-demo', model: 'demo' })).toBeNull()
    expect(isCompleteModelConfig({ baseURL: 'https://api.example.com', apiKey: '', model: 'demo' })).toBe(false)
    expect(normalizeModelConfig({ baseURL: ' https://api.example.com/ ', apiKey: ' sk ', model: ' demo ' })).toEqual({
      apiKey: 'sk',
      baseURL: 'https://api.example.com',
      lastTestedAt: undefined,
      model: 'demo',
      providerMode: 'auto',
      resolvedBaseURL: undefined,
    })
  })

  it('masks API keys in UI text', () => {
    expect(maskApiKey('sk-1234567890')).toBe('sk-1••••7890')
  })

  it('derives safe public model config for UI status', () => {
    expect(publicModelConfig({
      baseURL: 'https://api.example.com/v1',
      apiKey: 'sk-1234567890',
      model: 'demo',
      providerMode: 'openai-compatible',
      resolvedBaseURL: 'https://api.example.com',
    })).toEqual({
      baseURL: 'https://api.example.com/v1',
      maskedApiKey: 'sk-1••••7890',
      model: 'demo',
      providerMode: 'openai-compatible',
      resolvedBaseURL: 'https://api.example.com',
      lastTestedAt: undefined,
    })
  })

  it('detects unsaved model config changes', () => {
    const saved = {
      baseURL: 'https://api.example.com/v1',
      apiKey: 'sk-demo',
      model: 'demo',
      providerMode: 'auto' as const,
      resolvedBaseURL: 'https://api.example.com',
    }
    expect(modelConfigsEqual(saved, saved)).toBe(true)
    expect(modelConfigsEqual({ ...saved, baseURL: 'https://api.example.com/v1/' }, saved)).toBe(true)
    expect(modelConfigsEqual({ ...saved, model: 'other' }, saved)).toBe(false)
    expect(modelConfigsEqual({ ...saved, resolvedBaseURL: 'https://other.example.com' }, saved)).toBe(false)
    expect(modelConfigsEqual(null, saved)).toBe(false)
  })

  it('applies provider presets without touching the browser-only API key', () => {
    const deepseek = MODEL_PROVIDER_PRESETS.find((preset) => preset.id === 'deepseek')
    expect(deepseek).toBeTruthy()

    expect(applyModelProviderPreset({
      baseURL: 'https://api.example.com/v1',
      apiKey: 'sk-demo',
      model: 'demo',
      providerMode: 'auto',
      resolvedBaseURL: 'https://api.example.com',
      lastTestedAt: '2026-06-18T00:00:00.000Z',
    }, deepseek!)).toEqual({
      baseURL: 'https://api.deepseek.com',
      apiKey: 'sk-demo',
      model: 'deepseek-chat',
      providerMode: 'openai-compatible',
      resolvedBaseURL: undefined,
      lastTestedAt: undefined,
    })
  })
})
