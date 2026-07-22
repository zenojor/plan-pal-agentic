export type OwnerMode = 'client-byok'

export type PlanStatus = 'draft' | 'ready' | 'pending_confirmation' | 'confirmed' | 'failed'

export type SegmentPhase = 'activity' | 'dining' | 'drinks' | 'leisure' | 'transit'

export type CandidatePoiPhase = Exclude<SegmentPhase, 'transit'>

export type CommandSource = 'puzzle' | 'agent' | 'action-card' | 'system'

export type RouteMode = 'walk' | 'transit' | 'taxi'

export type ReorderPosition = 'BEFORE' | 'AFTER' | 'START' | 'END'

export type ToolEffect = 'read-only' | 'external-write'

export type MerchantServiceCategory =
  | 'dining'
  | 'drinks'
  | 'activity'
  | 'hotel'
  | 'movie'
  | 'retail'
  | 'wellness'
  | 'ticket'
  | 'other'

export type MerchantOfferingFulfillment =
  | 'onsite'
  | 'pickup'
  | 'reservation'
  | 'e-ticket'
  | 'room-night'
  | 'service-slot'
  | 'mock-only'

export type MerchantOffering = {
  id: string
  merchantId: string
  category: MerchantServiceCategory
  title: string
  description: string
  priceCny: number
  unit: string
  durationMinutes?: number
  availabilitySlots: string[]
  tags: string[]
  fulfillment: MerchantOfferingFulfillment
  refundPolicy: string
  mockSource: 'fictional-local-mock-v2'
  roomType?: string
  bedType?: string
  occupancy?: number
  checkInTime?: string
  checkOutTime?: string
  amenities?: string[]
  filmTitle?: string
  showtime?: string
  screenType?: string
  seatClass?: string
  language?: string
  runtimeMinutes?: number
}

export type PlanServiceSelection = {
  id: string
  segmentId: string
  merchantId: string
  offeringId: string
  quantity: number
  selectedAt: string
  offeringSnapshot: MerchantOffering
}

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
  | 'graph.node.started'
  | 'graph.node.finished'
  | 'interrupt.requested'
  | 'interrupt.resumed'
  | 'command.proposed'
  | 'command.applied'
  | 'run.status'

export type CommandConfirmationSeverity = 'normal' | 'destructive' | 'finalizing'

export type CommandConfirmationPreview = {
  affectedSegmentIds: string[]
  affectedSegmentTitles: string[]
  beforeVersion: number
  summary: string
  riskNotes: string[]
  beforeOrder?: string[]
  afterOrder?: string[]
}

export type CandidateIntent = {
  operation: 'refresh' | 'refine' | 'replace'
  replacementScope: 'same-type' | 'cross-type'
  targetSegmentId: string
  desiredPhases: CandidatePoiPhase[]
  excludedPhases: CandidatePoiPhase[]
  query: string
  hardConstraints: {
    startTime: string
    endTime: string
    locked: false
    catalogOnly: true
  }
  softPreferences: {
    budget?: string
    distance?: string
    pace?: string
    tags?: string[]
  }
}

export type CandidateSearchSession = {
  actionId: string
  targetSegmentId: string
  sourceSegmentSnapshot: {
    poiId: string
    phase: CandidatePoiPhase
    serviceCategory?: MerchantServiceCategory
    startTime: string
    endTime: string
  }
  intent: CandidateIntent
  seenPoiIds: string[]
  revision: number
}

export type PendingAction = {
  runId?: string
  planId?: string
  baseVersion?: number
} & (
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
      session?: CandidateSearchSession
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
      kind: 'service-item-selection'
      title: string
      description: string
      segmentId: string
      merchantId: string
      query?: string
      offerings: MerchantOffering[]
    }
  | {
      id: string
      kind: 'clarification'
      title: string
      description: string
      requiredFields: string[]
    }
  | {
      id: string
      kind: 'command-confirmation'
      title: string
      description: string
      severity: CommandConfirmationSeverity
      confirmLabel: string
      cancelLabel: string
      commands: ConfirmablePlanCommand[]
      preview: CommandConfirmationPreview
    }
)

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
  serviceCategory?: MerchantServiceCategory
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

export type MockRouteOption = {
  mode: RouteMode
  label: string
  durationMinutes: number
  distanceKm: number
  priceEstimate: string
  reliability: 'steady' | 'variable'
  source: 'mock-route'
}

export type MockRouteEstimate = {
  id: string
  fromSegmentId: string
  toSegmentId: string
  fromPlace: string
  toPlace: string
  distanceKm: number
  defaultMode: RouteMode
  options: MockRouteOption[]
  riskNotes: string[]
  source: 'mock-route'
}

export type SandboxOrderReceipt = {
  receiptId: string
  planId: string
  createdAt: string
  merchantRefs: Array<{
    segmentId: string
    poiId?: string
    merchantName: string
    phase: SegmentPhase
    time: string
    reservationMode: string
    source: 'fictional-local-mock-v2'
    serviceCategory?: MerchantServiceCategory
  }>
  items: Array<{
    id: string
    segmentId: string
    offeringId?: string
    merchantId?: string
    merchantName: string
    label: string
    quantity: number
    priceCny: number
    unitPriceCny?: number
    category: string
    serviceCategory?: MerchantServiceCategory
    scheduledFor?: string
    fulfillment?: MerchantOfferingFulfillment
  }>
  totalEstimate: {
    currency: 'CNY'
    low: number
    high: number
  }
  status: 'sandbox_generated'
  disclaimer: string
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
  serviceSelections?: PlanServiceSelection[]
  sandboxOrder?: SandboxOrderReceipt
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
  status: 'running' | 'waiting_for_user' | 'completed' | 'failed' | 'cancelled'
  inputMessage: string
  checkpointId?: string
  threadId?: string
  createdAt: string
  finishedAt?: string
}

export type PlanCommand =
  | {
      type: 'REQUEST_COMMAND_CONFIRMATION'
      source: CommandSource
      actionId?: string
      title: string
      description: string
      severity: CommandConfirmationSeverity
      confirmLabel: string
      cancelLabel: string
      commands: ConfirmablePlanCommand[]
      preview?: Partial<CommandConfirmationPreview>
    }
  | {
      type: 'CONFIRM_COMMAND_ACTION'
      source: CommandSource
      actionId: string
    }
  | {
      type: 'CLEAR_PLAN_SEGMENTS'
      source: CommandSource
      segmentIds?: string[]
      includeLocked?: boolean
      reason?: string
    }
  | {
      type: 'RESTORE_PLAN_VERSION'
      source: CommandSource
      version: number
      reason?: string
    }
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
      candidates?: CandidateOption[]
      candidateIntent?: CandidateIntent
      resetSession?: boolean
    }
  | {
      type: 'REQUEST_CLARIFICATION'
      source: CommandSource
      actionId?: string
      title: string
      description: string
      requiredFields: string[]
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
      type: 'CREATE_SANDBOX_ORDER'
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
  | {
      type: 'REFRESH_SERVICE_ITEMS'
      source: CommandSource
      actionId?: string
      segmentId: string
      merchantId?: string
      category?: MerchantServiceCategory
      query?: string
      limit?: number
      offerings?: MerchantOffering[]
    }
  | {
      type: 'SELECT_SERVICE_ITEM'
      source: CommandSource
      segmentId: string
      merchantId: string
      offeringId: string
      quantity?: number
    }
  | {
      type: 'REMOVE_SERVICE_ITEM'
      source: CommandSource
      selectionId?: string
      segmentId?: string
      offeringId?: string
    }
  | {
      type: 'UPDATE_SERVICE_ITEM_QUANTITY'
      source: CommandSource
      selectionId?: string
      segmentId?: string
      offeringId?: string
      quantity: number
    }

export type ConfirmablePlanCommand = Exclude<
  PlanCommand,
  | { type: 'REQUEST_COMMAND_CONFIRMATION' }
  | { type: 'CONFIRM_COMMAND_ACTION' }
  | { type: 'RESTORE_PLAN_VERSION' }
>

export type CommandResult = {
  plan: Plan
  events: AgentEvent[]
  version: number
  patch: PlanPatch
}

