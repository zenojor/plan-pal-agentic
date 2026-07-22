import { useState, type ReactNode } from 'react'
import { Provider } from 'jotai'
import { loadWorkspaceLayout } from '../lib/workspaceLayoutStorage'
import { createWorkspaceStore } from './workspaceAtoms'

type WorkspaceStateProviderProps = {
  children: ReactNode
  planId: string
}

export function WorkspaceStateProvider({ children, planId }: WorkspaceStateProviderProps) {
  const [store] = useState(() => createWorkspaceStore(loadWorkspaceLayout(planId)))

  return <Provider store={store}>{children}</Provider>
}
