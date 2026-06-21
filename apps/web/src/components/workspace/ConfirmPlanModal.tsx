import { Button } from 'animal-island-ui'
import type { Plan } from '@planpal/domain'
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
  const confirmBlocked = busy || !executionBrief.canConfirm

  return (
    <div className="confirm-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="confirm-plan-title"
        aria-modal="true"
        className="confirm-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span className="eyebrow">确认计划</span>
          <h2 id="confirm-plan-title">{plan.title}</h2>
          <p>{plan.summary}</p>
        </header>
        <div className="confirm-node-list">
          {executable.map((segment, index) => (
            <article key={segment.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{segment.startTime}-{segment.endTime} · {segment.title}</strong>
                <small>{segment.place} · {segment.budget}</small>
              </div>
              <em>{segment.locked ? '已锁定' : segment.status}</em>
            </article>
          ))}
        </div>
        <div className="confirm-warning-list">
          {executionBrief.checks.map((check) => (
            <span className={check.state} key={check.id}>{check.label}：{check.detail}</span>
          ))}
          {unlocked.length > 0 && <span className="warning">确认后仍可继续打开工作台调整</span>}
          {missingCoordinates.length > 0 && <span className="warning">路线参考不是实时导航</span>}
        </div>
        <footer>
          <Button type="dashed" onClick={onClose}>再看看</Button>
          <Button
            type="primary"
            loading={busy}
            disabled={confirmBlocked}
            title={executionBrief.confirmBlockedReason || executionBrief.checkSummary}
            onClick={onConfirm}
          >
            确认计划
          </Button>
        </footer>
      </section>
    </div>
  )
}
