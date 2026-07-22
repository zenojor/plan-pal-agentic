import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import { saveWorkspaceLayout } from '../../lib/workspaceLayoutStorage'
import {
  addWorkspaceColumn,
  getClosedWorkspaceColumns,
  isMobileWorkspaceColumn,
  moveWorkspaceColumn,
  openMerchantWorkspaceColumn,
  removeWorkspaceColumn,
  type MobileWorkspaceColumnId,
  type WorkspaceColumnId,
  type WorkspaceLayoutState,
} from '../../components/workspace/workspaceModel'
import {
  columnMenuOpenAtom,
  draggingColumnAtom,
  dragOverColumnAtom,
  workspaceLayoutAtom,
} from '../../state/workspaceAtoms'

export function useWorkspaceLayout(planId: string) {
  const [layout, setLayout] = useAtom(workspaceLayoutAtom)
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useAtom(columnMenuOpenAtom)
  const [draggingColumn, setDraggingColumn] = useAtom(draggingColumnAtom)
  const [dragOverColumn, setDragOverColumn] = useAtom(dragOverColumnAtom)
  const columnMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    saveWorkspaceLayout(planId, layout)
  }, [layout, planId])

  useEffect(() => {
    if (!isColumnMenuOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (columnMenuRef.current?.contains(event.target as Node)) return
      setIsColumnMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isColumnMenuOpen, setIsColumnMenuOpen])

  const closedColumns = getClosedWorkspaceColumns(layout.columns)

  function openColumn(column: WorkspaceColumnId) {
    setLayout((current) => updateLayout(current, {
      activeMobileColumn: isMobileWorkspaceColumn(column)
        ? column
        : current.activeMobileColumn,
      columns: addWorkspaceColumn(current.columns, column),
    }))
  }

  function addColumn(column: WorkspaceColumnId) {
    openColumn(column)
    setIsColumnMenuOpen(false)
  }

  function removeColumn(column: WorkspaceColumnId) {
    setLayout((current) => updateLayout(current, {
      activeMobileColumn: column === current.activeMobileColumn
        ? 'puzzle'
        : current.activeMobileColumn,
      columns: removeWorkspaceColumn(current.columns, column),
    }))
  }

  function openMerchantColumn() {
    setLayout((current) => updateLayout(current, {
      activeMobileColumn: 'merchant',
      columns: openMerchantWorkspaceColumn(current.columns),
    }))
  }

  function changeMobileColumn(column: MobileWorkspaceColumnId) {
    setLayout((current) => updateLayout(current, {
      activeMobileColumn: column,
      columns: addWorkspaceColumn(current.columns, column),
    }))
  }

  function resetColumnDrag() {
    setDraggingColumn(null)
    setDragOverColumn(null)
  }

  function dropColumn(targetColumn: WorkspaceColumnId) {
    setLayout((current) => updateLayout(current, {
      ...current,
      columns: moveWorkspaceColumn(current.columns, draggingColumn, targetColumn),
    }))
    resetColumnDrag()
  }

  return {
    activeMobileColumn: layout.activeMobileColumn,
    addColumn,
    changeMobileColumn,
    closedColumns,
    columnMenuRef,
    columns: layout.columns,
    dragOverColumn,
    draggingColumn,
    dropColumn,
    isColumnMenuOpen,
    openColumn,
    openMerchantColumn,
    removeColumn,
    resetColumnDrag,
    setDragOverColumn,
    setDraggingColumn,
    toggleColumnMenu: () => setIsColumnMenuOpen((open) => !open),
  }
}

function updateLayout(
  current: WorkspaceLayoutState,
  next: WorkspaceLayoutState,
): WorkspaceLayoutState {
  if (
    next.activeMobileColumn === current.activeMobileColumn
    && next.columns === current.columns
  ) return current
  return next
}
