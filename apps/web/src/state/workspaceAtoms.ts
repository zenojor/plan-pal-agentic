import { atom, createStore } from 'jotai'
import type { AgentEvent, PendingAction } from '@planpal/domain'
import {
  getDefaultWorkspaceLayout,
  type ChatMessage,
  type WorkspaceColumnId,
  type WorkspaceLayoutState,
} from '../components/workspace/workspaceModel'

export const workspaceLayoutAtom = atom<WorkspaceLayoutState>(getDefaultWorkspaceLayout())
export const columnMenuOpenAtom = atom(false)
export const draggingColumnAtom = atom<WorkspaceColumnId | null>(null)
export const dragOverColumnAtom = atom<WorkspaceColumnId | null>(null)

export const selectedSegmentIdAtom = atom<string | undefined>(undefined)
export const confirmPlanOpenAtom = atom(false)
export const draggingSegmentIdAtom = atom<string | null>(null)
export const dragOverSegmentIdAtom = atom<string | null>(null)

export const chatDraftAtom = atom('')
export const chatMessagesAtom = atom<ChatMessage[]>([])
export const streamEventsAtom = atom<AgentEvent[]>([])
export const streamPendingActionAtom = atom<PendingAction | undefined>(undefined)
export const streamingAtom = atom(false)
export const pendingActionRunIdAtom = atom<string | null>(null)

export function createWorkspaceStore(initialLayout: WorkspaceLayoutState) {
  const store = createStore()
  store.set(workspaceLayoutAtom, initialLayout)
  return store
}
