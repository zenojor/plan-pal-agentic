import { useEffect, useState } from 'react'
import {
  loadModelConfig,
  MODEL_CONFIG_STORAGE_KEY,
  MODEL_CONFIG_UPDATED_EVENT,
  type StoredModelConfig,
} from './modelConfig'

export function useStoredModelConfig(): StoredModelConfig | null {
  const [config, setConfig] = useState<StoredModelConfig | null>(() => loadModelConfig())

  useEffect(() => {
    const refreshConfig = () => setConfig(loadModelConfig())
    const handleStorage = (event: StorageEvent) => {
      if (event.key === MODEL_CONFIG_STORAGE_KEY || event.key === null) refreshConfig()
    }

    window.addEventListener(MODEL_CONFIG_UPDATED_EVENT, refreshConfig)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(MODEL_CONFIG_UPDATED_EVENT, refreshConfig)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return config
}
