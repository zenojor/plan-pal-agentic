import { useEffect, useRef, useState } from 'react'
import { isAbortError, testModelConfig } from '../lib/api'
import { appClasses, settingsClasses } from '../lib/appClasses'
import {
  MODEL_PROVIDER_PRESETS,
  applyModelProviderPreset,
  clearModelConfig,
  isCompleteModelConfig,
  isVerifiedModelConfig,
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
  const testAbortRef = useRef<AbortController | null>(null)
  const isDirty = !modelConfigsEqual(form, savedConfig)
  const formComplete = isCompleteModelConfig(form)
  const formVerified = isVerifiedModelConfig(form)
  const savedPublic = publicModelConfig(savedConfig)

  useEffect(() => {
    if (!isEditing) setForm(savedConfig ?? defaultConfig)
  }, [isEditing, savedConfig])

  useEffect(() => () => {
    const activeRequest = testAbortRef.current
    testAbortRef.current = null
    activeRequest?.abort()
  }, [])

  function update(field: keyof StoredModelConfig, value: string) {
    setIsEditing(true)
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'baseURL' || field === 'apiKey' || field === 'model') {
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

  function save() {
    const nextConfig = normalizeModelConfig(form)
    if (!isVerifiedModelConfig(nextConfig)) {
      setForm(nextConfig)
      setStatus('请先完成模型连接测试，再保存配置。')
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
    const abortController = new AbortController()
    testAbortRef.current?.abort()
    testAbortRef.current = abortController
    setTesting(true)
    setStatus('')
    try {
      const result = await testModelConfig(testConfig, abortController.signal)
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
      setStatus(`连接失败：${result.error ?? '响应缺少可用模型端点。'}`)
    } catch (error) {
      if (!isAbortError(error)) {
        setStatus(error instanceof Error ? `连接失败：${error.message}` : '连接失败，请稍后重试。')
      }
    } finally {
      if (testAbortRef.current === abortController) {
        testAbortRef.current = null
        setTesting(false)
      }
    }
  }

  function clear() {
    testAbortRef.current?.abort()
    testAbortRef.current = null
    clearModelConfig()
    setForm(defaultConfig)
    setIsEditing(false)
    setTesting(false)
    setStatus('已从此设备清除 API Key。')
  }

  return (
    <main className={settingsClasses.page}>
      <section className={settingsClasses.card}>
        <header className={settingsClasses.header}>
          <span className={settingsClasses.headerIcon} aria-hidden="true">✦</span>
          <span className={settingsClasses.headerCopy}>
            <span className={appClasses.eyebrow}>BYOK · 模型连接</span>
            <h1 className={settingsClasses.title}>连接你的模型</h1>
            <p className={settingsClasses.paragraph}>选择供应商并验证连接。只有测试成功且已保存的配置才能进入 Agent 工作台。</p>
          </span>
        </header>

        <div className={settingsClasses.layout}>
          <aside className={settingsClasses.sidebar} aria-label="配置说明">
            <div className={settingsClasses.summary}>
              {savedPublic ? (
                <>
                  <strong className={settingsClasses.summaryTitle}>当前正在使用：{savedPublic.model}</strong>
                  <span className={settingsClasses.summaryLine}>{savedPublic.baseURL}</span>
                  <span className={settingsClasses.summaryLine}>密钥 {savedPublic.maskedApiKey}</span>
                  {savedPublic.resolvedBaseURL && <span className={settingsClasses.summaryLine}>已验证端点：{savedPublic.resolvedBaseURL}</span>}
                </>
              ) : (
                <>
                  <strong className={settingsClasses.summaryTitle}>还没有保存模型配置</strong>
                  <span className={settingsClasses.summaryLine}>请先测试并保存有效连接；未连接时不能创建计划或进入工作台。</span>
                </>
              )}
              {isDirty && <em className={settingsClasses.dirty}>当前表单尚未保存</em>}
            </div>
            <p className={settingsClasses.hint}>
              <strong>密钥只留在当前浏览器。</strong>
              <br />
              请求时会临时传给 PlanPal API 代理，服务端不落库、不写日志。Base URL 可以填写兼容 OpenAI 的根地址或 /v1 地址。
            </p>
          </aside>

          <div className={settingsClasses.formPanel}>
            <div className={settingsClasses.sectionHeading}>
              <strong className={settingsClasses.sectionTitle}>选择供应商</strong>
              <p className={settingsClasses.sectionText}>预设会填入推荐的 Base URL 和模型名，你仍然可以继续修改。</p>
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

            <div className={settingsClasses.sectionHeading}>
              <strong className={settingsClasses.sectionTitle}>连接信息</strong>
              <p className={settingsClasses.sectionText}>必须先测试连接；修改 Base URL、API Key 或模型名后需要重新测试。</p>
            </div>
            <div className={settingsClasses.fields}>
              <label className={`${settingsClasses.label} ${settingsClasses.wideField}`}>
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
            </div>
            <div className={settingsClasses.buttonRow}>
              <button className={settingsClasses.button} type="button" onClick={save} disabled={!formVerified}>保存配置</button>
              <button type="button" className={settingsClasses.secondaryButton} onClick={test} disabled={testing || !formComplete}>
                {testing ? '测试中' : '测试连接'}
              </button>
              <button type="button" className={settingsClasses.dangerButton} onClick={clear}>清除配置</button>
            </div>
            {status && <p className={appClasses.statusText}>{status}</p>}
          </div>
        </div>
      </section>
    </main>
  )
}
