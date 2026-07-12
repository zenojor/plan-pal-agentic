import { atom } from 'jotai'
import { loadModelConfig, type StoredModelConfig } from '../lib/modelConfig'

export const storedModelConfigAtom = atom<StoredModelConfig | null>(loadModelConfig())
