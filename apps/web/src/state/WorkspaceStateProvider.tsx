import { useMemo, type ReactNode } from 'react'
import { Provider } from 'jotai'
import { loadWorkspaceLayout } from '../lib/workspaceLayoutStorage'
import { createWorkspaceStore } from './workspaceAtoms'

type WorkspaceStateProviderProps = {
  children: ReactNode
  planId: string
}

export function WorkspaceStateProvider({ children, planId }: WorkspaceStateProviderProps) {
  const store = useMemo(
    () => createWorkspaceStore(loadWorkspaceLayout(planId)),
    [planId],
  )

  return <Provider store={store}>{children}</Provider>
}
