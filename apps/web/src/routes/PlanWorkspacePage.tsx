import { useMemo } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { AgentChatColumn } from '../components/workspace/AgentChatColumn'
import { ConfirmPlanModal } from '../components/workspace/ConfirmPlanModal'
import { DetailsColumn } from '../components/workspace/DetailsColumn'
import { MapColumn } from '../components/workspace/MapColumn'
import { MerchantColumn } from '../components/workspace/MerchantColumn'
import { PuzzleColumn } from '../components/workspace/PuzzleColumn'
import { TraceColumn } from '../components/workspace/TraceColumn'
import { WorkspaceShell } from '../components/workspace/WorkspaceShell'
import { usePlanWorkspaceController } from '../hooks/workspace/usePlanWorkspaceController'
import { useWorkspaceInteraction } from '../hooks/workspace/useWorkspaceInteraction'
import { useWorkspaceLayout } from '../hooks/workspace/useWorkspaceLayout'
import { useWorkspaceSelection } from '../hooks/workspace/useWorkspaceSelection'
import {
  buildRouteEstimates,
  derivePlanExecutionBrief,
  derivePlanSegmentDisplays,
  deriveSelectedRouteModes,
} from '../components/workspace/workspaceModel'
import { useStoredModelConfig } from '../lib/useStoredModelConfig'
import type { StoredModelConfig } from '../lib/modelConfig'
import { WorkspaceStateProvider } from '../state/WorkspaceStateProvider'

const workspaceLoadingClassName = 'grid min-h-[100svh] place-items-center bg-animal-bg bg-animal-grid p-6 text-center text-[1rem] font-[900] text-animal-text'

export function PlanWorkspacePage() {
  const { planId } = useParams({ from: '/plans/$planId' })
  const config = useStoredModelConfig()

  return (
    <WorkspaceStateProvider key={planId} planId={planId}>
      <PlanWorkspaceContent config={config} planId={planId} />
    </WorkspaceStateProvider>
  )
}

type PlanWorkspaceContentProps = {
  config: StoredModelConfig | null
  planId: string
}

function PlanWorkspaceContent({ config, planId }: PlanWorkspaceContentProps) {
  const layout = useWorkspaceLayout(planId)
  const interaction = useWorkspaceInteraction()
  const workspace = usePlanWorkspaceController({
    config,
    onOpenChat: () => layout.openColumn('chat'),
    planId,
  })
  const plan = workspace.plan
  const selection = useWorkspaceSelection(plan)

  const segmentDisplays = useMemo(
    () => derivePlanSegmentDisplays(plan?.segments ?? [], plan?.serviceSelections ?? []),
    [plan?.segments, plan?.serviceSelections],
  )
  const selectedRouteModes = useMemo(() => deriveSelectedRouteModes(plan), [plan])
  const routeEstimates = useMemo(() => buildRouteEstimates(segmentDisplays), [segmentDisplays])
  const executionBrief = useMemo(() => {
    if (!plan) return undefined
    const pendingAction = plan.pendingAction ?? workspace.visiblePendingAction
    return derivePlanExecutionBrief(
      pendingAction === plan.pendingAction ? plan : { ...plan, pendingAction },
    )
  }, [plan, workspace.visiblePendingAction])

  if (workspace.planQuery.isLoading) return <main className={workspaceLoadingClassName}>正在加载计划...</main>
  if (workspace.planQuery.error) return <main className={workspaceLoadingClassName}>加载失败：{workspace.planQuery.error.message}</main>
  if (!plan || !executionBrief) return <main className={workspaceLoadingClassName}>计划不存在</main>

  const loadedPlan = plan
  const confirmDisabled = !executionBrief.canConfirm || workspace.commandBusy
  const confirmLabel = loadedPlan.status === 'confirmed'
    ? '已确认'
    : executionBrief.confirmBlockedReason
      ? '先处理检查'
      : '生成模拟确认单'

  function handleOpenMerchant(place: string) {
    const segment = loadedPlan.segments.find((item) => !item.isTransit && item.place === place)
    if (segment) {
      selection.selectSegment(segment.id)
    }
    layout.openMerchantColumn()
  }

  function handleSegmentDrop(targetSegmentId: string | null) {
    if (!interaction.draggingSegmentId) return
    if (targetSegmentId === interaction.draggingSegmentId) {
      interaction.resetSegmentDrag()
      return
    }
    workspace.reorderSegment(interaction.draggingSegmentId, targetSegmentId)
    interaction.resetSegmentDrag()
  }

  return (
    <WorkspaceShell
      activeMobileColumn={layout.activeMobileColumn}
      closedColumns={layout.closedColumns}
      commandBusy={workspace.commandBusy}
      confirmDisabled={confirmDisabled}
      confirmLabel={confirmLabel}
      columns={layout.columns}
      executionBrief={executionBrief}
      columnMenuRef={layout.columnMenuRef}
      dragOverColumn={layout.dragOverColumn}
      draggingColumn={layout.draggingColumn}
      isColumnMenuOpen={layout.isColumnMenuOpen}
      notice={!config ? (
        <>
          还没有模型配置。拼图命令仍可使用，但聊天 Agent 需要先在 <Link to="/settings/model">模型设置</Link> 里填写 API Key。
        </>
      ) : undefined}
      planStatus={plan.status}
      planSummary={plan.summary}
      planTitle={plan.title}
      planVersion={plan.currentVersion}
      onAddColumn={layout.addColumn}
      onColumnDrop={layout.dropColumn}
      onConfirm={interaction.openConfirm}
      onDragEnd={layout.resetColumnDrag}
      onDragOverColumn={layout.setDragOverColumn}
      onDragStart={layout.setDraggingColumn}
      onMobileColumnChange={layout.changeMobileColumn}
      onRemoveColumn={layout.removeColumn}
      onToggleColumnMenu={layout.toggleColumnMenu}
      childrenByColumn={{
        chat: (
          <AgentChatColumn
            commandBusy={workspace.commandBusy}
            config={config}
            pendingAction={workspace.visiblePendingAction}
            plan={plan}
            progressItems={workspace.progressItems}
            selectedSegmentId={selection.activeSelectedSegmentId}
            variantSelection={plan.variantSelection}
            onCandidateSelect={workspace.chooseCandidate}
            onCandidateRefresh={workspace.refreshCandidates}
            onChatContextChange={selection.changeChatContext}
            onCommandConfirm={(action, confirmed) => void workspace.confirmCommandAction(action, confirmed)}
            onPendingActionDismiss={workspace.dismissPendingAction}
            onSend={() => void workspace.runChat(selection.activeSelectedSegmentId)}
            onServiceOfferingSelect={(action, offering, quantity) => void workspace.chooseServiceOffering(action, offering, quantity)}
            onStop={workspace.stopStreaming}
            onUndo={workspace.restoreVersion}
            onVariantSelect={workspace.choosePlanVariant}
          />
        ),
        puzzle: (
          <PuzzleColumn
            commandBusy={workspace.commandBusy}
            dragOverSegmentId={interaction.dragOverSegmentId}
            draggingSegmentId={interaction.draggingSegmentId}
            routeEstimates={routeEstimates}
            selectedRouteModes={selectedRouteModes}
            selectedSegmentId={selection.activeSelectedSegmentId}
            segments={plan.segments}
            serviceSelections={plan.serviceSelections}
            onCommand={workspace.runCommand}
            onDragEnd={interaction.resetSegmentDrag}
            onDragStart={interaction.setDraggingSegmentId}
            onDropSegment={handleSegmentDrop}
            onOpenMerchant={handleOpenMerchant}
            onRouteChoiceClear={workspace.clearRouteChoice}
            onRouteModeChange={workspace.changeRouteMode}
            onSelectSegment={selection.toggleSegmentSelection}
            onSetDragOverSegment={interaction.setDragOverSegmentId}
          />
        ),
        merchant: (
          <MerchantColumn
            commandBusy={workspace.commandBusy}
            displays={segmentDisplays}
            plan={plan}
            selectedPlace={null}
            selectedSegmentId={selection.activeSelectedSegmentId}
            onCommand={workspace.runCommand}
            onSelectSegment={selection.selectSegment}
          />
        ),
        details: (
          <DetailsColumn
            displays={segmentDisplays}
            selectedSegmentId={selection.activeSelectedSegmentId}
            onSelectSegment={selection.selectSegment}
          />
        ),
        map: (
          <MapColumn
            commandBusy={workspace.commandBusy}
            displays={segmentDisplays}
            routeEstimates={routeEstimates}
            selectedRouteModes={selectedRouteModes}
            onRouteChoiceClear={workspace.clearRouteChoice}
            onRouteModeChange={workspace.changeRouteMode}
            onSelectSegment={selection.selectSegment}
          />
        ),
        trace: (
          <TraceColumn
            commandBusy={workspace.commandBusy}
            confirmDisabled={confirmDisabled}
            confirmLabel={confirmLabel}
            events={workspace.events}
            executionBrief={executionBrief}
            plan={plan}
            versions={workspace.planQuery.data?.versions ?? []}
            onConfirm={interaction.openConfirm}
          />
        ),
      }}
    >
      <ConfirmPlanModal
        busy={workspace.commandBusy}
        executionBrief={executionBrief}
        open={interaction.confirmOpen}
        plan={plan}
        onClose={interaction.closeConfirm}
        onConfirm={() => {
          workspace.createSandboxOrder()
          interaction.closeConfirm()
        }}
      />
    </WorkspaceShell>
  )
}
