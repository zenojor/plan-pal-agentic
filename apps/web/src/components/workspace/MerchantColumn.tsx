import { Icon } from 'animal-island-ui'
import {
  deriveItineraryTicketDisplay,
  deriveMerchantReference,
  getSelectedSegmentDisplay,
  type PlanSegmentDisplay,
} from './workspaceModel'

type MerchantColumnProps = {
  displays: PlanSegmentDisplay[]
  selectedPlace: string | null
  selectedSegmentId?: string
  onSelectSegment: (segmentId: string) => void
}

export function MerchantColumn({
  displays,
  selectedPlace,
  selectedSegmentId,
  onSelectSegment,
}: MerchantColumnProps) {
  const places = displays.filter((display) => !display.isTransit)
  const selected = selectedSegmentId || selectedPlace
    ? getSelectedSegmentDisplay(places, selectedSegmentId, selectedPlace)
    : undefined
  const profile = selected ? deriveMerchantReference(selected) : null

  return (
    <div className="merchant-column column-content-scroll place-profile-column">
      {!selected || !profile ? (
        <div className="empty-message panel-empty-state">
          <Icon name="icon-shopping" size={30} />
          <span>选择拼图里的地点后，这里会显示本地参考资料。</span>
        </div>
      ) : (
        <section className="place-profile-card" aria-label="当前地点资料">
          <div className="place-profile-head">
            <span className="column-icon-pill compact" aria-hidden="true">
              <Icon name="icon-shopping" size={24} bounce />
            </span>
            <div>
              <span className="eyebrow">地点档案</span>
              <h3>{selected.place}</h3>
              <small>{selected.title}</small>
            </div>
          </div>
          <p>{profile.summary}</p>
          <div className="place-fact-strip">
            <Fact label="时间" value={selected.time} />
            <Fact label="预算" value={selected.budget} />
            <Fact label="排队" value={profile.queue} />
            <Fact label="预约" value={profile.booking} />
            <Fact label="可信度" value={profile.confidence} />
          </div>
          <dl className="place-fact-list">
            <div>
              <dt>地址</dt>
              <dd>{profile.address}</dd>
            </div>
            <div>
              <dt>营业</dt>
              <dd>{profile.hours}</dd>
            </div>
            <div>
              <dt>联系</dt>
              <dd>{profile.contact}</dd>
            </div>
          </dl>
          <div className="ticket-chip-row">
            {profile.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <p className="local-reference-note">本地 mock 资料，不代表实时营业、排队、库存或预约状态。</p>
        </section>
      )}

      <section className="place-directory" aria-label="计划地点">
        <div className="section-heading-row compact">
          <strong>地点目录</strong>
          <small>{places.length} 个节点</small>
        </div>
        <div className="place-list">
          {places.map((place) => {
            const ticket = deriveItineraryTicketDisplay(place, place.index)
            return (
              <button
                className={selected?.id === place.id ? 'active' : ''}
                key={place.id}
                type="button"
                onClick={() => onSelectSegment(place.id)}
              >
                <span className="place-list-index">{ticket.indexLabel}</span>
                <span>
                  <strong title={place.place}>{place.place}</strong>
                  <small>{ticket.time} · {ticket.title}</small>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}
