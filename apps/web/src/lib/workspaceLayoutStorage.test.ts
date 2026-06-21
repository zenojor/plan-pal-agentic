import { describe, expect, it } from 'vitest'
import {
  loadWorkspaceLayout,
  saveWorkspaceLayout,
  workspaceLayoutStorageKey,
} from './workspaceLayoutStorage'

function memoryStorage(initial?: Record<string, string>) {
  const values = new Map(Object.entries(initial ?? {}))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    snapshot: () => Object.fromEntries(values),
  }
}

describe('workspace layout storage', () => {
  it('saves normalized workspace layout per plan id', () => {
    const storage = memoryStorage()

    saveWorkspaceLayout('plan_1', {
      activeMobileColumn: 'map',
      columns: ['chat', 'puzzle', 'map', 'trace'],
    }, storage)

    expect(Object.keys(storage.snapshot())).toEqual([workspaceLayoutStorageKey('plan_1')])
    expect(loadWorkspaceLayout('plan_1', storage)).toEqual({
      activeMobileColumn: 'map',
      columns: ['chat', 'puzzle', 'map', 'trace'],
    })
    expect(loadWorkspaceLayout('plan_2', storage)).toEqual({
      activeMobileColumn: 'puzzle',
      columns: ['chat', 'puzzle'],
    })
  })

  it('falls back to default layout for corrupt or legacy layout values', () => {
    const corrupt = memoryStorage({
      [workspaceLayoutStorageKey('plan_bad')]: '{not-json',
    })
    const legacy = memoryStorage({
      [workspaceLayoutStorageKey('plan_legacy')]: JSON.stringify({
        activeMobileColumn: 'merchant',
        columns: ['merchant', 'legacy-column', 'merchant'],
        selectedRouteModes: {
          route_1: 'bike',
          route_2: 'walk',
        },
      }),
    })

    expect(loadWorkspaceLayout('plan_bad', corrupt)).toEqual({
      activeMobileColumn: 'puzzle',
      columns: ['chat', 'puzzle'],
    })
    expect(loadWorkspaceLayout('plan_legacy', legacy)).toEqual({
      activeMobileColumn: 'merchant',
      columns: ['puzzle', 'merchant'],
    })
  })

  it('does not crash the workspace when browser storage is unavailable', () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error('localStorage unavailable')
      },
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }

    expect(loadWorkspaceLayout('plan_1', brokenStorage)).toEqual({
      activeMobileColumn: 'puzzle',
      columns: ['chat', 'puzzle'],
    })
    expect(() => saveWorkspaceLayout('plan_1', {
      activeMobileColumn: 'trace',
      columns: ['chat', 'puzzle', 'trace'],
    }, brokenStorage)).not.toThrow()
  })
})
