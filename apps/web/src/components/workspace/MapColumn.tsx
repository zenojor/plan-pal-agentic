import { Icon } from 'animal-island-ui'
import { useMemo, type CSSProperties } from 'react'
import { appClasses } from '../../lib/appClasses'
import { chipClassName, workspacePrimitives } from './workspacePrimitives'
import {
  deriveRouteLegDisplay,
  type PlanSegmentDisplay,
  type RouteEstimate,
  type SelectedRouteModes,
  type WorkspaceRouteMode,
} from './workspaceModel'

type MapColumnProps = {
  commandBusy: boolean
  displays: PlanSegmentDisplay[]
  routeEstimates: RouteEstimate[]
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
  routeEstimates,
  selectedRouteModes,
  onRouteChoiceClear,
  onRouteModeChange,
  onSelectSegment,
}: MapColumnProps) {
  const routeNodes = useMemo(
    () => displays.filter(hasCoordinates),
    [displays],
  )
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
          <div className="relative min-h-[300px] overflow-hidden rounded-[20px] border-2 border-[rgba(25,200,185,0.34)] bg-[#e6f9f6] bg-animal-grid shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7),0_3px_0_rgba(17,168,155,0.2)]">
            <span className="absolute bottom-3 left-3 z-20 rounded-[var(--animal-radius-pill)] border-2 border-[rgba(25,200,185,0.34)] bg-[rgba(255,253,245,0.92)] px-3 py-1.5 text-xs font-semibold leading-none text-[var(--animal-primary-active)] shadow-[0_2px_0_rgba(17,168,155,0.2)] backdrop-blur-sm">
              {routeNodes.length} 个地点 · {routeEstimates.length} 段路线
            </span>
            {routeEstimates.map((estimate) => {
              const from = markerPositions.get(estimate.fromId)
              const to = markerPositions.get(estimate.toId)
              if (!from || !to) return null
              return (
                <span
                  className="absolute z-0 h-[3px] origin-left rounded-[var(--animal-radius-pill)] bg-animal-primary shadow-[0_2px_0_rgba(17,168,155,0.22)]"
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
                  className="absolute z-10 grid min-h-11 -translate-x-1/2 -translate-y-1/2 place-items-center gap-1 rounded-[16px] border-2 border-animal-primary bg-[#fffdf5] px-2.5 py-1.5 text-center shadow-[0_3px_0_var(--animal-primary-active),0_8px_16px_rgba(61,52,40,0.08)] transition duration-200 hover:scale-[1.04] hover:shadow-[0_4px_0_var(--animal-primary-active),0_10px_18px_rgba(61,52,40,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-animal-primary"
                  key={node.id}
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  title={node.place}
                  type="button"
                  onClick={() => onSelectSegment(node.id)}
                >
                  <strong className="grid h-6 w-6 place-items-center rounded-full bg-animal-primary text-xs font-black leading-none text-white">{index + 1}</strong>
                  <span className="max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap text-xs font-bold leading-4 text-animal-text">{node.place}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className={workspacePrimitives.directory} aria-label="路线分段">
        <div className={workspacePrimitives.sectionHeading}>
          <strong className={workspacePrimitives.sectionHeadingTitle}>交通分段</strong>
          <small className={workspacePrimitives.sectionHeadingMeta}>{routeEstimates.length} 段参考</small>
        </div>
        {routeEstimates.length === 0 && <div className={workspacePrimitives.emptyState}>有坐标的计划节点少于两个。</div>}
        {routeEstimates.map((estimate) => {
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

type LocatedPlanSegmentDisplay = PlanSegmentDisplay & {
  lnglat: [number, number]
}

function hasCoordinates(display: PlanSegmentDisplay): display is LocatedPlanSegmentDisplay {
  return !display.isTransit && Boolean(display.lnglat)
}

function buildMarkerPositions(nodes: LocatedPlanSegmentDisplay[]) {
  const positions = new Map<string, MarkerPosition>()
  if (nodes.length === 0) return positions

  const lngs = nodes.map((node) => node.lnglat[0])
  const lats = nodes.map((node) => node.lnglat[1])
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const lngRange = Math.max(0.0001, maxLng - minLng)
  const latRange = Math.max(0.0001, maxLat - minLat)

  for (const node of nodes) {
    const [lng, lat] = node.lnglat
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
