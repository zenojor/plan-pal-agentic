import { Icon } from 'animal-island-ui'
import { useMemo, type CSSProperties } from 'react'
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
    <div className="map-column column-content-scroll route-column">
      <section className="route-map-panel quiet-map" aria-label="路线预览">
        <div className="route-map-heading">
          <span className="column-icon-pill compact" aria-hidden="true">
            <Icon name="icon-map" size={24} bounce />
          </span>
          <div>
            <span className="eyebrow">路线板</span>
            <h3>本地路线预览</h3>
          </div>
        </div>
        {routeNodes.length < 2 ? (
          <div className="empty-message panel-empty-state">
            <Icon name="icon-map" size={30} />
            <span>当前计划坐标不足，暂时无法生成路线预览。</span>
          </div>
        ) : (
          <div className="route-map-stage">
            {estimates.map((estimate) => {
              const from = markerPositions.get(estimate.fromId)
              const to = markerPositions.get(estimate.toId)
              if (!from || !to) return null
              return (
                <span
                  className="route-line"
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
                  className="route-marker"
                  key={node.id}
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  title={node.place}
                  type="button"
                  onClick={() => onSelectSegment(node.id)}
                >
                  <strong>{index + 1}</strong>
                  <span>{node.place}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className="route-leg-list" aria-label="路线分段">
        <div className="section-heading-row compact">
          <strong>交通分段</strong>
          <small>{estimates.length} 段参考</small>
        </div>
        {estimates.length === 0 && <div className="empty-message">有坐标的计划节点少于两个。</div>}
        {estimates.map((estimate) => {
          const hasExplicitChoice = Boolean(selectedRouteModes[estimate.id])
          const selectedMode = selectedRouteModes[estimate.id] ?? estimate.defaultMode
          const display = deriveRouteLegDisplay(estimate, selectedRouteModes)
          return (
            <article className="route-leg-card route-ticket" key={estimate.id}>
              <header>
                <span>{display.statusLabel}</span>
                <strong>{display.title}</strong>
              </header>
              <div className="route-ticket-facts">
                <span>{display.modeLabel}</span>
                <span>{display.durationLabel}</span>
                <span>{display.distanceLabel}</span>
                <span>{display.priceLabel}</span>
              </div>
              <div className="route-mode-row" role="group" aria-label="路线方式">
                <button
                  className={!hasExplicitChoice ? 'active' : ''}
                  type="button"
                  disabled={commandBusy || !hasExplicitChoice}
                  onClick={() => onRouteChoiceClear(estimate)}
                >
                  <strong>推荐</strong>
                  <span>自动</span>
                </button>
                {estimate.options.map((option) => (
                  <button
                    className={selectedMode === option.mode ? 'active' : ''}
                    key={option.mode}
                    type="button"
                    disabled={commandBusy || selectedMode === option.mode}
                    onClick={() => onRouteModeChange(estimate, option.mode)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.durationMinutes} 分钟</span>
                  </button>
                ))}
              </div>
              <small>本地估算，不代表实时导航、叫车或订单。</small>
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
