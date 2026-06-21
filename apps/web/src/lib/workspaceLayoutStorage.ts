import {
  getDefaultWorkspaceLayout,
  normalizeWorkspaceLayout,
  type WorkspaceLayoutState,
} from '../components/workspace/workspaceModel'

export const WORKSPACE_LAYOUT_STORAGE_PREFIX = 'planpal.workspaceLayout.v1'

export function loadWorkspaceLayout(
  planId: string,
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): WorkspaceLayoutState {
  try {
    const raw = storage.getItem(workspaceLayoutStorageKey(planId))
    if (!raw) return getDefaultWorkspaceLayout()
    return normalizeWorkspaceLayout(JSON.parse(raw))
  } catch {
    return getDefaultWorkspaceLayout()
  }
}

export function saveWorkspaceLayout(
  planId: string,
  layout: WorkspaceLayoutState,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
) {
  try {
    storage.setItem(workspaceLayoutStorageKey(planId), JSON.stringify(normalizeWorkspaceLayout(layout)))
  } catch {
    // Layout preferences are optional UI state; storage failures should not block planning.
  }
}

export function workspaceLayoutStorageKey(planId: string) {
  return `${WORKSPACE_LAYOUT_STORAGE_PREFIX}:${planId}`
}
