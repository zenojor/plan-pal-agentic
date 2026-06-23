import { Button } from 'animal-island-ui'
import type { Plan } from '@planpal/domain'
import { appClasses, modalClasses } from '../../lib/appClasses'
import type { PlanExecutionBrief } from './workspaceModel'

type ConfirmPlanModalProps = {
  busy: boolean
  executionBrief: PlanExecutionBrief
  open: boolean
  plan: Plan
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmPlanModal({ busy, executionBrief, open, plan, onClose, onConfirm }: ConfirmPlanModalProps) {
  if (!open) return null
  const executable = plan.segments.filter((segment) => !segment.isTransit)
  const missingCoordinates = executable.filter((segment) => !segment.lnglat)
  const unlocked = executable.filter((segment) => !segment.locked)
  const serviceSelections = plan.serviceSelections ?? []
  const confirmBlocked = busy || !executionBrief.canConfirm

  return (
    <div className={modalClasses.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="confirm-plan-title"
        aria-modal="true"
        className={modalClasses.modal}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span className={appClasses.eyebrow}>模拟确认</span>
          <h2 className={modalClasses.title} id="confirm-plan-title">{plan.title}</h2>
          <p className={modalClasses.text}>{plan.summary} 确认后会生成本地 sandbox 模拟确认单，不会真实预订或支付。</p>
        </header>
        <div className={modalClasses.nodeList}>
          {executable.map((segment, index) => (
            <article className={modalClasses.nodeItem} key={segment.id}>
              <span className={modalClasses.nodeIndex}>{index + 1}</span>
              <div>
                <strong className={modalClasses.nodeTitle}>{segment.startTime}-{segment.endTime} · {segment.title}</strong>
                <small className={modalClasses.nodeMeta}>{segment.place} · {segment.budget}</small>
              </div>
              <em className={modalClasses.nodeStatus}>{segment.locked ? '已锁定' : segment.status}</em>
            </article>
          ))}
        </div>
        <div className={modalClasses.warningList}>
          {executionBrief.checks.map((check) => (
            <span className={modalClasses.warning(check.state)} key={check.id}>{check.label}：{check.detail}</span>
          ))}
          {serviceSelections.length > 0 ? (
            <span className={modalClasses.warning('ok')}>已选 {serviceSelections.length} 个商品/服务项，将写入 sandbox receipt</span>
          ) : (
            <span className={modalClasses.warning('warning')}>未手动选择商品/服务时，会自动使用默认 mock item</span>
          )}
          {unlocked.length > 0 && <span className={modalClasses.warning('warning')}>确认后仍可继续打开工作台调整</span>}
          {missingCoordinates.length > 0 && <span className={modalClasses.warning('warning')}>路线参考不是实时导航</span>}
          <span className={modalClasses.warning('ok')}>模拟确认单不是商户订单、真实预订或支付凭证</span>
        </div>
        <footer className={modalClasses.footer}>
          <Button type="dashed" onClick={onClose}>再看看</Button>
          <Button
            type="primary"
            loading={busy}
            disabled={confirmBlocked}
            title={executionBrief.confirmBlockedReason || executionBrief.checkSummary}
            onClick={onConfirm}
          >
            生成模拟确认单
          </Button>
        </footer>
      </section>
    </div>
  )
}
