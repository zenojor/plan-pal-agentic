import { Icon } from 'animal-island-ui'
import type { PlanCommand, Plan } from '@planpal/domain'
import { appClasses } from '../../lib/appClasses'
import { chipClassName, workspacePrimitives } from './workspacePrimitives'
import {
  deriveItineraryTicketDisplay,
  deriveMerchantReference,
  deriveMerchantOfferingDisplays,
  groupMerchantOfferingsByCategory,
  getSelectedSegmentDisplay,
  buildRemoveServiceItemCommand,
  buildSelectServiceItemCommand,
  buildUpdateServiceItemQuantityCommand,
  type PlanSegmentDisplay,
} from './workspaceModel'

type MerchantColumnProps = {
  displays: PlanSegmentDisplay[]
  selectedPlace: string | null
  selectedSegmentId?: string
  plan: Plan
  commandBusy: boolean
  onCommand: (command: PlanCommand) => void
  onSelectSegment: (segmentId: string) => void
}

export function MerchantColumn({
  displays,
  selectedPlace,
  selectedSegmentId,
  plan,
  commandBusy,
  onCommand,
  onSelectSegment,
}: MerchantColumnProps) {
  const places = displays.filter((display) => !display.isTransit)
  const selected = selectedSegmentId || selectedPlace
    ? getSelectedSegmentDisplay(places, selectedSegmentId, selectedPlace)
    : undefined
  const profile = selected ? deriveMerchantReference(selected) : null
  const offeringGroups = selected
    ? groupMerchantOfferingsByCategory(deriveMerchantOfferingDisplays(selected, plan.serviceSelections ?? []))
    : []

  return (
    <div className={`${workspacePrimitives.scrollColumn} ${workspacePrimitives.columnGrid}`}>
      {!selected || !profile ? (
        <div className={workspacePrimitives.emptyState}>
          <Icon name="icon-shopping" size={30} />
          <span>选择拼图里的地点后，这里会显示本地参考资料。</span>
        </div>
      ) : (
        <section className={workspacePrimitives.panelCard} aria-label="当前地点资料">
          <div className={workspacePrimitives.headingRow}>
            <span className={workspacePrimitives.iconPillCompact} aria-hidden="true">
              <Icon name="icon-shopping" size={24} bounce />
            </span>
            <div className={workspacePrimitives.headingCopy}>
              <span className={appClasses.eyebrow}>地点档案</span>
              <h3 className={workspacePrimitives.headingTitle}>{selected.place}</h3>
              <small className={workspacePrimitives.headingSubtitle}>{selected.title}</small>
            </div>
          </div>
          <p className={workspacePrimitives.note}>{profile.summary}</p>
          <div className={workspacePrimitives.factStrip}>
            <Fact label="时间" value={selected.time} />
            <Fact label="预算" value={selected.budget} />
            <Fact label="评分" value={profile.rating} />
            <Fact label="价位" value={profile.priceLevel} />
            <Fact label="排队" value={profile.queue} />
            <Fact label="预约" value={profile.booking} />
            <Fact label="风险" value={profile.queueRisk} />
          </div>
          <dl className={workspacePrimitives.factList}>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>地址</dt>
              <dd className={workspacePrimitives.factDef}>{profile.address}</dd>
            </div>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>营业</dt>
              <dd className={workspacePrimitives.factDef}>{profile.hours}</dd>
            </div>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>联系</dt>
              <dd className={workspacePrimitives.factDef}>{profile.contact}</dd>
            </div>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>适合</dt>
              <dd className={workspacePrimitives.factDef}>{profile.suitableFor.join('、')}</dd>
            </div>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>模拟源</dt>
              <dd className={workspacePrimitives.factDef}>{profile.sourceLabel} · {profile.confidence}</dd>
            </div>
          </dl>
          <div className={workspacePrimitives.chipRow}>
            {profile.tags.map((tag, index) => <span className={chipClassName(index)} key={tag}>{tag}</span>)}
          </div>
          <div className={workspacePrimitives.chipRow}>
            {profile.constraints.map((item, index) => <span className={chipClassName(index)} key={item}>{item}</span>)}
          </div>
          <div className={workspacePrimitives.factList}>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>最佳时段</dt>
              <dd className={workspacePrimitives.factDef}>{profile.bestTime}</dd>
            </div>
            <div className={workspacePrimitives.factRow}>
              <dt className={workspacePrimitives.factTerm}>模拟项目</dt>
              <dd className={workspacePrimitives.factDef}>{profile.mockItems.slice(0, 2).join(' / ')}</dd>
            </div>
          </div>
          {offeringGroups.length > 0 && (
            <div className="grid min-w-0 gap-[0.48rem]" aria-label="商品和服务">
              <div className={workspacePrimitives.sectionHeading}>
                <strong className={workspacePrimitives.sectionHeadingTitle}>商品/服务</strong>
                <small className={workspacePrimitives.sectionHeadingMeta}>Sandbox mock</small>
              </div>
              {offeringGroups.map((group) => (
                <section className="grid min-w-0 gap-[0.48rem]" key={group.category}>
                  <div className={workspacePrimitives.sectionHeading}>
                    <strong className={workspacePrimitives.sectionHeadingTitle}>{group.label}</strong>
                    <small className={workspacePrimitives.sectionHeadingMeta}>{group.offerings.length} 项</small>
                  </div>
                  <div className="grid min-w-0 gap-[0.48rem]">
                    {group.offerings.map((offering) => (
                      <article className={workspacePrimitives.offeringCard(offering.selected)} key={offering.id}>
                        <header>
                          <strong className={workspacePrimitives.headingTitle} title={offering.title}>{offering.title}</strong>
                          <small className={workspacePrimitives.headingSubtitle}>{offering.priceLabel} · {offering.availabilityLabel}</small>
                        </header>
                        <p className={workspacePrimitives.note}>{offering.description}</p>
                        <small className={workspacePrimitives.headingSubtitle}>{offering.detailLabel || offering.fulfillmentLabel}</small>
                        <div className={workspacePrimitives.chipRow}>
                          {offering.tags.slice(0, 4).map((tag, index) => <span className={chipClassName(index)} key={tag}>{tag}</span>)}
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-[0.34rem]">
                          {offering.selected && offering.selectionId ? (
                            <>
                              <button
                                className={workspacePrimitives.smallButton()}
                                type="button"
                                disabled={commandBusy || offering.quantity <= 1}
                                onClick={() => onCommand(buildUpdateServiceItemQuantityCommand(offering.selectionId!, offering.quantity - 1))}
                              >
                                -
                              </button>
                              <strong className="grid h-8 min-w-8 place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.8125rem] font-black leading-none text-animal-text shadow-[0_2px_0_var(--animal-focus-yellow-d)]">{offering.quantity}</strong>
                              <button
                                className={workspacePrimitives.smallButton()}
                                type="button"
                                disabled={commandBusy}
                                onClick={() => onCommand(buildUpdateServiceItemQuantityCommand(offering.selectionId!, offering.quantity + 1))}
                              >
                                +
                              </button>
                              <button
                                className={workspacePrimitives.smallButton()}
                                type="button"
                                disabled={commandBusy}
                                onClick={() => onCommand(buildRemoveServiceItemCommand(offering.selectionId!))}
                              >
                                移除
                              </button>
                            </>
                          ) : (
                            <button
                              className={workspacePrimitives.selectActionButton}
                              type="button"
                              disabled={commandBusy}
                              onClick={() => onCommand(buildSelectServiceItemCommand({
                                segmentId: selected.id,
                                merchantId: offering.merchantId,
                                offeringId: offering.id,
                                quantity: offering.quantity,
                              }))}
                            >
                              <strong className={workspacePrimitives.routeModeStrong}>模拟选择</strong>
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          <p className={workspacePrimitives.note}>本地 mock 资料，不代表实时营业、排队、库存或预约状态。</p>
        </section>
      )}

      <section className={workspacePrimitives.directory} aria-label="计划地点">
        <div className={workspacePrimitives.sectionHeading}>
          <strong className={workspacePrimitives.sectionHeadingTitle}>地点目录</strong>
          <small className={workspacePrimitives.sectionHeadingMeta}>{places.length} 个节点</small>
        </div>
        <div className={workspacePrimitives.list}>
          {places.map((place) => {
            const ticket = deriveItineraryTicketDisplay(place, place.index)
            return (
              <button
                className={workspacePrimitives.listItem(selected?.id === place.id)}
                key={place.id}
                type="button"
                onClick={() => onSelectSegment(place.id)}
              >
                <span className={workspacePrimitives.listIndex}>{ticket.indexLabel}</span>
                <span>
                  <strong className={workspacePrimitives.listTitle} title={place.place}>{place.place}</strong>
                  <small className={workspacePrimitives.listMeta}>{ticket.time} · {ticket.title}</small>
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
    <span className={workspacePrimitives.factPill}>
      <small className={workspacePrimitives.factLabel}>{label}</small>
      <strong className={workspacePrimitives.factValue}>{value}</strong>
    </span>
  )
}
