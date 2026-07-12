import { describe, expect, it } from 'vitest'
import { getDefaultWorkspaceLayout } from '../components/workspace/workspaceModel'
import {
  createWorkspaceStore,
  selectedSegmentIdAtom,
  workspaceLayoutAtom,
} from './workspaceAtoms'

describe('workspace atoms', () => {
  it('creates an isolated store with the plan layout', () => {
    const firstStore = createWorkspaceStore({
      activeMobileColumn: 'map',
      columns: ['chat', 'puzzle', 'map'],
    })
    const secondStore = createWorkspaceStore(getDefaultWorkspaceLayout())

    firstStore.set(selectedSegmentIdAtom, 'segment_1')

    expect(firstStore.get(workspaceLayoutAtom)).toEqual({
      activeMobileColumn: 'map',
      columns: ['chat', 'puzzle', 'map'],
    })
    expect(firstStore.get(selectedSegmentIdAtom)).toBe('segment_1')
    expect(secondStore.get(selectedSegmentIdAtom)).toBeUndefined()
    expect(secondStore.get(workspaceLayoutAtom)).toEqual(getDefaultWorkspaceLayout())
  })
})
