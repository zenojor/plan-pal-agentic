import { Link } from '@tanstack/react-router'
import { Button, Icon, type IconName } from 'animal-island-ui'
import type { CSSProperties, DragEvent, ReactNode, RefObject } from 'react'
import {
  getWorkspaceBoardStyle,
  isMobileWorkspaceColumn,
  mobileWorkspaceColumns,
  workspaceColumnMeta,
  type MobileWorkspaceColumnId,
  type PlanExecutionBrief,
  type WorkspaceColumnId,
} from './workspaceModel'

type WorkspaceShellProps = {
  activeMobileColumn: MobileWorkspaceColumnId
  children?: ReactNode
  childrenByColumn: Record<WorkspaceColumnId, ReactNode>
  closedColumns: WorkspaceColumnId[]
  columns: WorkspaceColumnId[]
  commandBusy: boolean
  confirmDisabled: boolean
  confirmLabel: string
  executionBrief: PlanExecutionBrief
  dragOverColumn: WorkspaceColumnId | null
  draggingColumn: WorkspaceColumnId | null
  isColumnMenuOpen: boolean
  notice?: ReactNode
  planStatus: string
  planSummary: string
  planTitle: string
  planVersion: number
  columnMenuRef: RefObject<HTMLDivElement | null>
  onAddColumn: (column: WorkspaceColumnId) => void
  onColumnDrop: (column: WorkspaceColumnId) => void
  onConfirm: () => void
  onDragEnd: () => void
  onDragOverColumn: (column: WorkspaceColumnId | null) => void
  onDragStart: (column: WorkspaceColumnId) => void
  onMobileColumnChange: (column: MobileWorkspaceColumnId) => void
  onRemoveColumn: (column: WorkspaceColumnId) => void
  onToggleColumnMenu: () => void
}

const columnIconName: Record<WorkspaceColumnId, IconName> = {
  chat: 'icon-chat',
  puzzle: 'icon-diy',
  merchant: 'icon-shopping',
  details: 'icon-critterpedia',
  map: 'icon-map',
  trace: 'icon-miles',
}

export function WorkspaceShell({
  activeMobileColumn,
  children,
  childrenByColumn,
  closedColumns,
  columns,
  commandBusy,
  confirmDisabled,
  confirmLabel,
  executionBrief,
  dragOverColumn,
  draggingColumn,
  isColumnMenuOpen,
  notice,
  planStatus,
  planSummary,
  planTitle,
  planVersion,
  columnMenuRef,
  onAddColumn,
  onColumnDrop,
  onConfirm,
  onDragEnd,
  onDragOverColumn,
  onDragStart,
  onMobileColumnChange,
  onRemoveColumn,
  onToggleColumnMenu,
}: WorkspaceShellProps) {
  const mobileColumns = columns.filter(isMobileWorkspaceColumn)
  const mobileActiveColumn = mobileColumns.includes(activeMobileColumn) ? activeMobileColumn : 'puzzle'

  return (
    <main className="workspace-redesign" style={getWorkspaceBoardStyle(columns.length) as CSSProperties}>
      <WorkspaceHeader
        commandBusy={commandBusy}
        confirmDisabled={confirmDisabled}
        confirmLabel={confirmLabel}
        executionBrief={executionBrief}
        planStatus={planStatus}
        planSummary={planSummary}
        planTitle={planTitle}
        planVersion={planVersion}
        onConfirm={onConfirm}
      />
      {notice && <div className="workspace-notice">{notice}</div>}
      {columns.includes('chat') && (
        <section className="workspace-mobile-chat" aria-label="PlanPal chat">
          {childrenByColumn.chat}
        </section>
      )}
      <section
        className="workspace-board workspace-board-desktop"
        aria-label="PlanPal workspace columns"
      >
        {columns.map((column) => {
          return (
            <section
              data-column-id={column}
              className={[
                'workspace-column-slot',
                draggingColumn === column ? 'is-dragging' : '',
                dragOverColumn === column && draggingColumn !== column ? 'is-drag-over' : '',
              ].filter(Boolean).join(' ')}
              key={column}
              onDragEnter={() => {
                if (draggingColumn && draggingColumn !== column) onDragOverColumn(column)
              }}
              onDragLeave={(event: DragEvent<HTMLElement>) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) return
                onDragOverColumn(null)
              }}
              onDragOver={(event) => {
                if (draggingColumn) event.preventDefault()
              }}
              onDrop={() => {
                if (draggingColumn) onColumnDrop(column)
              }}
            >
              <ColumnHeader
                column={column}
                onDragEnd={onDragEnd}
                onDragStart={() => onDragStart(column)}
                onRemove={() => onRemoveColumn(column)}
              />
              <div className="workspace-column-panel">{childrenByColumn[column]}</div>
            </section>
          )
        })}
      </section>
      <section className="workspace-board workspace-board-mobile" aria-label="PlanPal mobile workspace">
        {mobileColumns.map((column) => (
          <section
            data-column-id={column}
            className={[
              'workspace-column-slot',
              mobileActiveColumn === column ? 'is-mobile-active' : '',
            ].filter(Boolean).join(' ')}
            key={column}
          >
            <ColumnHeader
              column={column}
              onDragEnd={onDragEnd}
              onDragStart={() => onDragStart(column)}
              onRemove={() => onRemoveColumn(column)}
            />
            <div className="workspace-column-panel">{childrenByColumn[column]}</div>
          </section>
        ))}
      </section>
      <ColumnPicker
        closedColumns={closedColumns}
        containerRef={columnMenuRef}
        isOpen={isColumnMenuOpen}
        onAddColumn={onAddColumn}
        onToggle={onToggleColumnMenu}
      />
      <nav className="workspace-mobile-tabs" aria-label="Workspace sections">
        {mobileWorkspaceColumns.map((column) => (
          <button
            aria-current={mobileActiveColumn === column ? 'page' : undefined}
            className={[
              mobileActiveColumn === column ? 'active' : '',
              !columns.includes(column) ? 'closed' : '',
            ].filter(Boolean).join(' ')}
            key={column}
            type="button"
            onClick={() => onMobileColumnChange(column)}
          >
            <Icon name={columnIconName[column]} size={18} />
            <span>{workspaceColumnMeta[column].mobileLabel}</span>
          </button>
        ))}
      </nav>
      <footer className="workspace-desktop-footer">
        <Button
          type="primary"
          size="large"
          disabled={confirmDisabled}
          loading={commandBusy}
          title={executionBrief.confirmBlockedReason || executionBrief.checkSummary}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </footer>
      {children}
    </main>
  )
}

function ColumnPicker({
  closedColumns,
  containerRef,
  isOpen,
  onAddColumn,
  onToggle,
}: {
  closedColumns: WorkspaceColumnId[]
  containerRef: RefObject<HTMLDivElement | null>
  isOpen: boolean
  onAddColumn: (column: WorkspaceColumnId) => void
  onToggle: () => void
}) {
  if (closedColumns.length === 0) return null

  return (
    <div className="workspace-column-picker" ref={containerRef}>
      {isOpen && (
        <div className="workspace-column-picker-menu">
          {closedColumns.map((column) => (
            <button
              key={column}
              type="button"
              onClick={() => onAddColumn(column)}
            >
              <Icon name={columnIconName[column]} size={22} />
              <span>{workspaceColumnMeta[column].title}</span>
            </button>
          ))}
        </div>
      )}
      <button
        aria-expanded={isOpen}
        aria-label="添加列"
        className="workspace-column-picker-trigger"
        type="button"
        onClick={onToggle}
      >
        +
      </button>
    </div>
  )
}

function WorkspaceHeader({
  commandBusy,
  confirmDisabled,
  confirmLabel,
  executionBrief,
  planStatus,
  planSummary,
  planTitle,
  planVersion,
  onConfirm,
}: {
  commandBusy: boolean
  confirmDisabled: boolean
  confirmLabel: string
  executionBrief: PlanExecutionBrief
  planStatus: string
  planSummary: string
  planTitle: string
  planVersion: number
  onConfirm: () => void
}) {
  return (
    <header className="workspace-planning-header">
      <Link className="workspace-home-link" to="/" aria-label="返回首页">
        <span aria-hidden="true">←</span>
        <strong>首页</strong>
      </Link>
      <div className="workspace-header-copy">
        <span className="eyebrow">PlanPal Board</span>
        <strong>{planTitle || '为你推荐'}</strong>
        <small>{planSummary || '选一个方向后，拼图主轴会变成可编辑计划。'}</small>
      </div>
      <div className="workspace-header-meta" aria-label="Plan status">
        <span>V{planVersion}</span>
        <span>{planStatus}</span>
        <span>{executionBrief.nodeCountLabel}</span>
        <span className={executionBrief.confirmBlockedReason ? 'blocked' : 'ready'}>
          {executionBrief.confirmBlockedReason || executionBrief.checkSummary}
        </span>
      </div>
      <button
        className="workspace-header-confirm"
        type="button"
        disabled={confirmDisabled || commandBusy}
        title={confirmLabel}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </header>
  )
}

function ColumnHeader({
  column,
  onDragEnd,
  onDragStart,
  onRemove,
}: {
  column: WorkspaceColumnId
  onDragEnd: () => void
  onDragStart: () => void
  onRemove: () => void
}) {
  const meta = workspaceColumnMeta[column]
  return (
    <header
      className="workspace-column-header"
      draggable
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
    >
      <div className="column-title-lockup">
        <span className="column-icon-pill" aria-hidden="true">
          <Icon name={columnIconName[column]} size={28} bounce />
        </span>
        <div>
          <span className="column-drag-pill">拖拽排序</span>
          <h2>{meta.title}</h2>
          <p>{meta.hint}</p>
        </div>
      </div>
      {column !== 'puzzle' && (
        <button
          aria-label={`关闭${meta.title}列`}
          className="workspace-column-close"
          title="关闭"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
        >
          ×
        </button>
      )}
    </header>
  )
}
