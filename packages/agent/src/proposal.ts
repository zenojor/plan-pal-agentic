import {
  applyPlanCommand,
  reorderPlanSegmentsWithTime,
  type ConfirmablePlanCommand,
  type PendingAction,
  type Plan,
  type PlanCommand,
} from '@planpal/domain'
import type { PlanCommandProposal } from './schemas'

export function buildPendingActionPreview(
  plan: Plan,
  proposal: PlanCommandProposal,
  runId: string,
): PendingAction {
  return buildPendingActionPreviewResult(plan, proposal, runId).plan.pendingAction!
}

export function buildPendingActionPreviewResult(
  plan: Plan,
  proposal: PlanCommandProposal,
  runId: string,
) {
  const command = proposal.commands[0] as PlanCommand | undefined
  if (!command) throw new Error('Proposal has no command')
  const previewCommand = proposal.kind === 'command-approval'
    ? createCommandConfirmationCommand(plan, command, proposal.actionId, proposal.rationale)
    : command
  const result = applyPlanCommand(plan, previewCommand, runId)
  if (!result.plan.pendingAction) throw new Error('Proposal did not create a pending action')
  return { ...result, command: previewCommand }
}

export function createCommandConfirmationCommand(
  plan: Plan,
  command: PlanCommand,
  actionId: string,
  reason: string,
): PlanCommand {
  if (!isConfirmable(command)) throw new Error(`${command.type} cannot be proposed for approval`)
  const descriptor = describeCommand(plan, command, reason)
  return {
    type: 'REQUEST_COMMAND_CONFIRMATION',
    source: 'agent',
    actionId,
    title: descriptor.title,
    description: descriptor.description,
    severity: descriptor.severity,
    confirmLabel: descriptor.confirmLabel,
    cancelLabel: '取消',
    commands: [command],
    preview: descriptor.preview,
  }
}

function isConfirmable(command: PlanCommand): command is ConfirmablePlanCommand {
  return command.type !== 'REQUEST_COMMAND_CONFIRMATION'
    && command.type !== 'CONFIRM_COMMAND_ACTION'
    && command.type !== 'RESTORE_PLAN_VERSION'
    && command.type !== 'REFRESH_CANDIDATES'
    && command.type !== 'REFRESH_SERVICE_ITEMS'
    && command.type !== 'REQUEST_CLARIFICATION'
    && command.type !== 'CHOOSE_CANDIDATE'
    && command.type !== 'CHOOSE_PLAN_VARIANT'
}

function describeCommand(plan: Plan, command: ConfirmablePlanCommand, reason: string) {
  const executable = plan.segments.filter((segment) => !segment.isTransit)
  const target = 'segmentId' in command
    ? plan.segments.find((segment) => segment.id === command.segmentId)
    : undefined
  const affectedSegmentIds = affectedIds(plan, command)
  const affectedSegmentTitles = affectedSegmentIds
    .map((id) => plan.segments.find((segment) => segment.id === id)?.title)
    .filter((title): title is string => Boolean(title))
  const basePreview = {
    affectedSegmentIds,
    affectedSegmentTitles,
    beforeVersion: plan.currentVersion,
    summary: reason,
    riskNotes: [] as string[],
    beforeOrder: executable.map((segment) => segment.title),
  }
  if (command.type === 'CLEAR_PLAN_SEGMENTS') {
    const kept = executable.filter((segment) => segment.locked && !command.includeLocked)
    return {
      title: '确认清空计划',
      description: `将清空 ${executable.length - kept.length} 个未锁定节点。`,
      severity: 'destructive' as const,
      confirmLabel: '确定清空',
      preview: {
        ...basePreview,
        riskNotes: ['会移除相关路线和服务项选择', '可通过版本撤销恢复'],
        afterOrder: kept.map((segment) => segment.title),
      },
    }
  }
  if (command.type === 'DELETE_SEGMENT') {
    return {
      title: '确认删除节点',
      description: `将删除“${target?.title ?? '所选节点'}”。`,
      severity: 'destructive' as const,
      confirmLabel: '确定删除',
      preview: {
        ...basePreview,
        riskNotes: ['会一并移除该节点的服务项选择', '可通过版本撤销恢复'],
        afterOrder: executable.filter((segment) => segment.id !== command.segmentId).map((segment) => segment.title),
      },
    }
  }
  if (command.type === 'REORDER_SEGMENT') {
    let afterOrder: string[] | undefined
    try {
      afterOrder = reorderPlanSegmentsWithTime(
        plan.segments,
        command.segmentId,
        command.anchorSegmentId,
        command.position,
      ).filter((segment) => !segment.isTransit).map((segment) => segment.title)
    } catch {
      afterOrder = undefined
    }
    return {
      title: '确认重排计划',
      description: `将调整“${target?.title ?? '所选节点'}”的位置和时间。`,
      severity: 'normal' as const,
      confirmLabel: '确定应用',
      preview: { ...basePreview, riskNotes: ['开始和结束时间会同步重排'], afterOrder },
    }
  }
  if (command.type === 'CONFIRM_PLAN' || command.type === 'CREATE_SANDBOX_ORDER') {
    return {
      title: command.type === 'CREATE_SANDBOX_ORDER' ? '确认生成模拟确认单' : '确认当前计划',
      description: '确认后计划会进入已确认状态。',
      severity: 'finalizing' as const,
      confirmLabel: command.type === 'CREATE_SANDBOX_ORDER' ? '生成确认单' : '确认计划',
      preview: { ...basePreview, riskNotes: ['这是本地 mock，不代表真实预订或支付'] },
    }
  }
  return {
    title: '确认应用修改',
    description: `将修改${affectedSegmentTitles.length ? `“${affectedSegmentTitles.join('、')}”` : '当前计划'}。`,
    severity: 'normal' as const,
    confirmLabel: '确定应用',
    preview: basePreview,
  }
}

function affectedIds(plan: Plan, command: ConfirmablePlanCommand) {
  if (command.type === 'CLEAR_PLAN_SEGMENTS') {
    const requested = command.segmentIds?.length ? new Set(command.segmentIds) : undefined
    return plan.segments
      .filter((segment) => !segment.isTransit)
      .filter((segment) => !requested || requested.has(segment.id))
      .filter((segment) => command.includeLocked || !segment.locked)
      .map((segment) => segment.id)
  }
  const ids: string[] = []
  if ('segmentId' in command && command.segmentId) ids.push(command.segmentId)
  if ('fromSegmentId' in command) ids.push(command.fromSegmentId, command.toSegmentId)
  return [...new Set(ids)]
}
