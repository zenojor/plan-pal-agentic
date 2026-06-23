import { Button, Card, Icon, Input } from 'animal-island-ui'
import { useState, type DragEvent } from 'react'
import type { PlanCommand, PlanSegment, PlanServiceSelection } from '@planpal/domain'
import { appClasses } from '../../lib/appClasses'
import { puzzleClasses } from './puzzleClasses'
import { chipClassName, workspacePrimitives } from './workspacePrimitives'
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
  serviceSelections?: PlanServiceSelection[]
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
  serviceSelections = [],
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
      className={puzzleClasses.root}
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
        <Card type="dashed" className={puzzleClasses.emptyCard}>
          <span className={workspacePrimitives.iconPillCompact} aria-hidden="true">
            <Icon name="icon-diy" size={28} />
          </span>
          <span className={appClasses.eyebrow}>等待计划</span>
          <h3 className={puzzleClasses.emptyTitle}>还没有拼图节点</h3>
          <p className={puzzleClasses.emptyText}>创建计划后，活动、晚餐和收尾节点会出现在这里。</p>
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
            <section className={puzzleClasses.freeSlot} key={item.id}>
              <span className={puzzleClasses.freeLine} aria-hidden="true" />
              <div>
                <span className={appClasses.eyebrow}>空档</span>
                <strong className={puzzleClasses.freeTitle}>{item.label}</strong>
                <p className={puzzleClasses.freeText}>{item.durationMinutes} 分钟可休息，也可临时加一个轻量安排。</p>
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
            serviceSelectionCount={serviceSelections.filter((selection) => selection.segmentId === item.segment.id).length}
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
      <div className={puzzleClasses.routeConnector}>
        <div className={puzzleClasses.routeMain}>
          <span className={puzzleClasses.routeBadge}>路线</span>
          <strong className={puzzleClasses.routeTitle}>{label}</strong>
        </div>
        <small className={puzzleClasses.routeDetail}>坐标不足 · 估计 {durationMinutes} 分钟</small>
      </div>
    )
  }
  const hasExplicitChoice = Boolean(selectedRouteModes[route.id])
  const selectedMode = selectedRouteModes[route.id] ?? route.defaultMode
  const display = deriveRouteLegDisplay(route, selectedRouteModes)
  return (
    <div className={puzzleClasses.routeConnector}>
      <div className={puzzleClasses.routeMain}>
        <span className={puzzleClasses.routeBadge}>{display.statusLabel}</span>
        <strong className={puzzleClasses.routeTitle}>{display.title}</strong>
      </div>
      <small className={puzzleClasses.routeDetail}>{display.detail}</small>
      <div className={puzzleClasses.routeModes} role="group" aria-label="拼图路线方式">
        <button
          className={puzzleClasses.routeModeButton(!hasExplicitChoice)}
          disabled={busy || !hasExplicitChoice}
          type="button"
          onClick={() => onRouteChoiceClear(route)}
        >
          推荐
        </button>
        {route.options.map((option) => (
          <button
            className={puzzleClasses.routeModeButton(selectedMode === option.mode)}
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
  serviceSelectionCount,
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
  serviceSelectionCount: number
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
  const ticket = deriveItineraryTicketDisplay({ ...segment, serviceSelectionCount }, index)

  function stopAndCommand(command: PlanCommand) {
    onCommand(command)
  }

  return (
    <Card
      className={puzzleClasses.ticket({
        selected,
        draggable: actions.canReorder,
        locked: !actions.canReorder,
        dragging: draggingSegmentId === segment.id,
        dragOver: dragOverSegmentId === segment.id && draggingSegmentId !== segment.id,
      })}
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
      <aside className={puzzleClasses.rail} aria-label={`节点 ${ticket.indexLabel}`}>
        <span className={puzzleClasses.railIndex}>{ticket.indexLabel}</span>
        <strong className={puzzleClasses.railTime}>{ticket.time}</strong>
      </aside>
      <article className={puzzleClasses.body}>
        <header className={puzzleClasses.heading}>
          <div>
            <span className={puzzleClasses.phase}>{ticket.phaseLabel}</span>
            <h3 className={puzzleClasses.title} title={segment.title}>{ticket.title}</h3>
          </div>
          <em className={puzzleClasses.lock}>{ticket.lockLabel}</em>
        </header>
        <button
          className={puzzleClasses.place}
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
        <p className={puzzleClasses.reason}>{ticket.reason}</p>
        <div className={puzzleClasses.chips}>
          {ticket.chips.map((chip, chipIndex) => <span className={chipIndex % 2 === 0 ? puzzleClasses.chip : chipClassName(chipIndex)} key={chip}>{chip}</span>)}
        </div>
        {rewriteOpen && (
          <div className={puzzleClasses.rewriteRow} onClick={(event) => event.stopPropagation()}>
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
        <div className={puzzleClasses.actions} onClick={(event) => event.stopPropagation()}>
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
