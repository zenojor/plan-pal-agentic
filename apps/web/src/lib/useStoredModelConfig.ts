import { useEffect } from 'react'
import { useAtom } from 'jotai'
import {
  loadModelConfig,
  MODEL_CONFIG_STORAGE_KEY,
  MODEL_CONFIG_UPDATED_EVENT,
  type StoredModelConfig,
} from './modelConfig'
import { storedModelConfigAtom } from '../state/modelConfigAtoms'

export function useStoredModelConfig(): StoredModelConfig | null {
  const [config, setConfig] = useAtom(storedModelConfigAtom)

  useEffect(() => {
    const refreshConfig = () => setConfig(loadModelConfig())
    const handleStorage = (event: StorageEvent) => {
      if (event.key === MODEL_CONFIG_STORAGE_KEY || event.key === null) refreshConfig()
    }

    refreshConfig()
    window.addEventListener(MODEL_CONFIG_UPDATED_EVENT, refreshConfig)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(MODEL_CONFIG_UPDATED_EVENT, refreshConfig)
      window.removeEventListener('storage', handleStorage)
    }
  }, [setConfig])

  return config
}
