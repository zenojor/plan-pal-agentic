export type OwnerMode = 'client-byok'

export type PlanStatus = 'draft' | 'ready' | 'pending_confirmation' | 'confirmed' | 'failed'

export type SegmentPhase = 'activity' | 'dining' | 'drinks' | 'leisure' | 'transit'

export type CommandSource = 'puzzle' | 'agent' | 'action-card' | 'system'

export type RouteMode = 'walk' | 'transit' | 'taxi'

export type ReorderPosition = 'BEFORE' | 'AFTER' | 'START' | 'END'

export type ToolEffect = 'read-only' | 'external-write'

export type AgentEventType =
  | 'agent.started'
  | 'agent.model.started'
  | 'agent.model.finished'
  | 'agent.model.error'
  | 'agent.message.delta'
  | 'tool.called'
  | 'tool.result'
  | 'plan.patch.proposed'
  | 'plan.updated'
  | 'action.required'
  | 'agent.finished'
  | 'agent.error'

export type PendingAction =
  | {
      id: string
      kind: 'candidate-selection'
      mode: 'replace' | 'add-after'
      targetSegmentId?: string
      afterSegmentId?: string | null
      title: string
      description: string
      searchQuery?: string
      candidates: CandidateOption[]
      excludeCandidateIds?: string[]
    }
  | {
      id: string
      kind: 'plan-variant-selection'
      title: string
      description: string
      variants: PlanVariantOption[]
    }
  | {
      id: string
      kind: 'clarification'
      title: string
      description: string
      requiredFields: string[]
    }

export type CandidateOption = {
  id: string
  label: string
  description: string
  segment: Partial<PlanSegment>
  score: number
  reasons: string[]
}

export type PlanVariantOption = {
  id: string
  title: string
  summary: string
  tags: string[]
  segments: PlanSegment[]
  score: number
  reasons: string[]
}

export type PlanIntent = {
  prompt: string
  headcount: number
  startTime: string
  endTime: string
  locationScope: string
  preferences: string[]
}

export type PlanSegment = {
  id: string
  phase: SegmentPhase
  title: string
  place: string
  startTime: string
  endTime: string
  durationMinutes: number
  status: string
  reason: string
  budget: string
  notes?: string
  poiId?: string
  locked?: boolean
  isTransit?: boolean
  transportMode?: RouteMode
  lnglat?: [number, number]
}

export type PlanRouteChoice = {
  id: string
  fromSegmentId: string
  toSegmentId: string
  mode: RouteMode
  updatedAt: string
}

export type PlanVariantSelection = {
  actionId: string
  title: string
  description: string
  variants: PlanVariantOption[]
  selectedVariantId?: string
  selectedAt?: string
}

export type Plan = {
  id: string
  ownerMode: OwnerMode
  title: string
  status: PlanStatus
  currentVersion: number
  intent: PlanIntent
  segments: PlanSegment[]
  routeChoices?: PlanRouteChoice[]
  summary: string
  pendingAction?: PendingAction
  variantSelection?: PlanVariantSelection
  createdAt: string
  updatedAt: string
}

export type PlanPatch = {
  operation: PlanCommand['type']
  targetSegmentId?: string
  summary: string
  beforeVersion: number
  afterVersion?: number
}

export type AgentEvent = {
  id: string
  runId: string
  planId: string
  type: AgentEventType
  sequence: number
  message: string
  payload?: unknown
  createdAt: string
}

export type ToolCallRecord = {
  id: string
  runId: string
  toolName: string
  effect: ToolEffect
  argsJson: string
  resultJson?: string
  status: 'success' | 'failed' | 'blocked'
  durationMs: number
}

export type AgentRun = {
  id: string
  planId: string
  status: 'running' | 'waiting_for_user' | 'completed' | 'failed'
  inputMessage: string
  checkpointId?: string
  createdAt: string
  finishedAt?: string
}

export type PlanCommand =
  | {
      type: 'REORDER_SEGMENT'
      source: CommandSource
      segmentId: string
      anchorSegmentId?: string | null
      position: ReorderPosition
    }
  | {
      type: 'DELETE_SEGMENT'
      source: CommandSource
      segmentId: string
    }
  | {
      type: 'REPLACE_SEGMENT'
      source: CommandSource
      segmentId: string
      replacement?: Partial<PlanSegment>
      searchQuery?: string
    }
  | {
      type: 'REWRITE_SEGMENT'
      source: CommandSource
      segmentId: string
      changes: Partial<Pick<PlanSegment, 'title' | 'place' | 'startTime' | 'endTime' | 'notes' | 'reason' | 'budget'>>
    }
  | {
      type: 'ADD_SEGMENT'
      source: CommandSource
      afterSegmentId?: string | null
      segment: PlanSegment
    }
  | {
      type: 'LOCK_SEGMENT'
      source: CommandSource
      segmentId: string
    }
  | {
      type: 'UNLOCK_SEGMENT'
      source: CommandSource
      segmentId: string
    }
  | {
      type: 'CHOOSE_CANDIDATE'
      source: CommandSource
      actionId: string
      candidateId: string
    }
  | {
      type: 'REFRESH_CANDIDATES'
      source: CommandSource
      actionId?: string
      mode?: 'replace' | 'add-after'
      targetSegmentId?: string
      afterSegmentId?: string | null
      searchQuery?: string
      excludeCandidateIds?: string[]
    }
  | {
      type: 'CHOOSE_PLAN_VARIANT'
      source: CommandSource
      actionId: string
      variantId: string
    }
  | {
      type: 'CONFIRM_PLAN'
      source: CommandSource
    }
  | {
      type: 'DISMISS_PENDING_ACTION'
      source: CommandSource
      actionId: string
    }
  | {
      type: 'SET_ROUTE_CHOICE'
      source: CommandSource
      fromSegmentId: string
      toSegmentId: string
      mode: RouteMode
    }
  | {
      type: 'CLEAR_ROUTE_CHOICE'
      source: CommandSource
      fromSegmentId: string
      toSegmentId: string
    }

export type CommandResult = {
  plan: Plan
  events: AgentEvent[]
  version: number
  patch: PlanPatch
}

