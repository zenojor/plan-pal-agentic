import { Button, Card, Icon, Input } from 'animal-island-ui'
import { useState, type DragEvent } from 'react'
import type { PlanCommand, PlanSegment } from '@planpal/domain'
import {
  deriveItineraryTicketDisplay,
  deriveRouteLegDisplay,
  deriveWorkspaceDisplayItems,
  getSegmentActionState,
  type RouteEstimate,
  type SelectedRouteModes,
  type WorkspaceRouteMode,
} from './workspaceModel'

type PuzzleColumnProps = {
  commandBusy: boolean
  dragOverSegmentId: string | null
  draggingSegmentId: string | null
  routeEstimates: RouteEstimate[]
  selectedRouteModes: SelectedRouteModes
  selectedSegmentId?: string
  segments: PlanSegment[]
  onCommand: (command: PlanCommand) => void
  onDragEnd: () => void
  onDragStart: (segmentId: string) => void
  onDropSegment: (targetSegmentId: string | null) => void
  onOpenMerchant: (place: string) => void
  onRouteChoiceClear: (route: RouteEstimate) => void
  onRouteModeChange: (route: RouteEstimate, mode: WorkspaceRouteMode) => void
  onSelectSegment: (segmentId: string) => void
  onSetDragOverSegment: (segmentId: string | null) => void
}

export function PuzzleColumn({
  commandBusy,
  dragOverSegmentId,
  draggingSegmentId,
  routeEstimates,
  selectedRouteModes,
  selectedSegmentId,
  segments,
  onCommand,
  onDragEnd,
  onDragStart,
  onDropSegment,
  onOpenMerchant,
  onRouteChoiceClear,
  onRouteModeChange,
  onSelectSegment,
  onSetDragOverSegment,
}: PuzzleColumnProps) {
  const executableCount = segments.filter((segment) => !segment.isTransit).length
  const executableSegments = segments.filter((segment) => !segment.isTransit)
  const displayItems = deriveWorkspaceDisplayItems(segments)

  return (
    <div
      className="puzzle-column column-content-scroll puzzle-timeline"
      onDragOver={(event) => {
        if (draggingSegmentId) event.preventDefault()
      }}
      onDrop={(event) => {
        if (!draggingSegmentId) return
        event.stopPropagation()
        onDropSegment(null)
      }}
    >
      {segments.length === 0 && (
        <Card type="dashed" className="empty-puzzle-card">
          <span className="column-icon-pill compact" aria-hidden="true">
            <Icon name="icon-diy" size={28} />
          </span>
          <span className="eyebrow">等待计划</span>
          <h3>还没有拼图节点</h3>
          <p>创建计划后，活动、晚餐和收尾节点会出现在这里。</p>
        </Card>
      )}
      {displayItems.map((item) => {
        if (item.kind === 'transit-summary') {
          const route = routeEstimates.find((estimate) => estimate.fromId === item.fromSegmentId && estimate.toId === item.toSegmentId)
          return (
            <RouteConnector
              busy={commandBusy}
              durationMinutes={item.durationMinutes}
              key={item.id}
              label={item.label}
              route={route}
              selectedRouteModes={selectedRouteModes}
              onRouteChoiceClear={onRouteChoiceClear}
              onRouteModeChange={onRouteModeChange}
            />
          )
        }
        if (item.kind === 'free-slot') {
          return (
            <section className="puzzle-free-slot" key={item.id}>
              <span className="puzzle-free-line" aria-hidden="true" />
              <div>
                <span className="eyebrow">空档</span>
                <strong>{item.label}</strong>
                <p>{item.durationMinutes} 分钟可休息，也可临时加一个轻量安排。</p>
              </div>
              <Button
                type="primary"
                size="small"
                disabled={commandBusy}
                onClick={() => onCommand({
                  type: 'REFRESH_CANDIDATES',
                  source: 'puzzle',
                  mode: 'add-after',
                  afterSegmentId: item.afterSegmentId,
                })}
              >
                加点别的
              </Button>
            </section>
          )
        }
        const segmentIndex = executableSegments.findIndex((segment) => segment.id === item.segment.id)
        return (
          <SegmentCard
            commandBusy={commandBusy}
            dragOverSegmentId={dragOverSegmentId}
            draggingSegmentId={draggingSegmentId}
            executableCount={executableCount}
            index={segmentIndex >= 0 ? segmentIndex : 0}
            key={item.segment.id}
            nextSegmentId={executableSegments[segmentIndex + 1]?.id}
            previousSegmentId={executableSegments[segmentIndex - 1]?.id}
            segment={item.segment}
            selected={selectedSegmentId === item.segment.id}
            onCommand={onCommand}
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
            onDropSegment={onDropSegment}
            onOpenMerchant={onOpenMerchant}
            onSelectSegment={onSelectSegment}
            onSetDragOverSegment={onSetDragOverSegment}
          />
        )
      })}
    </div>
  )
}

function RouteConnector({
  busy,
  durationMinutes,
  label,
  route,
  selectedRouteModes,
  onRouteChoiceClear,
  onRouteModeChange,
}: {
  busy: boolean
  durationMinutes: number
  label: string
  route?: RouteEstimate
  selectedRouteModes: SelectedRouteModes
  onRouteChoiceClear: (route: RouteEstimate) => void
  onRouteModeChange: (route: RouteEstimate, mode: WorkspaceRouteMode) => void
}) {
  if (!route) {
    return (
      <div className="puzzle-route-connector">
        <div className="puzzle-route-main">
          <span className="puzzle-route-badge">路线</span>
          <strong className="puzzle-route-title">{label}</strong>
        </div>
        <small className="puzzle-route-detail">坐标不足 · 估计 {durationMinutes} 分钟</small>
      </div>
    )
  }
  const hasExplicitChoice = Boolean(selectedRouteModes[route.id])
  const selectedMode = selectedRouteModes[route.id] ?? route.defaultMode
  const display = deriveRouteLegDisplay(route, selectedRouteModes)
  return (
    <div className="puzzle-route-connector">
      <div className="puzzle-route-main">
        <span className="puzzle-route-badge">{display.statusLabel}</span>
        <strong className="puzzle-route-title">{display.title}</strong>
      </div>
      <small className="puzzle-route-detail">{display.detail}</small>
      <div className="puzzle-route-modes" role="group" aria-label="拼图路线方式">
        <button
          className={!hasExplicitChoice ? 'active' : ''}
          disabled={busy || !hasExplicitChoice}
          type="button"
          onClick={() => onRouteChoiceClear(route)}
        >
          推荐
        </button>
        {route.options.map((option) => (
          <button
            className={selectedMode === option.mode ? 'active' : ''}
            disabled={busy || selectedMode === option.mode}
            key={option.mode}
            type="button"
            onClick={() => onRouteModeChange(route, option.mode)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SegmentCard({
  commandBusy,
  dragOverSegmentId,
  draggingSegmentId,
  executableCount,
  index,
  nextSegmentId,
  previousSegmentId,
  segment,
  selected,
  onCommand,
  onDragEnd,
  onDragStart,
  onDropSegment,
  onOpenMerchant,
  onSelectSegment,
  onSetDragOverSegment,
}: {
  commandBusy: boolean
  dragOverSegmentId: string | null
  draggingSegmentId: string | null
  executableCount: number
  index: number
  nextSegmentId?: string
  previousSegmentId?: string
  segment: PlanSegment
  selected: boolean
  onCommand: (command: PlanCommand) => void
  onDragEnd: () => void
  onDragStart: (segmentId: string) => void
  onDropSegment: (targetSegmentId: string | null) => void
  onOpenMerchant: (place: string) => void
  onSelectSegment: (segmentId: string) => void
  onSetDragOverSegment: (segmentId: string | null) => void
}) {
  const [rewriteOpen, setRewriteOpen] = useState(false)
  const [draft, setDraft] = useState(segment.notes ?? '')
  const actions = getSegmentActionState(segment)
  const canDelete = actions.canDelete && executableCount > 1
  const ticket = deriveItineraryTicketDisplay(segment, index)

  function stopAndCommand(command: PlanCommand) {
    onCommand(command)
  }

  return (
    <Card
      className={[
        'puzzle-ticket',
        selected ? 'is-selected' : '',
        actions.canReorder ? 'is-draggable' : 'is-locked',
        draggingSegmentId === segment.id ? 'is-dragging' : '',
        dragOverSegmentId === segment.id && draggingSegmentId !== segment.id ? 'is-drag-over' : '',
      ].filter(Boolean).join(' ')}
      draggable={actions.canReorder}
      onClick={() => onSelectSegment(segment.id)}
      onDragEnd={onDragEnd}
      onDragEnter={() => {
        if (draggingSegmentId && draggingSegmentId !== segment.id && actions.canReorder) {
          onSetDragOverSegment(segment.id)
        }
      }}
      onDragLeave={() => onSetDragOverSegment(null)}
      onDragOver={(event: DragEvent<HTMLDivElement>) => {
        if (draggingSegmentId && actions.canReorder) event.preventDefault()
      }}
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        if (!actions.canReorder) return
        event.stopPropagation()
        onDragStart(segment.id)
      }}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        if (!actions.canReorder) return
        event.stopPropagation()
        onDropSegment(segment.id)
      }}
    >
      <aside className="puzzle-ticket-rail" aria-label={`节点 ${ticket.indexLabel}`}>
        <span>{ticket.indexLabel}</span>
        <strong>{ticket.time}</strong>
      </aside>
      <article className="puzzle-ticket-body">
        <header className="puzzle-ticket-heading">
          <div>
            <span>{ticket.phaseLabel}</span>
            <h3 title={segment.title}>{ticket.title}</h3>
          </div>
          <em>{ticket.lockLabel}</em>
        </header>
        <button
          className="puzzle-ticket-place"
          type="button"
          title={segment.place}
          onClick={(event) => {
            event.stopPropagation()
            onOpenMerchant(segment.place)
          }}
        >
          <Icon name="icon-map" size={18} />
          {ticket.place}
        </button>
        <p className="puzzle-ticket-reason">{ticket.reason}</p>
        <div className="puzzle-ticket-chips">
          {ticket.chips.map((chip) => <span key={chip}>{chip}</span>)}
        </div>
        {rewriteOpen && (
          <div className="puzzle-rewrite-row" onClick={(event) => event.stopPropagation()}>
            <Input
              allowClear
              shadow
              value={draft}
              placeholder="直接写入节点备注"
              onChange={(event) => setDraft(event.target.value)}
              onClear={() => setDraft('')}
            />
            <Button
              type="primary"
              disabled={!draft.trim() || !actions.canRewrite || commandBusy}
              onClick={() => {
                stopAndCommand({
                  type: 'REWRITE_SEGMENT',
                  source: 'puzzle',
                  segmentId: segment.id,
                  changes: { notes: draft.trim(), reason: draft.trim() || segment.reason },
                })
                setRewriteOpen(false)
              }}
            >
              保存
            </Button>
          </div>
        )}
        <div className="puzzle-ticket-actions" onClick={(event) => event.stopPropagation()}>
          <Button
            size="small"
            type="primary"
            disabled={segment.locked ? commandBusy : !actions.canReplace || commandBusy}
            onClick={() => {
              if (segment.locked) {
                onOpenMerchant(segment.place)
                return
              }
              stopAndCommand({
                type: 'REPLACE_SEGMENT',
                source: 'puzzle',
                segmentId: segment.id,
                searchQuery: '换一个候选',
              })
            }}
          >
            {ticket.primaryActionLabel}
          </Button>
          <Button
            size="small"
            type="dashed"
            disabled={!previousSegmentId || !actions.canReorder || commandBusy}
            onClick={() =>
              previousSegmentId &&
              stopAndCommand({
                type: 'REORDER_SEGMENT',
                source: 'puzzle',
                segmentId: segment.id,
                anchorSegmentId: previousSegmentId,
                position: 'BEFORE',
              })
            }
          >
            上移
          </Button>
          <Button
            size="small"
            type="dashed"
            disabled={!nextSegmentId || !actions.canReorder || commandBusy}
            onClick={() =>
              nextSegmentId &&
              stopAndCommand({
                type: 'REORDER_SEGMENT',
                source: 'puzzle',
                segmentId: segment.id,
                anchorSegmentId: nextSegmentId,
                position: 'AFTER',
              })
            }
          >
            下移
          </Button>
          <Button
            size="small"
            type="dashed"
            disabled={!actions.canRewrite || commandBusy}
            onClick={() => setRewriteOpen((open) => !open)}
          >
            备注
          </Button>
          <Button
            size="small"
            type="dashed"
            disabled={commandBusy}
            onClick={() =>
              stopAndCommand({
                type: segment.locked ? 'UNLOCK_SEGMENT' : 'LOCK_SEGMENT',
                source: 'puzzle',
                segmentId: segment.id,
              })
            }
          >
            {segment.locked ? '解锁' : '锁定'}
          </Button>
          <Button
            danger
            size="small"
            type="dashed"
            disabled={!canDelete || commandBusy}
            title={canDelete ? '删除这个节点' : '至少保留一个可执行节点'}
            onClick={() =>
              stopAndCommand({
                type: 'DELETE_SEGMENT',
                source: 'puzzle',
                segmentId: segment.id,
              })
            }
          >
            删除
          </Button>
        </div>
      </article>
    </Card>
  )
}
