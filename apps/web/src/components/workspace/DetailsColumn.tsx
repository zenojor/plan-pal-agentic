import { Icon } from 'animal-island-ui'
import { appClasses } from '../../lib/appClasses'
import { chipClassName, workspacePrimitives } from './workspacePrimitives'
import { deriveItineraryTicketDisplay, type PlanSegmentDisplay } from './workspaceModel'

type DetailsColumnProps = {
  displays: PlanSegmentDisplay[]
  selectedSegmentId?: string
  onSelectSegment: (segmentId: string) => void
}

export function DetailsColumn({ displays, selectedSegmentId, onSelectSegment }: DetailsColumnProps) {
  if (displays.length === 0) {
    return (
      <div className={`${workspacePrimitives.scrollColumn} ${workspacePrimitives.columnGrid}`}>
        <div className={workspacePrimitives.emptyState}>
          <Icon name="icon-critterpedia" size={30} />
          <span>还没有节点详情。</span>
        </div>
      </div>
    )
  }

  const selected = selectedSegmentId ? displays.find((display) => display.id === selectedSegmentId) : undefined
  const selectedTicket = selected ? deriveItineraryTicketDisplay(selected, selected.index) : undefined

  return (
    <div className={`${workspacePrimitives.scrollColumn} ${workspacePrimitives.columnGrid}`}>
      {selected && selectedTicket ? (
        <section className={workspacePrimitives.panelCard} aria-label="选中节点检查器">
          <div className={workspacePrimitives.headingRow}>
            <span className={workspacePrimitives.iconPillCompact} aria-hidden="true">
              <Icon name="icon-critterpedia" size={24} bounce />
            </span>
            <div className={workspacePrimitives.headingCopy}>
              <span className={appClasses.eyebrow}>节点检查器</span>
              <h3 className={workspacePrimitives.headingTitle} title={selected.title}>{selectedTicket.title}</h3>
              <small className={workspacePrimitives.headingSubtitle}>{selectedTicket.time} · {selectedTicket.place}</small>
            </div>
          </div>
          <p className={workspacePrimitives.note}>{selectedTicket.reason}</p>
          <div className={workspacePrimitives.chipRow}>
            {selectedTicket.chips.map((chip, index) => <span className={chipClassName(index)} key={chip}>{chip}</span>)}
            <span className={chipClassName(selectedTicket.chips.length)}>{selectedTicket.statusLabel}</span>
          </div>
          <dl className={workspacePrimitives.factList}>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>预算</dt>
              <dd className={workspacePrimitives.factDef}>{selectedTicket.budgetLabel}</dd>
            </div>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>时长</dt>
              <dd className={workspacePrimitives.factDef}>{selectedTicket.durationLabel}</dd>
            </div>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>阶段</dt>
              <dd className={workspacePrimitives.factDef}>{selectedTicket.phaseLabel}</dd>
            </div>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>备注</dt>
              <dd className={workspacePrimitives.factDef}>{selectedTicket.notesLabel}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <section className={workspacePrimitives.panelCard} aria-label="选中节点检查器">
          <div className={workspacePrimitives.emptyState}>
            <Icon name="icon-critterpedia" size={30} />
            <span>选择一个拼图节点后，这里会显示节点详情。</span>
          </div>
        </section>
      )}

      <section className={workspacePrimitives.directory} aria-label="全部节点索引">
        <div className={workspacePrimitives.sectionHeading}>
          <strong className={workspacePrimitives.sectionHeadingTitle}>节点索引</strong>
          <small className={workspacePrimitives.sectionHeadingMeta}>{displays.length} 条</small>
        </div>
        <div className={workspacePrimitives.list}>
          {displays.map((display) => {
            const ticket = deriveItineraryTicketDisplay(display, display.index)
            return (
              <button
                className={workspacePrimitives.listItem(selected?.id === display.id, display.locked)}
                key={display.id}
                type="button"
                onClick={() => onSelectSegment(display.id)}
              >
                <span className={workspacePrimitives.listIndex}>{ticket.indexLabel}</span>
                <div>
                  <strong className={workspacePrimitives.listTitle} title={display.title}>{ticket.title}</strong>
                  <small className={workspacePrimitives.listMeta}>{ticket.time} · {ticket.place}</small>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
