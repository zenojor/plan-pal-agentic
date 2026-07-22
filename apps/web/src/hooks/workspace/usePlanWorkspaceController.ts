import { useEffect, useRef } from 'react'
import { useAtom, useSetAtom, useStore } from 'jotai'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AgentEvent, CandidateOption, CommandResult, MerchantOffering, PendingAction, PlanCommand, PlanVariantOption } from '@planpal/domain'
import { getPlan, isAbortError, sendPlanCommand, streamAgentResume, streamAgentRun, type PlanEnvelope } from '../../lib/api'
import type { StoredModelConfig } from '../../lib/modelConfig'
import {
  chatDraftAtom,
  chatMessagesAtom,
  networkStreamingAtom,
  pendingActionRunIdAtom,
  streamEventsAtom,
  streamingAtom,
  streamPendingActionAtom,
  typingAtom,
} from '../../state/workspaceAtoms'
import {
  attachPendingActionToLatestPlanpalMessage,
  assistantDeltaFromAgentEvent,
  buildCandidateCommand,
  buildCandidateRefreshCommand,
  buildClearRouteChoiceCommand,
  buildConfirmCommandActionCommand,
  buildDismissPendingActionCommand,
  buildPlanVariantCommand,
  buildRestorePlanVersionCommand,
  buildRouteChoiceCommand,
  buildSandboxOrderCommand,
  buildSelectServiceItemCommand,
  buildSegmentReorderCommand,
  canSendAgentChat,
  cancelAssistantStreamingMessage,
  chatMessageFromAgentEvent,
  chatMessageFromAgentFailure,
  chatMessageFromCommandError,
  chatMessageFromCommandResult,
  deriveAgentProgressItems,
  finalizeAssistantStreamingMessage,
  getCandidateRefreshExcludeIds,
  getCandidateSelectionMode,
  initialChatMessagesFromPlanEvents,
  pendingActionFromAgentEvent,
  reorderSegmentsForCommand,
  shouldClearActiveRunForAgentEvent,
  shouldOpenChatForAgentEvent,
  shouldOpenChatForCommandResult,
  shouldRefreshPlanForAgentEvent,
  setAssistantStreamingMessageText,
  stopAssistantStreamingMessage,
  type RouteEstimate,
  type WorkspaceRouteMode,
} from '../../components/workspace/workspaceModel'
import { useStreamingTypewriter } from './useStreamingTypewriter'

type MutationContext = {
  previous?: PlanEnvelope
}

type UsePlanWorkspaceControllerArgs = {
  config: StoredModelConfig
  onOpenChat: () => void
  planId: string
}

export function usePlanWorkspaceController({
  config,
  onOpenChat,
  planId,
}: UsePlanWorkspaceControllerArgs) {
  const queryClient = useQueryClient()
  const store = useStore()
  const queryKey = ['plan', planId] as const
  const setDraft = useSetAtom(chatDraftAtom)
  const setMessages = useSetAtom(chatMessagesAtom)
  const [streamEvents, setStreamEvents] = useAtom(streamEventsAtom)
  const [streamPendingAction, setStreamPendingAction] = useAtom(streamPendingActionAtom)
  const setNetworkStreaming = useSetAtom(networkStreamingAtom)
  const setTyping = useSetAtom(typingAtom)
  const setPendingActionRunId = useSetAtom(pendingActionRunIdAtom)
  const hydratedPlanIdRef = useRef<string | null>(null)
  const activeStreamRef = useRef<AbortController | null>(null)
  const finalAssistantTextRef = useRef<string | undefined>(undefined)
  const typewriter = useStreamingTypewriter({
    onDisplayedText: (displayedText) => {
      setMessages((current) => setAssistantStreamingMessageText(current, displayedText))
    },
    onSettled: (displayedText) => {
      setMessages((current) => finalizeAssistantStreamingMessage(current, displayedText))
    },
    onTypingChange: setTyping,
  })

  const planQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => getPlan(planId, signal),
  })
  const plan = planQuery.data?.plan
  const events = mergeEvents(planQuery.data?.events ?? [], streamEvents)
  const progressItems = deriveAgentProgressItems(streamEvents)
  const visiblePendingAction = plan?.pendingAction ?? streamPendingAction

  useEffect(() => {
    if (!plan || hydratedPlanIdRef.current === plan.id) return
    setMessages(initialChatMessagesFromPlanEvents(plan, events))
    setStreamEvents([])
    setStreamPendingAction(undefined)
    setPendingActionRunId(null)
    hydratedPlanIdRef.current = plan.id
  }, [events, plan])

  useEffect(() => () => {
    const activeStream = activeStreamRef.current
    activeStreamRef.current = null
    activeStream?.abort()
  }, [])

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
      onOpenChat()
      setMessages((prev) => [...prev, chatMessageFromCommandError(command, error)])
    },
    onSuccess: (result, command) => {
      if (command.type === 'CHOOSE_CANDIDATE' || command.type === 'DISMISS_PENDING_ACTION' || command.type === 'CONFIRM_COMMAND_ACTION') setPendingActionRunId(null)
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
        onOpenChat()
      }
      const chatMessage = chatMessageFromCommandResult(command, result)
      const undoVersion = previous?.plan.currentVersion
      if (chatMessage) {
        setMessages((prev) => [...prev, {
          ...chatMessage,
          undoVersion: shouldAttachUndo(command, undoVersion, result.version) ? undoVersion : chatMessage.undoVersion,
        }])
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey })
    },
  })

  async function runChat(activeSelectedSegmentId?: string) {
    const draft = store.get(chatDraftAtom)
    const isStreaming = store.get(streamingAtom)
    if (!canSendAgentChat(config, draft, isStreaming)) return
    const message = draft.trim()
    const abortController = beginStreamRequest()
    setDraft('')
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    const payload = activeSelectedSegmentId ? { message, selectedSegmentId: activeSelectedSegmentId } : { message }
    await runWithCleanup(
      () => streamAgentRun(planId, config, payload, handleStreamEvent, abortController.signal),
      (error) => {
        if (isAbortError(error)) return
        cancelTypewriterForFailure()
        onOpenChat()
        setMessages((prev) => [...prev, chatMessageFromAgentFailure('run', error)])
        setDraft((current) => current.trim() ? current : message)
      },
      () => finishStreamRequest(abortController),
    )
  }

  async function chooseCandidate(actionId: string, candidate: CandidateOption) {
    const pendingActionRunId = store.get(pendingActionRunIdAtom)
    if (pendingActionRunId && getCandidateSelectionMode(pendingActionRunId) === 'resume') {
      await resumePendingAction(pendingActionRunId, actionId, {
        candidateId: candidate.id,
      })
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
    const pendingActionRunId = store.get(pendingActionRunIdAtom)
    if (pendingActionRunId && getCandidateSelectionMode(pendingActionRunId) === 'resume') {
      await resumePendingAction(pendingActionRunId, action.id, {
        offeringId: offering.id,
        quantity,
      })
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

  async function confirmCommandAction(action: Extract<PendingAction, { kind: 'command-confirmation' }>, confirmed: boolean) {
    const pendingActionRunId = store.get(pendingActionRunIdAtom)
    if (pendingActionRunId) {
      await resumePendingAction(pendingActionRunId, action.id, { confirmed })
      return
    }
    commandMutation.mutate(confirmed
      ? buildConfirmCommandActionCommand(action.id)
      : buildDismissPendingActionCommand(action.id))
  }

  async function resumePendingAction(runId: string, actionId: string, payload: unknown) {
    const abortController = beginStreamRequest()
    await runWithCleanup(
      () => streamAgentResume(planId, config, {
        actionId,
        payload,
        runId,
      }, handleStreamEvent, abortController.signal),
      (error) => {
        if (isAbortError(error)) return
        cancelTypewriterForFailure()
        onOpenChat()
        setMessages((prev) => [...prev, chatMessageFromAgentFailure('resume', error)])
      },
      () => {
        if (finishStreamRequest(abortController)) setPendingActionRunId(null)
      },
    )
  }

  function beginStreamRequest() {
    if (activeStreamRef.current) {
      activeStreamRef.current.abort()
      typewriter.cancel()
      setMessages((current) => cancelAssistantStreamingMessage(current))
    }
    const abortController = new AbortController()
    activeStreamRef.current = abortController
    finalAssistantTextRef.current = undefined
    typewriter.start()
    setNetworkStreaming(true)
    return abortController
  }

  function finishStreamRequest(abortController: AbortController) {
    if (activeStreamRef.current !== abortController) return false
    activeStreamRef.current = null
    setNetworkStreaming(false)
    const snapshot = typewriter.getSnapshot()
    if (snapshot.networkStreaming) {
      if (typewriter.hasReceivedText()) typewriter.finish(finalAssistantTextRef.current)
      else typewriter.cancel()
    }
    return true
  }

  function stopStreaming() {
    const activeStream = activeStreamRef.current
    if (!activeStream) return
    activeStreamRef.current = null
    activeStream.abort()
    typewriter.cancel()
    finalAssistantTextRef.current = undefined
    setNetworkStreaming(false)
    setMessages((current) => stopAssistantStreamingMessage(current))
    void queryClient.invalidateQueries({ queryKey })
  }

  function restoreVersion(version: number) {
    commandMutation.mutate(buildRestorePlanVersionCommand(version))
  }

  function createSandboxOrder() {
    commandMutation.mutate(buildSandboxOrderCommand())
  }

  function changeRouteMode(route: RouteEstimate, mode: WorkspaceRouteMode) {
    commandMutation.mutate(buildRouteChoiceCommand(route, mode))
  }

  function clearRouteChoice(route: RouteEstimate) {
    commandMutation.mutate(buildClearRouteChoiceCommand(route))
  }

  function reorderSegment(segmentId: string, targetSegmentId: string | null) {
    commandMutation.mutate(
      buildSegmentReorderCommand(
        segmentId,
        targetSegmentId,
        targetSegmentId ? 'BEFORE' : 'END',
      ),
    )
  }

  function handleStreamEvent(event: AgentEvent) {
    if (event.type !== 'agent.message.delta') {
      setStreamEvents((prev) => appendUniqueEvent(prev, event))
    }
    const streamedAction = pendingActionFromAgentEvent(event)
    if (streamedAction) {
      setStreamPendingAction(streamedAction)
      setMessages((prev) => attachPendingActionToLatestPlanpalMessage(prev, streamedAction))
    }
    if (shouldOpenChatForAgentEvent(event)) {
      onOpenChat()
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
      typewriter.push(delta)
      return
    }
    const chatMessage = chatMessageFromAgentEvent(event)
    if (chatMessage) {
      if (event.type === 'agent.finished' && typewriter.hasReceivedText()) {
        finalAssistantTextRef.current = chatMessage.content
        return
      }
      if (event.type === 'agent.error') cancelTypewriterForFailure()
      setMessages((prev) => [...prev, chatMessage])
    }
    if (event.type === 'run.status' && readRunStatus(event) === 'completed' && typewriter.hasReceivedText()) {
      typewriter.finish(finalAssistantTextRef.current)
    }
  }

  function cancelTypewriterForFailure() {
    const hadReceivedText = typewriter.cancel()
    finalAssistantTextRef.current = undefined
    if (hadReceivedText) {
      setMessages((current) => cancelAssistantStreamingMessage(current))
    }
  }

  return {
    changeRouteMode,
    chooseCandidate,
    choosePlanVariant,
    chooseServiceOffering,
    clearRouteChoice,
    commandBusy: commandMutation.isPending,
    createSandboxOrder,
    dismissPendingAction,
    events,
    plan,
    planQuery,
    progressItems,
    refreshCandidates,
    reorderSegment,
    restoreVersion,
    runChat,
    runCommand: commandMutation.mutate,
    stopStreaming,
    visiblePendingAction,
    confirmCommandAction,
  }
}

function readRunStatus(event: AgentEvent) {
  if (!event.payload || typeof event.payload !== 'object' || !('status' in event.payload)) return undefined
  const status = (event.payload as { status?: unknown }).status
  return typeof status === 'string' ? status : undefined
}

async function runWithCleanup(
  operation: () => Promise<void>,
  onError: (error: unknown) => void,
  onFinally: () => void,
) {
  try {
    await operation()
  } catch (error) {
    onError(error)
  } finally {
    onFinally()
  }
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

function shouldAttachUndo(command: PlanCommand, undoVersion: number | undefined, currentVersion: number) {
  if (!undoVersion || undoVersion >= currentVersion) return false
  return ![
    'REQUEST_COMMAND_CONFIRMATION',
    'DISMISS_PENDING_ACTION',
    'REFRESH_CANDIDATES',
    'REFRESH_SERVICE_ITEMS',
    'RESTORE_PLAN_VERSION',
  ].includes(command.type)
}
