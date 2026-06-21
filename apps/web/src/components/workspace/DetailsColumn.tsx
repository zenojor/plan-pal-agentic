import { Icon } from 'animal-island-ui'
import { deriveItineraryTicketDisplay, type PlanSegmentDisplay } from './workspaceModel'

type DetailsColumnProps = {
  displays: PlanSegmentDisplay[]
  selectedSegmentId?: string
  onSelectSegment: (segmentId: string) => void
}

export function DetailsColumn({ displays, selectedSegmentId, onSelectSegment }: DetailsColumnProps) {
  if (displays.length === 0) {
    return (
      <div className="details-column column-content-scroll inspector-column">
        <div className="empty-message panel-empty-state">
          <Icon name="icon-critterpedia" size={30} />
          <span>还没有节点详情。</span>
        </div>
      </div>
    )
  }

  const selected = selectedSegmentId ? displays.find((display) => display.id === selectedSegmentId) : undefined
  const selectedTicket = selected ? deriveItineraryTicketDisplay(selected, selected.index) : undefined

  return (
    <div className="details-column column-content-scroll inspector-column">
      {selected && selectedTicket ? (
        <section className="node-inspector-card" aria-label="选中节点检查器">
          <div className="node-inspector-head">
            <span className="column-icon-pill compact" aria-hidden="true">
              <Icon name="icon-critterpedia" size={24} bounce />
            </span>
            <div>
              <span className="eyebrow">节点检查器</span>
              <h3 title={selected.title}>{selectedTicket.title}</h3>
              <small>{selectedTicket.time} · {selectedTicket.place}</small>
            </div>
          </div>
          <p>{selectedTicket.reason}</p>
          <div className="ticket-chip-row">
            {selectedTicket.chips.map((chip) => <span key={chip}>{chip}</span>)}
            <span>{selectedTicket.statusLabel}</span>
          </div>
          <dl className="inspector-facts">
            <div>
              <dt>预算</dt>
              <dd>{selectedTicket.budgetLabel}</dd>
            </div>
            <div>
              <dt>时长</dt>
              <dd>{selectedTicket.durationLabel}</dd>
            </div>
            <div>
              <dt>阶段</dt>
              <dd>{selectedTicket.phaseLabel}</dd>
            </div>
            <div>
              <dt>备注</dt>
              <dd>{selectedTicket.notesLabel}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <section className="node-inspector-card" aria-label="选中节点检查器">
          <div className="empty-message panel-empty-state">
            <Icon name="icon-critterpedia" size={30} />
            <span>选择一个拼图节点后，这里会显示节点详情。</span>
          </div>
        </section>
      )}

      <section className="details-index-panel compact-index" aria-label="全部节点索引">
        <div className="section-heading-row compact">
          <strong>节点索引</strong>
          <small>{displays.length} 条</small>
        </div>
        <div className="details-index-list">
          {displays.map((display) => {
            const ticket = deriveItineraryTicketDisplay(display, display.index)
            return (
              <button
                className={[
                  'details-index-item',
                  selected?.id === display.id ? 'active' : '',
                  display.locked ? 'locked' : '',
                ].filter(Boolean).join(' ')}
                key={display.id}
                type="button"
                onClick={() => onSelectSegment(display.id)}
              >
                <span>{ticket.indexLabel}</span>
                <div>
                  <strong title={display.title}>{ticket.title}</strong>
                  <small>{ticket.time} · {ticket.place}</small>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
