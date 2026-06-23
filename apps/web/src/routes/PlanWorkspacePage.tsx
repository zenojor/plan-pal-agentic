import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AgentEvent, CandidateOption, CommandResult, MerchantOffering, PendingAction, PlanCommand, PlanVariantOption } from '@planpal/domain'
import { AgentChatColumn } from '../components/workspace/AgentChatColumn'
import { ConfirmPlanModal } from '../components/workspace/ConfirmPlanModal'
import { DetailsColumn } from '../components/workspace/DetailsColumn'
import { MapColumn } from '../components/workspace/MapColumn'
import { MerchantColumn } from '../components/workspace/MerchantColumn'
import { PuzzleColumn } from '../components/workspace/PuzzleColumn'
import { TraceColumn } from '../components/workspace/TraceColumn'
import { WorkspaceShell } from '../components/workspace/WorkspaceShell'
import {
  addWorkspaceColumn,
  appendAssistantDeltaMessage,
  attachPendingActionToLatestPlanpalMessage,
  assistantDeltaFromAgentEvent,
  buildCandidateCommand,
  buildCandidateRefreshCommand,
  buildClearRouteChoiceCommand,
  buildDismissPendingActionCommand,
  buildPlanVariantCommand,
  buildRouteChoiceCommand,
  buildRouteEstimates,
  buildSandboxOrderCommand,
  buildSelectServiceItemCommand,
  buildSegmentReorderCommand,
  canSendAgentChat,
  chatMessageFromAgentEvent,
  chatMessageFromAgentFailure,
  chatMessageFromCommandError,
  chatMessageFromCommandResult,
  deriveAgentProgressItems,
  derivePlanExecutionBrief,
  derivePlanSegmentDisplays,
  deriveSelectedRouteModes,
  getClosedWorkspaceColumns,
  getCandidateSelectionMode,
  getCandidateRefreshExcludeIds,
  finalizeAssistantStreamingMessage,
  initialChatMessagesFromPlanEvents,
  isMobileWorkspaceColumn,
  moveWorkspaceColumn,
  openMerchantWorkspaceColumn,
  pendingActionFromAgentEvent,
  reconcileWorkspaceSelection,
  removeWorkspaceColumn,
  reorderSegmentsForCommand,
  shouldClearActiveRunForAgentEvent,
  shouldOpenChatForAgentEvent,
  shouldOpenChatForCommandResult,
  shouldRefreshPlanForAgentEvent,
  type ChatMessage,
  type MobileWorkspaceColumnId,
  type RouteEstimate,
  type WorkspaceRouteMode,
  type WorkspaceColumnId,
} from '../components/workspace/workspaceModel'
import { getPlan, sendPlanCommand, streamAgentResume, streamAgentRun, type PlanEnvelope } from '../lib/api'
import { useStoredModelConfig } from '../lib/useStoredModelConfig'
import { loadWorkspaceLayout, saveWorkspaceLayout } from '../lib/workspaceLayoutStorage'

const workspaceLoadingClassName = 'grid min-h-[100svh] place-items-center bg-animal-bg bg-animal-grid p-6 text-center text-[1rem] font-[900] text-animal-text'

type MutationContext = {
  previous?: PlanEnvelope
}

export function PlanWorkspacePage() {
  const { planId } = useParams({ from: '/plans/$planId' })
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['plan', planId] as const, [planId])
  const config = useStoredModelConfig()
  const initialLayoutRef = useRef<ReturnType<typeof loadWorkspaceLayout> | null>(null)
  if (!initialLayoutRef.current) initialLayoutRef.current = loadWorkspaceLayout(planId)
  const initialLayout = initialLayoutRef.current
  const layoutPlanIdRef = useRef(planId)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streamEvents, setStreamEvents] = useState<AgentEvent[]>([])
  const [streamPendingAction, setStreamPendingAction] = useState<PendingAction | undefined>()
  const [isStreaming, setIsStreaming] = useState(false)
  const [pendingActionRunId, setPendingActionRunId] = useState<string | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | undefined>()
  const [columns, setColumns] = useState<WorkspaceColumnId[]>(() => initialLayout.columns)
  const [activeMobileColumn, setActiveMobileColumn] = useState<MobileWorkspaceColumnId>(() => initialLayout.activeMobileColumn)
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [draggingColumn, setDraggingColumn] = useState<WorkspaceColumnId | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<WorkspaceColumnId | null>(null)
  const [draggingSegmentId, setDraggingSegmentId] = useState<string | null>(null)
  const [dragOverSegmentId, setDragOverSegmentId] = useState<string | null>(null)
  const columnMenuRef = useRef<HTMLDivElement>(null)
  const hydratedPlanIdRef = useRef<string | null>(null)

  const planQuery = useQuery({
    queryKey,
    queryFn: () => getPlan(planId),
  })

  useEffect(() => {
    if (layoutPlanIdRef.current === planId) return
    const next = loadWorkspaceLayout(planId)
    setColumns(next.columns)
    setActiveMobileColumn(next.activeMobileColumn)
    setIsColumnMenuOpen(false)
    setDraggingColumn(null)
    setDragOverColumn(null)
    layoutPlanIdRef.current = planId
  }, [planId])

  useEffect(() => {
    if (layoutPlanIdRef.current !== planId) return
    saveWorkspaceLayout(planId, {
      activeMobileColumn,
      columns,
    })
  }, [activeMobileColumn, columns, planId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!isColumnMenuOpen) return
      if (columnMenuRef.current?.contains(event.target as Node)) return
      setIsColumnMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isColumnMenuOpen])

  const plan = planQuery.data?.plan
  const events = useMemo(
    () => mergeEvents(planQuery.data?.events ?? [], streamEvents),
    [planQuery.data?.events, streamEvents],
  )
  const segmentDisplays = useMemo(
    () => derivePlanSegmentDisplays(plan?.segments ?? [], plan?.serviceSelections ?? []),
    [plan?.segments, plan?.serviceSelections],
  )
  const progressItems = useMemo(
    () => deriveAgentProgressItems(streamEvents),
    [streamEvents],
  )
  const closedColumns = useMemo(() => getClosedWorkspaceColumns(columns), [columns])
  const selectedRouteModes = useMemo(() => deriveSelectedRouteModes(plan), [plan])
  const routeEstimates = useMemo(() => buildRouteEstimates(segmentDisplays), [segmentDisplays])
  const activeSelectedSegmentId = useMemo(() => {
    if (!plan) return undefined
    return reconcileWorkspaceSelection(plan.segments, selectedSegmentId).selectedSegmentId
  }, [plan, selectedSegmentId])

  useEffect(() => {
    if (!plan || hydratedPlanIdRef.current === plan.id) return
    setMessages(initialChatMessagesFromPlanEvents(plan, events))
    setStreamEvents([])
    setStreamPendingAction(undefined)
    setPendingActionRunId(null)
    setSelectedSegmentId(undefined)
    hydratedPlanIdRef.current = plan.id
  }, [events, plan])

  useEffect(() => {
    if (!plan) return
    const next = reconcileWorkspaceSelection(plan.segments, selectedSegmentId)
    if (next.selectedSegmentId !== selectedSegmentId) setSelectedSegmentId(next.selectedSegmentId)
  }, [plan, selectedSegmentId])
  const commandMutation = useMutation<CommandResult, Error, PlanCommand, MutationContext>({
    mutationFn: (command) => sendPlanCommand(planId, command),
    onMutate: async (command) => {
      if (command.type !== 'REORDER_SEGMENT') return {}
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<PlanEnvelope>(queryKey)
      if (previous) {
        queryClient.setQueryData<PlanEnvelope>(queryKey, {
          ...previous,
          plan: {
            ...previous.plan,
            segments: reorderSegmentsForCommand(previous.plan.segments, command),
          },
        })
      }
      return { previous }
    },
    onError: (error, command, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      setColumns((current) => addWorkspaceColumn(current, 'chat'))
      setMessages((prev) => [...prev, chatMessageFromCommandError(command, error)])
    },
    onSuccess: (result, command) => {
      if (command.type === 'CHOOSE_CANDIDATE' || command.type === 'DISMISS_PENDING_ACTION') setPendingActionRunId(null)
      if (!result.plan.pendingAction) {
        setStreamPendingAction(undefined)
        setPendingActionRunId(null)
      }
      const previous = queryClient.getQueryData<PlanEnvelope>(queryKey)
      queryClient.setQueryData<PlanEnvelope>(queryKey, {
        plan: result.plan,
        events: mergeEvents(previous?.events ?? [], result.events),
        versions: previous?.versions ?? [],
      })
      if (shouldOpenChatForCommandResult(command, result)) {
        setColumns((current) => addWorkspaceColumn(current, 'chat'))
      }
      const chatMessage = chatMessageFromCommandResult(command, result)
      if (chatMessage) setMessages((prev) => [...prev, chatMessage])
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey })
    },
  })

  async function runChat() {
    if (!canSendAgentChat(config, draft, isStreaming)) return
    const message = draft.trim()
    setDraft('')
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setIsStreaming(true)
    try {
      const payload = activeSelectedSegmentId ? { message, selectedSegmentId: activeSelectedSegmentId } : { message }
      await streamAgentRun(planId, config!, payload, handleStreamEvent)
    } catch (error) {
      setColumns((current) => addWorkspaceColumn(current, 'chat'))
      setMessages((prev) => [...prev, chatMessageFromAgentFailure('run', error)])
    } finally {
      setIsStreaming(false)
    }
  }

  async function chooseCandidate(actionId: string, candidate: CandidateOption) {
    if (getCandidateSelectionMode(pendingActionRunId) === 'resume') {
      setIsStreaming(true)
      try {
        await streamAgentResume(planId, {
          runId: pendingActionRunId!,
          actionId,
          payload: { candidateId: candidate.id },
        }, handleStreamEvent)
      } catch (error) {
        setColumns((current) => addWorkspaceColumn(current, 'chat'))
        setMessages((prev) => [...prev, chatMessageFromAgentFailure('resume', error)])
      } finally {
        setPendingActionRunId(null)
        setIsStreaming(false)
      }
      return
    }
    commandMutation.mutate(buildCandidateCommand(actionId, candidate))
  }

  function refreshCandidates(action: Extract<PendingAction, { kind: 'candidate-selection' }>, searchQuery?: string) {
    commandMutation.mutate(buildCandidateRefreshCommand({
      actionId: action.id,
      mode: action.mode,
      targetSegmentId: action.targetSegmentId,
      afterSegmentId: action.afterSegmentId,
      searchQuery,
      excludeCandidateIds: getCandidateRefreshExcludeIds(action, searchQuery),
    }))
  }

  function choosePlanVariant(actionId: string, variant: PlanVariantOption) {
    commandMutation.mutate(buildPlanVariantCommand(actionId, variant))
  }

  async function chooseServiceOffering(
    action: Extract<PendingAction, { kind: 'service-item-selection' }>,
    offering: MerchantOffering,
    quantity: number,
  ) {
    if (getCandidateSelectionMode(pendingActionRunId) === 'resume') {
      setIsStreaming(true)
      try {
        await streamAgentResume(planId, {
          runId: pendingActionRunId!,
          actionId: action.id,
          payload: { offeringId: offering.id, quantity },
        }, handleStreamEvent)
      } catch (error) {
        setColumns((current) => addWorkspaceColumn(current, 'chat'))
        setMessages((prev) => [...prev, chatMessageFromAgentFailure('resume', error)])
      } finally {
        setPendingActionRunId(null)
        setIsStreaming(false)
      }
      return
    }
    commandMutation.mutate(buildSelectServiceItemCommand({
      segmentId: action.segmentId,
      merchantId: action.merchantId,
      offeringId: offering.id,
      quantity,
    }))
  }

  function dismissPendingAction(actionId: string) {
    commandMutation.mutate(buildDismissPendingActionCommand(actionId))
  }

  function handleStreamEvent(event: AgentEvent) {
    setStreamEvents((prev) => appendUniqueEvent(prev, event))
    const streamedAction = pendingActionFromAgentEvent(event)
    if (streamedAction) {
      setStreamPendingAction(streamedAction)
      setMessages((prev) => attachPendingActionToLatestPlanpalMessage(prev, streamedAction))
    }
    if (shouldOpenChatForAgentEvent(event)) {
      setColumns((current) => addWorkspaceColumn(current, 'chat'))
    }
    if (event.type === 'action.required') {
      setPendingActionRunId(event.runId)
    }
    if (shouldClearActiveRunForAgentEvent(event)) {
      setPendingActionRunId(null)
      setStreamPendingAction(undefined)
    }
    if (shouldRefreshPlanForAgentEvent(event)) {
      void queryClient.invalidateQueries({ queryKey })
    }
    const delta = assistantDeltaFromAgentEvent(event)
    if (delta) {
      setMessages((prev) => appendAssistantDeltaMessage(prev, delta))
      return
    }
    const chatMessage = chatMessageFromAgentEvent(event)
    if (chatMessage) {
      setMessages((prev) => event.type === 'agent.finished'
        ? finalizeAssistantStreamingMessage(prev, chatMessage.content)
        : [...prev, chatMessage])
    }
  }

  function handleColumnDrop(targetColumn: WorkspaceColumnId) {
    setColumns((current) => moveWorkspaceColumn(current, draggingColumn, targetColumn))
    setDraggingColumn(null)
    setDragOverColumn(null)
  }

  function handleAddColumn(column: WorkspaceColumnId) {
    setColumns((current) => addWorkspaceColumn(current, column))
    if (isMobileWorkspaceColumn(column)) setActiveMobileColumn(column)
    setIsColumnMenuOpen(false)
  }

  function handleRemoveColumn(column: WorkspaceColumnId) {
    setColumns((current) => removeWorkspaceColumn(current, column))
    if (column === activeMobileColumn) setActiveMobileColumn('puzzle')
  }

  function selectSegment(segmentId: string) {
    setSelectedSegmentId(segmentId)
  }

  function togglePuzzleSegmentSelection(segmentId: string) {
    if (activeSelectedSegmentId === segmentId || selectedSegmentId === segmentId) {
      setSelectedSegmentId(undefined)
      return
    }
    selectSegment(segmentId)
  }

  function handleChatContextChange(segmentId?: string) {
    if (!segmentId) {
      setSelectedSegmentId(undefined)
      return
    }
    selectSegment(segmentId)
  }

  function handleOpenMerchant(place: string) {
    const segment = plan?.segments.find((item) => !item.isTransit && item.place === place)
    if (segment) {
      setSelectedSegmentId(segment.id)
    }
    setColumns((current) => openMerchantWorkspaceColumn(current))
    setActiveMobileColumn('merchant')
  }

  function handleMobileColumnChange(column: MobileWorkspaceColumnId) {
    setColumns((current) => addWorkspaceColumn(current, column))
    setActiveMobileColumn(column)
  }

  function handleRouteModeChange(route: RouteEstimate, mode: WorkspaceRouteMode) {
    commandMutation.mutate(buildRouteChoiceCommand(route, mode))
  }

  function handleRouteChoiceClear(route: RouteEstimate) {
    commandMutation.mutate(buildClearRouteChoiceCommand(route))
  }

  function handleSegmentDrop(targetSegmentId: string | null) {
    if (!draggingSegmentId) return
    if (targetSegmentId === draggingSegmentId) {
      setDraggingSegmentId(null)
      setDragOverSegmentId(null)
      return
    }
    commandMutation.mutate(
      buildSegmentReorderCommand(
        draggingSegmentId,
        targetSegmentId,
        targetSegmentId ? 'BEFORE' : 'END',
      ),
    )
    setDraggingSegmentId(null)
    setDragOverSegmentId(null)
  }

  if (planQuery.isLoading) return <main className={workspaceLoadingClassName}>正在加载计划...</main>
  if (planQuery.error) return <main className={workspaceLoadingClassName}>加载失败：{planQuery.error.message}</main>
  if (!plan) return <main className={workspaceLoadingClassName}>计划不存在</main>

  const executionBrief = derivePlanExecutionBrief({ ...plan, pendingAction: plan.pendingAction ?? streamPendingAction })
  const confirmDisabled = !executionBrief.canConfirm || commandMutation.isPending
  const confirmLabel = plan.status === 'confirmed'
    ? '已确认'
    : executionBrief.confirmBlockedReason
      ? '先处理检查'
      : '生成模拟确认单'
  const visiblePendingAction = plan.pendingAction ?? streamPendingAction

  return (
    <WorkspaceShell
      activeMobileColumn={activeMobileColumn}
      closedColumns={closedColumns}
      commandBusy={commandMutation.isPending}
      confirmDisabled={confirmDisabled}
      confirmLabel={confirmLabel}
      columns={columns}
      executionBrief={executionBrief}
      columnMenuRef={columnMenuRef}
      dragOverColumn={dragOverColumn}
      draggingColumn={draggingColumn}
      isColumnMenuOpen={isColumnMenuOpen}
      notice={!config ? (
        <>
          还没有模型配置。拼图命令仍可使用，但聊天 Agent 需要先在 <Link to="/settings/model">模型设置</Link> 里填写 API Key。
        </>
      ) : undefined}
      planStatus={plan.status}
      planSummary={plan.summary}
      planTitle={plan.title}
      planVersion={plan.currentVersion}
      onAddColumn={handleAddColumn}
      onColumnDrop={handleColumnDrop}
      onConfirm={() => setConfirmOpen(true)}
      onDragEnd={() => {
        setDraggingColumn(null)
        setDragOverColumn(null)
      }}
      onDragOverColumn={setDragOverColumn}
      onDragStart={setDraggingColumn}
      onMobileColumnChange={handleMobileColumnChange}
      onRemoveColumn={handleRemoveColumn}
      onToggleColumnMenu={() => setIsColumnMenuOpen((open) => !open)}
      childrenByColumn={{
        chat: (
          <AgentChatColumn
            canSend={canSendAgentChat(config, draft, isStreaming)}
            commandBusy={commandMutation.isPending}
            config={config}
            draft={draft}
            isStreaming={isStreaming}
            messages={messages}
            pendingAction={visiblePendingAction}
            plan={plan}
            progressItems={progressItems}
            selectedSegmentId={activeSelectedSegmentId}
            variantSelection={plan.variantSelection}
            onCandidateSelect={chooseCandidate}
            onCandidateRefresh={refreshCandidates}
            onChatContextChange={handleChatContextChange}
            onDraftChange={setDraft}
            onPendingActionDismiss={dismissPendingAction}
            onSend={() => void runChat()}
            onServiceOfferingSelect={(action, offering, quantity) => void chooseServiceOffering(action, offering, quantity)}
            onVariantSelect={choosePlanVariant}
          />
        ),
        puzzle: (
          <PuzzleColumn
            commandBusy={commandMutation.isPending}
            dragOverSegmentId={dragOverSegmentId}
            draggingSegmentId={draggingSegmentId}
            routeEstimates={routeEstimates}
            selectedRouteModes={selectedRouteModes}
            selectedSegmentId={activeSelectedSegmentId}
            segments={plan.segments}
            serviceSelections={plan.serviceSelections}
            onCommand={(command) => commandMutation.mutate(command)}
            onDragEnd={() => {
              setDraggingSegmentId(null)
              setDragOverSegmentId(null)
            }}
            onDragStart={setDraggingSegmentId}
            onDropSegment={handleSegmentDrop}
            onOpenMerchant={handleOpenMerchant}
            onRouteChoiceClear={handleRouteChoiceClear}
            onRouteModeChange={handleRouteModeChange}
            onSelectSegment={togglePuzzleSegmentSelection}
            onSetDragOverSegment={setDragOverSegmentId}
          />
        ),
        merchant: (
          <MerchantColumn
            commandBusy={commandMutation.isPending}
            displays={segmentDisplays}
            plan={plan}
            selectedPlace={null}
            selectedSegmentId={activeSelectedSegmentId}
            onCommand={(command) => commandMutation.mutate(command)}
            onSelectSegment={selectSegment}
          />
        ),
        details: (
          <DetailsColumn
            displays={segmentDisplays}
            selectedSegmentId={activeSelectedSegmentId}
            onSelectSegment={selectSegment}
          />
        ),
        map: (
          <MapColumn
            commandBusy={commandMutation.isPending}
            displays={segmentDisplays}
            selectedRouteModes={selectedRouteModes}
            onRouteChoiceClear={handleRouteChoiceClear}
            onRouteModeChange={handleRouteModeChange}
            onSelectSegment={selectSegment}
          />
        ),
        trace: (
          <TraceColumn
            commandBusy={commandMutation.isPending}
            confirmDisabled={confirmDisabled}
            confirmLabel={confirmLabel}
            events={events}
            executionBrief={executionBrief}
            plan={plan}
            versions={planQuery.data?.versions ?? []}
            onConfirm={() => setConfirmOpen(true)}
          />
        ),
      }}
    >
      <ConfirmPlanModal
        busy={commandMutation.isPending}
        executionBrief={executionBrief}
        open={confirmOpen}
        plan={plan}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          commandMutation.mutate(buildSandboxOrderCommand())
          setConfirmOpen(false)
        }}
      />
    </WorkspaceShell>
  )
}

function appendUniqueEvent(events: AgentEvent[], event: AgentEvent) {
  if (events.some((item) => item.id === event.id)) return events
  return [...events, event]
}

function mergeEvents(...groups: AgentEvent[][]) {
  const byId = new Map<string, AgentEvent>()
  for (const group of groups) {
    for (const event of group) {
      byId.set(eventMergeKey(event), event)
    }
  }
  return [...byId.values()].sort((left, right) => {
    const timeDiff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    return timeDiff || left.sequence - right.sequence
  })
}

function eventMergeKey(event: AgentEvent) {
  if (event.type === 'agent.model.error') {
    return `${event.runId}:${event.type}:${event.message}`
  }
  return event.id
}








