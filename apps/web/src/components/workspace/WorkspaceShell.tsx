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
import {
  workspaceColumnPanelClassName,
  workspaceColumnSlotClassName,
  workspaceMobileColumnSlotClassName,
  workspaceShellClasses,
} from './workspaceShellClasses'

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
    <main className={workspaceShellClasses.root} style={getWorkspaceBoardStyle(columns.length) as CSSProperties}>
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
      {notice && <div className={workspaceShellClasses.notice}>{notice}</div>}
      {columns.includes('chat') && (
        <section className={workspaceShellClasses.mobileChat} aria-label="PlanPal chat">
          {childrenByColumn.chat}
        </section>
      )}
      <section
        className={workspaceShellClasses.desktopBoard}
        aria-label="PlanPal workspace columns"
      >
        {columns.map((column) => {
          const isDragging = draggingColumn === column
          const isDragOver = dragOverColumn === column && draggingColumn !== column
          return (
            <section
              data-column-id={column}
              className={workspaceColumnSlotClassName({ isDragging, isDragOver })}
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
              <div className={workspaceColumnPanelClassName(isDragOver)}>{childrenByColumn[column]}</div>
            </section>
          )
        })}
      </section>
      <section className={workspaceShellClasses.mobileBoard} aria-label="PlanPal mobile workspace">
        {mobileColumns.map((column) => (
          <section
            data-column-id={column}
            className={workspaceMobileColumnSlotClassName(mobileActiveColumn === column)}
            key={column}
          >
            <ColumnHeader
              column={column}
              onDragEnd={onDragEnd}
              onDragStart={() => onDragStart(column)}
              onRemove={() => onRemoveColumn(column)}
            />
            <div className={workspaceColumnPanelClassName()}>{childrenByColumn[column]}</div>
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
      <nav className={workspaceShellClasses.mobileTabs} aria-label="Workspace sections">
        {mobileWorkspaceColumns.map((column) => (
          <button
            aria-current={mobileActiveColumn === column ? 'page' : undefined}
            className={workspaceShellClasses.mobileTab(mobileActiveColumn === column, !columns.includes(column))}
            key={column}
            type="button"
            onClick={() => onMobileColumnChange(column)}
          >
            <Icon name={columnIconName[column]} size={18} />
            <span>{workspaceColumnMeta[column].mobileLabel}</span>
          </button>
        ))}
      </nav>
      <footer className={`${workspaceShellClasses.desktopFooter} ${workspaceShellClasses.desktopConfirmButton}`}>
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
    <div className={workspaceShellClasses.columnPicker} ref={containerRef}>
      {isOpen && (
        <div className={workspaceShellClasses.columnPickerMenu}>
          {closedColumns.map((column) => (
            <button
              className={workspaceShellClasses.columnPickerMenuButton}
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
        className={workspaceShellClasses.columnPickerTrigger}
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
    <header className={workspaceShellClasses.planningHeader}>
      <Link className={workspaceShellClasses.homeLink} to="/" aria-label="返回首页">
        <span className={workspaceShellClasses.homeLinkArrow} aria-hidden="true">←</span>
        <strong className={workspaceShellClasses.homeLinkText}>首页</strong>
      </Link>
      <div className={workspaceShellClasses.headerCopy}>
        <span className="text-[0.72rem] font-[950] uppercase tracking-[0.08em] text-[var(--animal-primary-active)]">PlanPal Board</span>
        <strong className={workspaceShellClasses.headerTitle}>{planTitle || '为你推荐'}</strong>
        <small className={workspaceShellClasses.headerSummary}>{planSummary || '选一个方向后，拼图主轴会变成可编辑计划。'}</small>
      </div>
      <div className={workspaceShellClasses.headerMeta} aria-label="Plan status">
        <span className={workspaceShellClasses.headerMetaPill()}>V{planVersion}</span>
        <span className={workspaceShellClasses.headerMetaPill()}>{planStatus}</span>
        <span className={workspaceShellClasses.headerMetaPill()}>{executionBrief.nodeCountLabel}</span>
        <span className={workspaceShellClasses.headerMetaPill(executionBrief.confirmBlockedReason ? 'blocked' : 'ready')}>
          {executionBrief.confirmBlockedReason || executionBrief.checkSummary}
        </span>
      </div>
      <button
        className={workspaceShellClasses.headerConfirm}
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
      className={workspaceShellClasses.columnHeader}
      draggable
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', meta.title)
        setColumnDragImage(event, meta.title)
        onDragStart()
      }}
    >
      <div className={workspaceShellClasses.columnTitleLockup}>
        <span className={workspaceShellClasses.columnIconPill} aria-hidden="true">
          <Icon name={columnIconName[column]} size={28} bounce />
        </span>
        <div>
          <span className={workspaceShellClasses.columnDragPill}>拖拽排序</span>
          <h2 className={workspaceShellClasses.columnTitle}>{meta.title}</h2>
          <p className={workspaceShellClasses.columnHint}>{meta.hint}</p>
        </div>
      </div>
      {column !== 'puzzle' && (
        <button
          aria-label={`关闭${meta.title}列`}
          className={workspaceShellClasses.columnClose}
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

function setColumnDragImage(event: DragEvent<HTMLElement>, title: string) {
  if (typeof document === 'undefined') return

  const dragImage = document.createElement('div')
  dragImage.className = workspaceShellClasses.columnDragImage
  dragImage.textContent = `移动 ${title}`
  document.body.appendChild(dragImage)

  const rect = dragImage.getBoundingClientRect()
  event.dataTransfer.setDragImage(dragImage, Math.min(32, rect.width / 2), Math.min(18, rect.height / 2))

  window.setTimeout(() => {
    dragImage.remove()
  }, 0)
}
