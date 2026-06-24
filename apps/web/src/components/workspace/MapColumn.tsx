import { Icon } from 'animal-island-ui'
import { useMemo, type CSSProperties } from 'react'
import { appClasses } from '../../lib/appClasses'
import { chipClassName, workspacePrimitives } from './workspacePrimitives'
import {
  buildRouteEstimates,
  deriveRouteLegDisplay,
  type PlanSegmentDisplay,
  type RouteEstimate,
  type SelectedRouteModes,
  type WorkspaceRouteMode,
} from './workspaceModel'

type MapColumnProps = {
  commandBusy: boolean
  displays: PlanSegmentDisplay[]
  selectedRouteModes: SelectedRouteModes
  onRouteChoiceClear: (route: RouteEstimate) => void
  onRouteModeChange: (route: RouteEstimate, mode: WorkspaceRouteMode) => void
  onSelectSegment: (segmentId: string) => void
}

type MarkerPosition = {
  x: number
  y: number
}

export function MapColumn({
  commandBusy,
  displays,
  selectedRouteModes,
  onRouteChoiceClear,
  onRouteModeChange,
  onSelectSegment,
}: MapColumnProps) {
  const routeNodes = displays.filter((display) => !display.isTransit && display.lnglat)
  const estimates = useMemo(() => buildRouteEstimates(displays), [displays])
  const markerPositions = useMemo(() => buildMarkerPositions(routeNodes), [routeNodes])

  return (
    <div className={`${workspacePrimitives.scrollColumn} ${workspacePrimitives.columnGrid}`}>
      <section className={workspacePrimitives.panelCard} aria-label="路线预览">
        <div className={workspacePrimitives.headingRow}>
          <span className={workspacePrimitives.iconPillCompact} aria-hidden="true">
            <Icon name="icon-map" size={24} bounce />
          </span>
          <div className={workspacePrimitives.headingCopy}>
            <span className={appClasses.eyebrow}>路线板</span>
            <h3 className={workspacePrimitives.headingTitle}>本地路线预览</h3>
          </div>
        </div>
        {routeNodes.length < 2 ? (
          <div className={workspacePrimitives.emptyState}>
            <Icon name="icon-map" size={30} />
            <span>当前计划坐标不足，暂时无法生成路线预览。</span>
          </div>
        ) : (
          <div className="relative min-h-[280px] overflow-hidden rounded-[18px] border-2 border-[rgba(25,200,185,0.26)] bg-[#e6f9f6]">
            {estimates.map((estimate) => {
              const from = markerPositions.get(estimate.fromId)
              const to = markerPositions.get(estimate.toId)
              if (!from || !to) return null
              return (
                <span
                  className="absolute h-1 origin-left rounded-[var(--animal-radius-pill)] bg-[rgba(25,200,185,0.58)]"
                  key={estimate.id}
                  style={lineStyle(from, to)}
                />
              )
            })}
            {routeNodes.map((node, index) => {
              const position = markerPositions.get(node.id)
              if (!position) return null
              return (
                <button
                  className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center gap-1 rounded-[16px] border-2 border-animal-primary bg-[#fffdf5] px-2 py-1 text-center shadow-[0_3px_0_var(--animal-primary-active)]"
                  key={node.id}
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  title={node.place}
                  type="button"
                  onClick={() => onSelectSegment(node.id)}
                >
                  <strong className="grid h-6 w-6 place-items-center rounded-full bg-animal-primary text-[0.72rem] font-[850] text-white">{index + 1}</strong>
                  <span className="max-w-[92px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-[900] text-animal-text">{node.place}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className={workspacePrimitives.directory} aria-label="路线分段">
        <div className={workspacePrimitives.sectionHeading}>
          <strong className={workspacePrimitives.sectionHeadingTitle}>交通分段</strong>
          <small className={workspacePrimitives.sectionHeadingMeta}>{estimates.length} 段参考</small>
        </div>
        {estimates.length === 0 && <div className={workspacePrimitives.emptyState}>有坐标的计划节点少于两个。</div>}
        {estimates.map((estimate) => {
          const hasExplicitChoice = Boolean(selectedRouteModes[estimate.id])
          const selectedMode = selectedRouteModes[estimate.id] ?? estimate.defaultMode
          const display = deriveRouteLegDisplay(estimate, selectedRouteModes)
          return (
            <article className={workspacePrimitives.panelCard} key={estimate.id}>
              <header className={workspacePrimitives.sectionHeading}>
                <span className={chipClassName(0)}>{display.statusLabel}</span>
                <strong className={workspacePrimitives.headingTitle}>{display.title}</strong>
              </header>
              <div className={workspacePrimitives.chipRow}>
                {[display.modeLabel, display.durationLabel, display.distanceLabel, display.priceLabel, display.reliabilityLabel].map((item, index) => (
                  <span className={chipClassName(index)} key={item}>{item}</span>
                ))}
              </div>
              <div className={workspacePrimitives.routeModeGroup} role="group" aria-label="路线方式">
                <button
                  className={workspacePrimitives.routeModeButton(!hasExplicitChoice)}
                  type="button"
                  disabled={commandBusy || !hasExplicitChoice}
                  onClick={() => onRouteChoiceClear(estimate)}
                >
                  <strong className={workspacePrimitives.routeModeStrong}>推荐</strong>
                  <span className={workspacePrimitives.routeModeText}>自动</span>
                </button>
                {estimate.options.map((option) => (
                  <button
                    className={workspacePrimitives.routeModeButton(hasExplicitChoice && selectedMode === option.mode)}
                    key={option.mode}
                    type="button"
                    disabled={commandBusy || (hasExplicitChoice && selectedMode === option.mode)}
                    onClick={() => onRouteModeChange(estimate, option.mode)}
                  >
                    <strong className={workspacePrimitives.routeModeStrong}>{option.label}</strong>
                    <span className={workspacePrimitives.routeModeText}>{option.durationMinutes} 分钟</span>
                  </button>
                ))}
              </div>
              <small className={workspacePrimitives.note}>{display.sourceLabel} · {estimate.riskNotes.join(' · ')} · 不代表实时导航、叫车或订单。</small>
            </article>
          )
        })}
      </section>
    </div>
  )
}

function buildMarkerPositions(nodes: PlanSegmentDisplay[]) {
  const positions = new Map<string, MarkerPosition>()
  const withCoordinates = nodes.filter((node) => node.lnglat)
  if (withCoordinates.length === 0) return positions

  const lngs = withCoordinates.map((node) => node.lnglat![0])
  const lats = withCoordinates.map((node) => node.lnglat![1])
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const lngRange = Math.max(0.0001, maxLng - minLng)
  const latRange = Math.max(0.0001, maxLat - minLat)

  for (const node of withCoordinates) {
    const [lng, lat] = node.lnglat!
    positions.set(node.id, {
      x: 12 + ((lng - minLng) / lngRange) * 76,
      y: 88 - ((lat - minLat) / latRange) * 76,
    })
  }
  return positions
}

function lineStyle(from: MarkerPosition, to: MarkerPosition): CSSProperties {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return {
    left: `${from.x}%`,
    top: `${from.y}%`,
    width: `${Math.sqrt(dx * dx + dy * dy)}%`,
    transform: `rotate(${Math.atan2(dy, dx)}rad)`,
  }
}
