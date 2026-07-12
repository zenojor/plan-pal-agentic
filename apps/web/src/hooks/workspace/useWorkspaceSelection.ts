import { useEffect, useMemo } from 'react'
import { useAtom } from 'jotai'
import type { Plan } from '@planpal/domain'
import { reconcileWorkspaceSelection } from '../../components/workspace/workspaceModel'
import { selectedSegmentIdAtom } from '../../state/workspaceAtoms'

type SelectionPlan = Pick<Plan, 'segments'> | undefined

export function useWorkspaceSelection(plan: SelectionPlan) {
  const [selectedSegmentId, setSelectedSegmentId] = useAtom(selectedSegmentIdAtom)

  const activeSelectedSegmentId = useMemo(() => {
    if (!plan) return undefined
    return reconcileWorkspaceSelection(plan.segments, selectedSegmentId).selectedSegmentId
  }, [plan, selectedSegmentId, setSelectedSegmentId])

  useEffect(() => {
    if (!plan) return
    const next = reconcileWorkspaceSelection(plan.segments, selectedSegmentId)
    if (next.selectedSegmentId !== selectedSegmentId) setSelectedSegmentId(next.selectedSegmentId)
  }, [plan, selectedSegmentId])

  function selectSegment(segmentId: string) {
    setSelectedSegmentId(segmentId)
  }

  function toggleSegmentSelection(segmentId: string) {
    if (activeSelectedSegmentId === segmentId || selectedSegmentId === segmentId) {
      setSelectedSegmentId(undefined)
      return
    }
    selectSegment(segmentId)
  }

  function changeChatContext(segmentId?: string) {
    if (!segmentId) {
      setSelectedSegmentId(undefined)
      return
    }
    selectSegment(segmentId)
  }

  return {
    activeSelectedSegmentId,
    changeChatContext,
    selectSegment,
    toggleSegmentSelection,
  }
}
