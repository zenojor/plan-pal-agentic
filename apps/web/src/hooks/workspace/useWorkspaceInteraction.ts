import { useAtom } from 'jotai'
import {
  confirmPlanOpenAtom,
  draggingSegmentIdAtom,
  dragOverSegmentIdAtom,
} from '../../state/workspaceAtoms'

export function useWorkspaceInteraction() {
  const [confirmOpen, setConfirmOpen] = useAtom(confirmPlanOpenAtom)
  const [draggingSegmentId, setDraggingSegmentId] = useAtom(draggingSegmentIdAtom)
  const [dragOverSegmentId, setDragOverSegmentId] = useAtom(dragOverSegmentIdAtom)

  function resetSegmentDrag() {
    setDraggingSegmentId(null)
    setDragOverSegmentId(null)
  }

  return {
    closeConfirm: () => setConfirmOpen(false),
    confirmOpen,
    draggingSegmentId,
    dragOverSegmentId,
    openConfirm: () => setConfirmOpen(true),
    resetSegmentDrag,
    setDraggingSegmentId,
    setDragOverSegmentId,
  }
}
