import { useEffect, useState } from 'react'
import { testModelConfig } from '../lib/api'
import { appClasses, settingsClasses } from '../lib/appClasses'
import {
  MODEL_PROVIDER_PRESETS,
  applyModelProviderPreset,
  clearModelConfig,
  isCompleteModelConfig,
  maskApiKey,
  modelConfigsEqual,
  normalizeModelConfig,
  publicModelConfig,
  saveModelConfig,
  type StoredModelConfig,
} from '../lib/modelConfig'
import { useStoredModelConfig } from '../lib/useStoredModelConfig'

const defaultConfig: StoredModelConfig = {
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4.1-mini',
  providerMode: 'auto',
}

export function ModelSettingsPage() {
  const savedConfig = useStoredModelConfig()
  const [form, setForm] = useState<StoredModelConfig>(() => savedConfig ?? defaultConfig)
  const [isEditing, setIsEditing] = useState(false)
  const [status, setStatus] = useState('')
  const [testing, setTesting] = useState(false)
  const isDirty = !modelConfigsEqual(form, savedConfig)
  const formComplete = isCompleteModelConfig(form)
  const savedPublic = publicModelConfig(savedConfig)

  useEffect(() => {
    if (!isEditing) setForm(savedConfig ?? defaultConfig)
  }, [isEditing, savedConfig])

  function update(field: keyof StoredModelConfig, value: string) {
    setIsEditing(true)
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'baseURL' || field === 'model') {
        delete next.resolvedBaseURL
        delete next.lastTestedAt
      }
      return next
    })
  }

  function applyPreset(presetId: string) {
    const preset = MODEL_PROVIDER_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    setIsEditing(true)
    setForm((prev) => applyModelProviderPreset(prev, preset))
    setStatus(`已套用 ${preset.label} 预设。测试成功后再保存到 workspace。`)
  }

  async function save() {
    const nextConfig = normalizeModelConfig(form)
    if (!isCompleteModelConfig(nextConfig)) {
      setForm(nextConfig)
      setStatus('请先填写 Base URL、API Key 和 Model 后再保存。')
      return
    }
    saveModelConfig(nextConfig)
    setForm(nextConfig)
    setIsEditing(false)
    setStatus(`配置已保存到浏览器：${nextConfig.model} (${nextConfig.baseURL}, ${maskApiKey(nextConfig.apiKey)})`)
  }

  async function test() {
    const testConfig = normalizeModelConfig(form)
    if (!isCompleteModelConfig(testConfig)) {
      setForm(testConfig)
      setStatus('请先填写 Base URL、API Key 和 Model 后再测试。')
      return
    }
    setTesting(true)
    setStatus('')
    try {
      const result = await testModelConfig(testConfig)
      const resolvedBaseURL = result.providerInfo?.resolvedBaseURL
      if (result.ok && resolvedBaseURL) {
        const testedAt = new Date().toISOString()
        setForm((prev) => ({
          ...normalizeModelConfig(prev),
          resolvedBaseURL,
          lastTestedAt: testedAt,
        }))
        setStatus(`测试连接成功：${result.providerInfo?.model}。解析端点：${resolvedBaseURL}。当前表单尚未保存到 workspace。`)
        return
      }
      setStatus(`连接失败：${result.error}`)
    } finally {
      setTesting(false)
    }
  }

  function clear() {
    clearModelConfig()
    setForm(defaultConfig)
    setIsEditing(false)
    setStatus('已从此设备清除 API Key。')
  }

  return (
    <main className={settingsClasses.page}>
      <section className={settingsClasses.card}>
        <span className={appClasses.eyebrow}>BYOK</span>
        <h1 className={settingsClasses.title}>模型设置</h1>
        <p className={settingsClasses.paragraph}>API Key 只保存在此设备的浏览器中。请求时会临时传给 PlanPal API 代理，服务端不落库、不写日志。</p>
        <p className={settingsClasses.hint}>Base URL 填供应商文档给出的 OpenAI-compatible 根地址或 /v1 地址；PlanPal 会自动探测可用的 Chat Completions 路径。</p>
        <div className={settingsClasses.summary}>
          {savedPublic ? (
            <>
              <strong className={settingsClasses.summaryTitle}>Workspace 当前使用：{savedPublic.model}</strong>
              <span className={settingsClasses.summaryLine}>{savedPublic.baseURL} · {savedPublic.maskedApiKey}</span>
              {savedPublic.resolvedBaseURL && <span className={settingsClasses.summaryLine}>上次测试端点：{savedPublic.resolvedBaseURL}</span>}
            </>
          ) : (
            <>
              <strong className={settingsClasses.summaryTitle}>Workspace 还没有保存的模型配置</strong>
              <span className={settingsClasses.summaryLine}>测试连接只验证当前表单，保存后才会用于聊天 Agent。</span>
            </>
          )}
          {isDirty && <em className={settingsClasses.dirty}>当前表单尚未保存</em>}
        </div>
        <div className={settingsClasses.presetGrid} aria-label="模型供应商预设">
          {MODEL_PROVIDER_PRESETS.map((preset) => {
            const active = normalizeModelConfig(form).baseURL === preset.baseURL
              && normalizeModelConfig(form).model === preset.model
            return (
              <button
                className={settingsClasses.presetButton(active)}
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
              >
                <strong className={settingsClasses.summaryTitle}>{preset.label}</strong>
                <span className={settingsClasses.summaryLine}>{preset.model}</span>
                <small className={settingsClasses.summaryLine}>{preset.description}</small>
              </button>
            )
          })}
        </div>
        <label className={settingsClasses.label}>
          Base URL
          <input className={settingsClasses.input} value={form.baseURL} onChange={(event) => update('baseURL', event.target.value)} />
        </label>
        <label className={settingsClasses.label}>
          API Key
          <input className={settingsClasses.input} value={form.apiKey} type="password" onChange={(event) => update('apiKey', event.target.value)} />
        </label>
        <label className={settingsClasses.label}>
          Model
          <input className={settingsClasses.input} value={form.model} onChange={(event) => update('model', event.target.value)} />
        </label>
        <div className={settingsClasses.buttonRow}>
          <button className={settingsClasses.button} type="button" onClick={save} disabled={!formComplete}>保存到浏览器</button>
          <button type="button" className={settingsClasses.secondaryButton} onClick={test} disabled={testing || !formComplete}>
            {testing ? '测试中' : '测试连接'}
          </button>
          <button type="button" className={settingsClasses.dangerButton} onClick={clear}>清除</button>
        </div>
        {status && <p className={appClasses.statusText}>{status}</p>}
      </section>
    </main>
  )
}
