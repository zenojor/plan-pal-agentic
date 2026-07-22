import type { AgentEvent, CandidateIntent, CandidateOption, CandidatePoiPhase, CandidateSearchSession, CommandResult, ConfirmablePlanCommand, MerchantOffering, PendingAction, Plan, PlanCommand, PlanPatch, PlanRouteChoice, PlanSegment, PlanServiceSelection, PlanVariantSelection, ReorderPosition, RouteMode } from './types'
import { createId, nowIso } from './ids'
import { createAddSegmentCandidates, createCandidateIntent, createReplacementCandidates } from './seed'
import { getFictionalPoiById, getFictionalPoiByName, getMerchantOfferingById, searchMerchantOfferings, pickFictionalPoi, segmentFromPoi } from './poiCatalog'
import { createSandboxOrderReceipt } from './mockServices'

export function applyPlanCommand(plan: Plan, command: PlanCommand, runId = createId('cmd')): CommandResult {
  if (requiresAgentConfirmation(command)) {
    throw new Error('Agent mutations require user confirmation')
  }
  const beforeVersion = plan.currentVersion
  const updated = linkPendingAction(applyCommand(plan, command), runId)
  const event = createPlanUpdatedEvent(plan, updated, runId, command)
  const patch: PlanPatch = {
    operation: command.type,
    targetSegmentId: 'segmentId' in command ? command.segmentId : undefined,
    summary: summarizeCommand(command),
    beforeVersion,
    afterVersion: updated.currentVersion,
  }

  return {
    plan: updated,
    events: [event],
    version: updated.currentVersion,
    patch,
  }
}

function linkPendingAction(plan: Plan, runId: string): Plan {
  if (!plan.pendingAction) return plan
  return {
    ...plan,
    pendingAction: {
      ...plan.pendingAction,
      runId,
      planId: plan.id,
      baseVersion: plan.currentVersion,
    },
  }
}

function applyCommand(plan: Plan, command: PlanCommand): Plan {
  switch (command.type) {
    case 'REQUEST_COMMAND_CONFIRMATION':
      return requestCommandConfirmation(plan, command)
    case 'CONFIRM_COMMAND_ACTION':
      return confirmCommandAction(plan, command)
    case 'CLEAR_PLAN_SEGMENTS':
      return clearPlanSegments(plan, command)
    case 'RESTORE_PLAN_VERSION':
      throw new Error('Plan version restore must be handled by the plan repository')
    case 'REORDER_SEGMENT':
      return touch(plan, { segments: reorderPlanSegmentsWithTime(plan.segments, command.segmentId, command.anchorSegmentId, command.position) })
    case 'DELETE_SEGMENT':
      return touch(plan, {
        segments: deleteSegment(plan.segments, command.segmentId),
        serviceSelections: (plan.serviceSelections ?? []).filter((selection) => selection.segmentId !== command.segmentId),
        pendingAction: undefined,
      })
    case 'REPLACE_SEGMENT':
      return replaceSegment(plan, command)
    case 'REWRITE_SEGMENT':
      return rewriteSegment(plan, command)
    case 'ADD_SEGMENT':
      return touch(plan, {
        segments: addSegment(plan.segments, command.segment, command.afterSegmentId),
        pendingAction: undefined,
      })
    case 'LOCK_SEGMENT':
      assertSegmentExists(plan.segments, command.segmentId)
      return touch(plan, {
        segments: plan.segments.map((segment) =>
          segment.id === command.segmentId ? { ...segment, locked: true, status: '已锁定' } : segment,
        ),
      })
    case 'UNLOCK_SEGMENT':
      assertSegmentExists(plan.segments, command.segmentId)
      return touch(plan, {
        segments: plan.segments.map((segment) =>
          segment.id === command.segmentId ? { ...segment, locked: false, status: '待确认' } : segment,
        ),
      })
    case 'CHOOSE_CANDIDATE':
      return chooseCandidate(plan, command.actionId, command.candidateId)
    case 'REFRESH_CANDIDATES':
      return refreshCandidates(plan, command)
    case 'REQUEST_CLARIFICATION':
      return requestClarification(plan, command)
    case 'CHOOSE_PLAN_VARIANT':
      return choosePlanVariant(plan, command.actionId, command.variantId)
    case 'DISMISS_PENDING_ACTION':
      return dismissPendingAction(plan, command)
    case 'SET_ROUTE_CHOICE':
      return setRouteChoice(plan, command)
    case 'CLEAR_ROUTE_CHOICE':
      return clearRouteChoice(plan, command)
    case 'REFRESH_SERVICE_ITEMS':
      return refreshServiceItems(plan, command)
    case 'SELECT_SERVICE_ITEM':
      return selectServiceItem(plan, command)
    case 'REMOVE_SERVICE_ITEM':
      return removeServiceItem(plan, command)
    case 'UPDATE_SERVICE_ITEM_QUANTITY':
      return updateServiceItemQuantity(plan, command)
    case 'CONFIRM_PLAN':
      assertExecutablePlan(plan)
      return touch(plan, {
        status: 'confirmed',
        pendingAction: undefined,
        sandboxOrder: createSandboxOrderReceipt(plan, {
          createdAt: nowIso(),
          version: plan.currentVersion + 1,
        }),
      })
    case 'CREATE_SANDBOX_ORDER':
      assertExecutablePlan(plan)
      return touch(plan, {
        status: 'confirmed',
        pendingAction: undefined,
        sandboxOrder: createSandboxOrderReceipt(plan, {
          createdAt: nowIso(),
          version: plan.currentVersion + 1,
        }),
      })
    default:
      return assertNever(command)
  }
}

function requestCommandConfirmation(plan: Plan, command: Extract<PlanCommand, { type: 'REQUEST_COMMAND_CONFIRMATION' }>) {
  if (!command.commands.length) {
    throw new Error('Confirmation requires at least one command')
  }
  for (const item of command.commands) {
    assertConfirmableCommand(item)
  }
  const inferred = inferCommandPreview(plan, command.commands)
  const action: PendingAction = {
    id: command.actionId ?? createId('action'),
    kind: 'command-confirmation',
    title: command.title,
    description: command.description,
    severity: command.severity,
    confirmLabel: command.confirmLabel,
    cancelLabel: command.cancelLabel,
    commands: command.commands,
    preview: {
      ...inferred,
      ...command.preview,
      affectedSegmentIds: command.preview?.affectedSegmentIds ?? inferred.affectedSegmentIds,
      affectedSegmentTitles: command.preview?.affectedSegmentTitles ?? inferred.affectedSegmentTitles,
      riskNotes: command.preview?.riskNotes ?? inferred.riskNotes,
      summary: command.preview?.summary ?? inferred.summary,
      beforeVersion: command.preview?.beforeVersion ?? plan.currentVersion,
    },
  }
  return touch(plan, { pendingAction: action })
}

function confirmCommandAction(plan: Plan, command: Extract<PlanCommand, { type: 'CONFIRM_COMMAND_ACTION' }>) {
  const pending = plan.pendingAction
  if (!pending || pending.kind !== 'command-confirmation' || pending.id !== command.actionId) {
    throw new Error('Command confirmation is no longer active')
  }
  let next: Plan = { ...plan, pendingAction: undefined }
  for (const item of pending.commands) {
    assertConfirmableCommand(item)
    next = applyCommand(next, markConfirmedCommand(item))
  }
  return next
}

function clearPlanSegments(plan: Plan, command: Extract<PlanCommand, { type: 'CLEAR_PLAN_SEGMENTS' }>) {
  const requestedIds = command.segmentIds?.length ? new Set(command.segmentIds) : undefined
  const includeLocked = Boolean(command.includeLocked)
  const targets = plan.segments.filter((segment) => {
    if (segment.isTransit) return false
    if (requestedIds && !requestedIds.has(segment.id)) return false
    if (segment.locked && !includeLocked) return false
    return true
  })
  if (targets.length === 0) {
    throw new Error('No unlocked plan segments can be cleared')
  }
  const targetIds = new Set(targets.map((segment) => segment.id))
  const nextSegments = plan.segments.filter((segment) => {
    if (targetIds.has(segment.id)) return false
    if (!requestedIds && segment.isTransit) return false
    return true
  })
  return touch(plan, {
    segments: nextSegments,
    serviceSelections: (plan.serviceSelections ?? []).filter((selection) => !targetIds.has(selection.segmentId)),
    pendingAction: undefined,
    variantSelection: undefined,
  })
}

function replaceSegment(plan: Plan, command: Extract<PlanCommand, { type: 'REPLACE_SEGMENT' }>) {
  const target = plan.segments.find((segment) => segment.id === command.segmentId)
  if (!target) {
    throw new Error('Segment not found')
  }
  if (target.locked) {
    throw new Error('Locked segments cannot be replaced')
  }
  if (!command.replacement) {
    const candidateTarget = requireCandidateTarget(plan, command.segmentId)
    const actionId = createId('action')
    const candidateIntent = createCandidateIntent(plan, command.segmentId, command.searchQuery)
    const candidates = createReplacementCandidates(plan, command.segmentId, command.searchQuery, [], candidateIntent)
    if (candidates.length === 0) throw new Error('Candidate search returned no results')
    const action: PendingAction = {
      id: actionId,
      kind: 'candidate-selection',
      mode: 'replace',
      targetSegmentId: command.segmentId,
      title: candidateActionTitle(candidateTarget, candidateIntent),
      description: candidateActionDescription(candidateTarget, candidateIntent),
      searchQuery: command.searchQuery?.trim() || undefined,
      candidates,
      excludeCandidateIds: candidateTarget.poiId ? [candidateTarget.poiId] : [],
      session: createCandidateSearchSession(actionId, candidateTarget, candidateIntent, candidateTarget.poiId ? [candidateTarget.poiId] : []),
    }
    return touch(plan, { pendingAction: action })
  }
  return touch(plan, {
    segments: plan.segments.map((segment) =>
      segment.id === command.segmentId ? normalizeSegment({ ...segment, ...command.replacement }, segment) : segment,
    ),
    serviceSelections: (plan.serviceSelections ?? []).filter((selection) => selection.segmentId !== command.segmentId),
    pendingAction: undefined,
  })
}

function rewriteSegment(plan: Plan, command: Extract<PlanCommand, { type: 'REWRITE_SEGMENT' }>) {
  const target = plan.segments.find((segment) => segment.id === command.segmentId)
  if (!target) {
    throw new Error('Segment not found')
  }
  if (target.locked) {
    throw new Error('Locked segments cannot be rewritten')
  }
  return touch(plan, {
    segments: plan.segments.map((segment) =>
      segment.id === command.segmentId ? normalizeSegment({ ...segment, ...command.changes }, segment) : segment,
    ),
    pendingAction: undefined,
  })
}

function chooseCandidate(plan: Plan, actionId: string, candidateId: string) {
  const pending = plan.pendingAction
  if (!pending || pending.kind !== 'candidate-selection' || pending.id !== actionId) {
    throw new Error('Candidate action is no longer active')
  }
  const candidate = pending.candidates.find((item) => item.id === candidateId)
  if (!candidate) {
    throw new Error('Candidate not found')
  }
  if (pending.mode === 'add-after') {
    return touch(plan, {
      segments: addSegment(plan.segments, materializeCandidateSegment(plan, pending, candidate.segment), pending.afterSegmentId),
      pendingAction: undefined,
    })
  }
  if (!pending.targetSegmentId) {
    throw new Error('Candidate target segment is missing')
  }
  const target = plan.segments.find((segment) => segment.id === pending.targetSegmentId)
  if (!target) throw new Error('Candidate target segment is missing')
  if (pending.session) {
    const snapshot = pending.session.sourceSegmentSnapshot
    if ((target.poiId ?? '') !== snapshot.poiId || target.startTime !== snapshot.startTime || target.endTime !== snapshot.endTime) {
      throw new Error('Candidate action is stale because the target segment changed')
    }
  }
  return touch(plan, {
    segments: plan.segments.map((segment) =>
      segment.id === pending.targetSegmentId ? normalizeSegment({ ...segment, ...candidate.segment }, segment) : segment,
    ),
    serviceSelections: (plan.serviceSelections ?? []).filter((selection) => selection.segmentId !== pending.targetSegmentId),
    pendingAction: undefined,
  })
}

function refreshCandidates(plan: Plan, command: Extract<PlanCommand, { type: 'REFRESH_CANDIDATES' }>) {
  const existing = command.actionId && plan.pendingAction?.id === command.actionId ? plan.pendingAction : undefined
  if (command.actionId && plan.pendingAction && plan.pendingAction.kind !== 'candidate-selection') {
    throw new Error('Candidate action is no longer active')
  }
  const mode = command.mode ?? (existing?.kind === 'candidate-selection' ? existing.mode : 'replace')
  const targetSegmentId = command.targetSegmentId ?? (existing?.kind === 'candidate-selection' ? existing.targetSegmentId : undefined)
  const afterSegmentId = command.afterSegmentId ?? (existing?.kind === 'candidate-selection' ? existing.afterSegmentId : null)
  const explicitSearchQuery = command.searchQuery?.trim()
  const searchQuery = explicitSearchQuery || (existing?.kind === 'candidate-selection' ? existing.searchQuery : undefined)
  const resetSession = command.resetSession || isCandidateSessionResetRequest(explicitSearchQuery)
  const excluded = resetSession
    ? [...(command.excludeCandidateIds ?? [])]
    : [
        ...(existing?.kind === 'candidate-selection' ? existing.session?.seenPoiIds ?? existing.excludeCandidateIds ?? [] : []),
        ...(existing?.kind === 'candidate-selection' ? existing.candidates.map((candidate) => candidate.id) : []),
        ...(command.excludeCandidateIds ?? []),
      ]
  const uniqueExcluded = [...new Set(excluded)]
  const target = mode === 'replace' ? requireCandidateTarget(plan, requireSegmentId(targetSegmentId)) : undefined
  const candidateIntent = target
    ? resolveCandidateIntent(plan, target, searchQuery ?? '', {
        existing: existing?.kind === 'candidate-selection' ? existing.session?.intent : undefined,
        incoming: command.candidateIntent,
        explicitSearchQuery,
        resetSession,
      })
    : undefined
  const candidates = command.candidates ?? (mode === 'add-after'
    ? createAddSegmentCandidates(plan, afterSegmentId, searchQuery, uniqueExcluded)
    : createReplacementCandidates(plan, requireSegmentId(targetSegmentId), searchQuery, uniqueExcluded, candidateIntent))
  if (candidates.length === 0) {
    throw new Error('Candidate search returned no results')
  }
  const actionId = existing?.kind === 'candidate-selection' ? existing.id : command.actionId ?? createId('action')
  const groundedCandidates = groundCandidateOptions(candidates, candidateIntent, target)
  if (groundedCandidates.length === 0) throw new Error('Candidate search returned no grounded results')
  const session = target && candidateIntent
    ? reviseCandidateSearchSession(
        actionId,
        target,
        candidateIntent,
        uniqueExcluded,
        existing?.kind === 'candidate-selection' ? existing.session : undefined,
      )
    : undefined
  const action: PendingAction = {
    id: actionId,
    kind: 'candidate-selection',
    mode,
    targetSegmentId,
    afterSegmentId,
    title: mode === 'add-after' ? '给空档加点别的' : candidateActionTitle(target!, candidateIntent!),
    description: mode === 'add-after'
      ? 'PlanPal 找到几个适合塞进空档的具体地点，选择后会直接加入拼图。'
      : candidateActionDescription(target!, candidateIntent!),
    searchQuery: candidateIntent?.query ?? searchQuery,
    candidates: groundedCandidates,
    excludeCandidateIds: uniqueExcluded,
    session,
  }
  return touch(plan, { pendingAction: action })
}

function resolveCandidateIntent(
  plan: Plan,
  target: PlanSegment & { phase: CandidatePoiPhase },
  query: string,
  input: {
    existing?: CandidateIntent
    incoming?: CandidateIntent
    explicitSearchQuery?: string
    resetSession?: boolean
  },
) {
  if (input.incoming) {
    return createCandidateIntent(plan, target.id, input.incoming.query || query, input.incoming)
  }
  if (input.resetSession) return createCandidateIntent(plan, target.id, input.explicitSearchQuery || query)
  if (input.explicitSearchQuery) {
    const fresh = createCandidateIntent(plan, target.id, input.explicitSearchQuery)
    if (!input.existing || fresh.replacementScope === 'cross-type') return { ...fresh, operation: 'refine' as const }
    const mergedQuery = [...new Set([input.existing.query.trim(), input.explicitSearchQuery.trim()].filter(Boolean))].join('；')
    return createCandidateIntent(plan, target.id, mergedQuery, {
      ...fresh,
      operation: 'refine',
      query: mergedQuery,
      softPreferences: {
        ...input.existing.softPreferences,
        ...fresh.softPreferences,
        tags: [...new Set([
          ...(input.existing.softPreferences.tags ?? []),
          ...(fresh.softPreferences.tags ?? []),
        ])],
      },
    })
  }
  if (input.existing) {
    return createCandidateIntent(plan, target.id, input.existing.query || query, {
      ...input.existing,
      operation: 'refresh',
    })
  }
  return createCandidateIntent(plan, target.id, query)
}

function createCandidateSearchSession(
  actionId: string,
  target: PlanSegment & { phase: CandidatePoiPhase },
  intent: CandidateIntent,
  seenPoiIds: string[],
): CandidateSearchSession {
  return {
    actionId,
    targetSegmentId: target.id,
    sourceSegmentSnapshot: {
      poiId: target.poiId ?? '',
      phase: target.phase,
      serviceCategory: target.serviceCategory,
      startTime: target.startTime,
      endTime: target.endTime,
    },
    intent,
    seenPoiIds: [...new Set(seenPoiIds)],
    revision: 0,
  }
}

function reviseCandidateSearchSession(
  actionId: string,
  target: PlanSegment & { phase: CandidatePoiPhase },
  intent: CandidateIntent,
  seenPoiIds: string[],
  existing?: CandidateSearchSession,
) {
  const reusable = existing?.targetSegmentId === target.id
  return {
    ...(reusable ? existing : createCandidateSearchSession(actionId, target, intent, seenPoiIds)),
    actionId,
    targetSegmentId: target.id,
    intent,
    seenPoiIds: [...new Set(seenPoiIds)],
    revision: reusable ? existing.revision + 1 : 0,
  } satisfies CandidateSearchSession
}

function groundCandidateOptions(
  candidates: CandidateOption[],
  intent?: CandidateIntent,
  target?: PlanSegment & { phase: CandidatePoiPhase },
) {
  const seen = new Set<string>()
  return candidates.flatMap((candidate) => {
    const poi = getFictionalPoiById(candidate.segment.poiId ?? candidate.id)
    if (!poi || seen.has(poi.id)) return []
    if (intent && (!intent.desiredPhases.includes(poi.phase) || intent.excludedPhases.includes(poi.phase))) return []
    if (target?.poiId && poi.id === target.poiId) return []
    const startTime = target?.startTime ?? candidate.segment.startTime
    const endTime = target?.endTime ?? candidate.segment.endTime
    if (!startTime || !endTime) return []
    seen.add(poi.id)
    return [{
      ...candidate,
      id: poi.id,
      label: poi.name,
      description: poi.description,
      segment: {
        ...segmentFromPoi(poi, {
          startTime,
          endTime,
          status: candidate.segment.status,
          reason: candidate.segment.reason,
        }),
      },
    }]
  })
}

function requireCandidateTarget(plan: Plan, segmentId: string): PlanSegment & { phase: CandidatePoiPhase } {
  const target = plan.segments.find((segment) => segment.id === segmentId)
  if (!target || target.isTransit || target.phase === 'transit') throw new Error('Candidate target must be an executable segment')
  if (target.locked) throw new Error('Locked segments cannot be replaced')
  return target as PlanSegment & { phase: CandidatePoiPhase }
}

function candidateActionTitle(target: PlanSegment, intent: CandidateIntent) {
  if (intent.replacementScope === 'cross-type') {
    return `${candidatePhaseLabel(target.phase)} → ${intent.desiredPhases.map(candidatePhaseLabel).join('/')}`
  }
  return '选择替换候选'
}

function candidateActionDescription(target: PlanSegment, intent: CandidateIntent) {
  const time = `${target.startTime}-${target.endTime}`
  if (intent.replacementScope === 'cross-type') {
    return `保留 ${time}，把“${target.title}”改成${intent.desiredPhases.map(candidatePhaseLabel).join('或')}；选中前不会修改计划。`
  }
  return `保留 ${time} 和当前行程上下文，选择后才会更新“${target.title}”。`
}

function candidatePhaseLabel(phase: PlanSegment['phase']) {
  if (phase === 'activity') return '活动'
  if (phase === 'dining') return '用餐'
  if (phase === 'drinks') return '小酌'
  if (phase === 'leisure') return '休闲'
  return '交通'
}

function isCandidateSessionResetRequest(query: string | undefined) {
  if (!query) return false
  return ['重新开始', '清空要求', '重置要求', '从头来'].some((keyword) => query.includes(keyword))
}

function requestClarification(plan: Plan, command: Extract<PlanCommand, { type: 'REQUEST_CLARIFICATION' }>) {
  const action: PendingAction = {
    id: command.actionId ?? createId('action'),
    kind: 'clarification',
    title: command.title,
    description: command.description,
    requiredFields: command.requiredFields.map((field) => field.trim()).filter(Boolean),
  }
  return touch(plan, { pendingAction: action })
}

function choosePlanVariant(plan: Plan, actionId: string, variantId: string) {
  const pending = plan.pendingAction?.kind === 'plan-variant-selection' && plan.pendingAction.id === actionId
    ? plan.pendingAction
    : undefined
  const stored = plan.variantSelection?.actionId === actionId ? plan.variantSelection : undefined
  const source = pending ?? stored
  if (!source) {
    throw new Error('Plan variant action is no longer active')
  }
  const variant = source.variants.find((item) => item.id === variantId)
  if (!variant) {
    throw new Error('Plan variant not found')
  }
  const variantSelection: PlanVariantSelection = {
    actionId,
    title: source.title,
    description: source.description,
    variants: source.variants,
    selectedVariantId: variant.id,
    selectedAt: nowIso(),
  }
  return touch(plan, {
    segments: variant.segments.map((segment) => normalizeSegment(segment)),
    summary: variant.summary,
    pendingAction: undefined,
    variantSelection,
    routeChoices: [],
    serviceSelections: [],
  })
}

function dismissPendingAction(plan: Plan, command: Extract<PlanCommand, { type: 'DISMISS_PENDING_ACTION' }>) {
  if (!plan.pendingAction || plan.pendingAction.id !== command.actionId) {
    throw new Error('Pending action is no longer active')
  }
  return touch(plan, { pendingAction: undefined })
}

export function reorderPlanSegmentsWithTime(
  segments: PlanSegment[],
  segmentId: string,
  anchorSegmentId: string | null | undefined,
  position: ReorderPosition | string,
) {
  const executable = segments.filter((segment) => !segment.isTransit)
  const currentIndex = executable.findIndex((segment) => segment.id === segmentId)
  if (currentIndex < 0) throw new Error('Segment not found')
  const moved = executable[currentIndex]
  if (!moved) throw new Error('Segment not found')
  if (moved.locked) throw new Error('Locked segments cannot be reordered')
  const next = executable.filter((segment) => segment.id !== segmentId)
  let insertIndex = next.length
  if (position === 'START') {
    insertIndex = 0
  } else if (position !== 'END') {
    const anchorIndex = next.findIndex((segment) => segment.id === anchorSegmentId)
    if (anchorIndex < 0) throw new Error('Anchor segment not found')
    insertIndex = position === 'AFTER' ? anchorIndex + 1 : anchorIndex
  }
  next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, moved)
  return reflowSegmentTimes(next, executable[0]?.startTime)
}

function reflowSegmentTimes(segments: PlanSegment[], firstStartTime = '12:00') {
  let cursor = readClockTime(firstStartTime) || '12:00'
  return segments.map((segment) => {
    const duration = Math.max(30, Number.isFinite(segment.durationMinutes)
      ? segment.durationMinutes
      : minutesBetween(segment.startTime, segment.endTime))
    const startTime = cursor
    const endTime = addMinutes(startTime, duration)
    cursor = endTime
    return normalizeSegment({ ...segment, startTime, endTime, durationMinutes: duration }, segment)
  })
}

function deleteSegment(segments: PlanSegment[], segmentId: string) {
  const target = segments.find((segment) => segment.id === segmentId)
  if (!target) throw new Error('Segment not found')
  if (target.locked) throw new Error('Locked segments cannot be deleted')
  const remaining = segments.filter((segment) => segment.id !== segmentId)
  if (remaining.filter((segment) => !segment.isTransit).length < 1) {
    throw new Error('At least one plan segment is required')
  }
  return remaining
}

function addSegment(segments: PlanSegment[], segment: PlanSegment, afterSegmentId?: string | null) {
  const next = [...segments]
  if (afterSegmentId && !next.some((item) => item.id === afterSegmentId)) {
    throw new Error('Anchor segment not found')
  }
  const insertIndex = afterSegmentId ? next.findIndex((item) => item.id === afterSegmentId) + 1 : next.length
  next.splice(insertIndex > 0 ? insertIndex : next.length, 0, normalizeSegment(segment))
  return next
}

function setRouteChoice(plan: Plan, command: Extract<PlanCommand, { type: 'SET_ROUTE_CHOICE' }>) {
  if (!isRouteMode(command.mode)) {
    throw new Error('Route mode is not supported')
  }
  assertRouteChoiceAllowed(plan.segments, command.fromSegmentId, command.toSegmentId)
  const choice: PlanRouteChoice = {
    id: getPlanRouteChoiceId(command.fromSegmentId, command.toSegmentId),
    fromSegmentId: command.fromSegmentId,
    toSegmentId: command.toSegmentId,
    mode: command.mode,
    updatedAt: nowIso(),
  }
  return touch(plan, {
    routeChoices: upsertRouteChoice(plan.routeChoices, choice),
  })
}

function clearRouteChoice(plan: Plan, command: Extract<PlanCommand, { type: 'CLEAR_ROUTE_CHOICE' }>) {
  assertRouteChoiceAllowed(plan.segments, command.fromSegmentId, command.toSegmentId)
  const routeId = getPlanRouteChoiceId(command.fromSegmentId, command.toSegmentId)
  return touch(plan, {
    routeChoices: (plan.routeChoices ?? []).filter((choice) => choice.id !== routeId),
  })
}

function refreshServiceItems(plan: Plan, command: Extract<PlanCommand, { type: 'REFRESH_SERVICE_ITEMS' }>) {
  const segment = requireExecutableSegment(plan.segments, command.segmentId)
  const merchant = resolveSegmentMerchant(segment, command.merchantId)
  const query = command.query?.trim() || serviceSearchQueryForSegment(segment)
  const results = command.offerings ? [] : searchMerchantOfferings({
      merchantId: merchant.id,
      category: command.category ?? segment.serviceCategory,
      query,
      limit: command.limit ?? 6,
    })
  const offerings = command.offerings ?? (results.length
    ? results.map((result) => result.offering)
    : merchant.offerings.slice(0, Math.max(1, Math.min(6, command.limit ?? 6))))
  if (offerings.length === 0) {
    throw new Error('Offering search returned no results')
  }
  const action: PendingAction = {
    id: command.actionId ?? createId('action'),
    kind: 'service-item-selection',
    title: '选择商品/服务',
    description: `${merchant.name} 的本地 sandbox 服务项，可选择后写入模拟确认单。`,
    segmentId: segment.id,
    merchantId: merchant.id,
    query,
    offerings,
  }
  return touch(plan, { pendingAction: action })
}

function selectServiceItem(plan: Plan, command: Extract<PlanCommand, { type: 'SELECT_SERVICE_ITEM' }>) {
  const segment = requireExecutableSegment(plan.segments, command.segmentId)
  const merchant = resolveSegmentMerchant(segment, command.merchantId)
  const offering = getMerchantOfferingById(merchant.id, command.offeringId)
  if (!offering) throw new Error('Service offering not found')
  const quantity = normalizeQuantity(command.quantity ?? defaultServiceQuantity(plan, offering))
  const selection = createServiceSelection(segment.id, merchant.id, offering, quantity)
  const existing = plan.serviceSelections ?? []
  return touch(plan, {
    serviceSelections: [
      ...existing.filter((item) => !(item.segmentId === segment.id && item.offeringId === offering.id)),
      selection,
    ],
    pendingAction: plan.pendingAction?.kind === 'service-item-selection' && plan.pendingAction.segmentId === segment.id
      ? undefined
      : plan.pendingAction,
  })
}

function removeServiceItem(plan: Plan, command: Extract<PlanCommand, { type: 'REMOVE_SERVICE_ITEM' }>) {
  const before = plan.serviceSelections ?? []
  const next = before.filter((selection) => !matchesServiceSelection(selection, command))
  if (next.length === before.length) throw new Error('Service selection not found')
  return touch(plan, { serviceSelections: next })
}

function updateServiceItemQuantity(plan: Plan, command: Extract<PlanCommand, { type: 'UPDATE_SERVICE_ITEM_QUANTITY' }>) {
  const quantity = normalizeQuantity(command.quantity)
  let found = false
  const next = (plan.serviceSelections ?? []).map((selection) => {
    if (!matchesServiceSelection(selection, command)) return selection
    found = true
    return { ...selection, quantity, selectedAt: nowIso() }
  })
  if (!found) throw new Error('Service selection not found')
  return touch(plan, { serviceSelections: next })
}

function materializeCandidateSegment(
  plan: Plan,
  pending: Extract<PendingAction, { kind: 'candidate-selection' }>,
  partial: Partial<PlanSegment>,
): PlanSegment {
  const after = pending.afterSegmentId ? plan.segments.find((segment) => segment.id === pending.afterSegmentId) : undefined
  const fallbackPoi = pickFictionalPoi(partial.phase ?? 'leisure')
  const startTime = partial.startTime ?? after?.endTime ?? plan.intent.startTime
  const endTime = partial.endTime ?? addMinutes(startTime, partial.durationMinutes ?? 45)
  return normalizeSegment({
    id: createId('seg'),
    phase: partial.phase ?? fallbackPoi.phase,
    title: partial.title ?? fallbackPoi.activityTitle,
    place: partial.place ?? fallbackPoi.name,
    startTime,
    endTime,
    durationMinutes: partial.durationMinutes ?? minutesBetween(startTime, endTime),
    status: partial.status ?? '待确认',
    reason: partial.reason ?? fallbackPoi.description,
    budget: partial.budget ?? fallbackPoi.budget,
    notes: partial.notes ?? fallbackPoi.notes,
    poiId: partial.poiId ?? fallbackPoi.id,
    serviceCategory: partial.serviceCategory ?? fallbackPoi.serviceCategory,
    locked: partial.locked,
    isTransit: partial.isTransit,
    transportMode: partial.transportMode,
    lnglat: partial.lnglat ?? fallbackPoi.lnglat,
  })
}

function requireExecutableSegment(segments: PlanSegment[], segmentId: string) {
  const segment = segments.find((item) => item.id === segmentId)
  if (!segment) throw new Error('Segment not found')
  if (segment.isTransit) throw new Error('Service items require an executable segment')
  return segment
}

function resolveSegmentMerchant(segment: PlanSegment, merchantId?: string) {
  const merchant = getFictionalPoiById(merchantId ?? segment.poiId) ?? getFictionalPoiByName(segment.place)
  if (!merchant) throw new Error('Mock merchant not found')
  if (merchantId && merchant.id !== merchantId) throw new Error('Mock merchant mismatch')
  if (segment.poiId && merchant.id !== segment.poiId) throw new Error('Service item merchant must match the segment merchant')
  return merchant
}

function serviceSearchQueryForSegment(segment: PlanSegment) {
  return [
    segment.serviceCategory,
    segment.title,
    segment.place,
    segment.reason,
  ].filter(Boolean).join(' ')
}

function createServiceSelection(
  segmentId: string,
  merchantId: string,
  offering: MerchantOffering,
  quantity: number,
): PlanServiceSelection {
  return {
    id: serviceSelectionId(segmentId, offering.id),
    segmentId,
    merchantId,
    offeringId: offering.id,
    quantity,
    selectedAt: nowIso(),
    offeringSnapshot: { ...offering },
  }
}

function defaultServiceQuantity(plan: Plan, offering: MerchantOffering) {
  const headcount = Math.max(1, plan.intent.headcount || 1)
  if (offering.category === 'hotel') return 1
  if (offering.category === 'movie' || offering.category === 'ticket') return headcount
  if (offering.unit === '组' || offering.unit === '套') return Math.max(1, Math.ceil(headcount / 2))
  return headcount
}

function normalizeQuantity(value: number) {
  const quantity = Math.floor(value)
  if (!Number.isFinite(quantity) || quantity < 1) throw new Error('Service item quantity must be at least 1')
  return Math.min(99, quantity)
}

function serviceSelectionId(segmentId: string, offeringId: string) {
  return `sel_${segmentId}_${offeringId}`.replace(/[^A-Za-z0-9_]/g, '_')
}

function matchesServiceSelection(
  selection: PlanServiceSelection,
  command: Pick<Extract<PlanCommand, { type: 'REMOVE_SERVICE_ITEM' | 'UPDATE_SERVICE_ITEM_QUANTITY' }>, 'selectionId' | 'segmentId' | 'offeringId'>,
) {
  if (command.selectionId) return selection.id === command.selectionId
  return Boolean(command.segmentId && command.offeringId && selection.segmentId === command.segmentId && selection.offeringId === command.offeringId)
}

function touch(plan: Plan, patch: Partial<Plan>): Plan {
  const segments = patch.segments ?? plan.segments
  const routeChoices = reconcileRouteChoices(segments, patch.routeChoices ?? plan.routeChoices)
  const serviceSelections = reconcileServiceSelections(segments, patch.serviceSelections ?? plan.serviceSelections)
  return {
    ...plan,
    ...patch,
    routeChoices: routeChoices.length ? routeChoices : undefined,
    serviceSelections: serviceSelections.length ? serviceSelections : undefined,
    currentVersion: plan.currentVersion + 1,
    status: patch.status ?? 'ready',
    updatedAt: nowIso(),
  }
}

function normalizeSegment(segment: PlanSegment, fallback?: PlanSegment): PlanSegment {
  const startTime = readClockTime(segment.startTime) || readClockTime(fallback?.startTime) || '12:00'
  const durationFallback = Number.isFinite(segment.durationMinutes)
    ? segment.durationMinutes
    : Number.isFinite(fallback?.durationMinutes)
      ? fallback?.durationMinutes
      : 60
  const endCandidate = readClockTime(segment.endTime) || readClockTime(fallback?.endTime)
  const endTime = endCandidate && toMinutes(endCandidate) > toMinutes(startTime)
    ? endCandidate
    : addMinutes(startTime, Math.max(30, durationFallback ?? 60))
  return {
    ...segment,
    startTime,
    endTime,
    durationMinutes: Math.max(30, toMinutes(endTime) - toMinutes(startTime)),
    status: segment.locked ? '已锁定' : segment.status || '待确认',
  }
}

function readClockTime(value: unknown) {
  return typeof value === 'string' && isClockTime(value.trim()) ? value.trim() : ''
}

function isClockTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) || value === '24:00'
}

function toMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10)
}

function minutesBetween(start: string, end: string) {
  return Math.max(30, toMinutes(end) - toMinutes(start))
}

function addMinutes(value: string, minutes: number) {
  const total = Math.max(0, Math.min(24 * 60, toMinutes(value) + minutes))
  const hour = Math.floor(total / 60)
  const minute = total % 60
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

function createPlanUpdatedEvent(before: Plan, plan: Plan, runId: string, command: PlanCommand): AgentEvent {
  const confirmedCommands = command.type === 'CONFIRM_COMMAND_ACTION'
    && before.pendingAction?.kind === 'command-confirmation'
    && before.pendingAction.id === command.actionId
    ? before.pendingAction.commands
    : undefined
  return {
    id: createId('evt'),
    runId,
    planId: plan.id,
    type: 'plan.updated',
    sequence: 1,
    message: summarizeCommand(command),
    payload: { command, confirmedCommands, version: plan.currentVersion },
    createdAt: nowIso(),
  }
}

export function summarizeCommand(command: PlanCommand) {
  switch (command.type) {
    case 'REQUEST_COMMAND_CONFIRMATION':
      return '等待用户确认修改'
    case 'CONFIRM_COMMAND_ACTION':
      return '已应用确认修改'
    case 'CLEAR_PLAN_SEGMENTS':
      return '已清空拼图节点'
    case 'RESTORE_PLAN_VERSION':
      return `已撤销到 V${command.version}`
    case 'REORDER_SEGMENT':
      return '已重排拼图节点并更新时间'
    case 'DELETE_SEGMENT':
      return '已删除拼图节点'
    case 'REPLACE_SEGMENT':
      return command.replacement ? '已替换拼图节点' : '需要选择替换候选'
    case 'REWRITE_SEGMENT':
      return '已改写拼图节点'
    case 'ADD_SEGMENT':
      return '已新增拼图节点'
    case 'LOCK_SEGMENT':
      return '已锁定拼图节点'
    case 'UNLOCK_SEGMENT':
      return '已解除节点锁定'
    case 'CHOOSE_CANDIDATE':
      return '已应用候选'
    case 'REFRESH_CANDIDATES':
      return '已刷新候选'
    case 'REQUEST_CLARIFICATION':
      return '需要补充信息'
    case 'CHOOSE_PLAN_VARIANT':
      return '已选择方案'
    case 'DISMISS_PENDING_ACTION':
      return '已取消待处理选择'
    case 'SET_ROUTE_CHOICE':
      return '已更新路线选择'
    case 'CLEAR_ROUTE_CHOICE':
      return '已恢复推荐路线'
    case 'REFRESH_SERVICE_ITEMS':
      return '已刷新商品/服务候选'
    case 'SELECT_SERVICE_ITEM':
      return '已选择商品/服务'
    case 'REMOVE_SERVICE_ITEM':
      return '已移除商品/服务'
    case 'UPDATE_SERVICE_ITEM_QUANTITY':
      return '已更新商品/服务数量'
    case 'CONFIRM_PLAN':
      return '计划已确认'
    case 'CREATE_SANDBOX_ORDER':
      return '已生成模拟确认单'
    default:
      return assertNever(command)
  }
}

function requiresAgentConfirmation(command: PlanCommand) {
  if (command.source !== 'agent') return false
  if (command.type === 'REQUEST_COMMAND_CONFIRMATION') return false
  if (command.type === 'REQUEST_CLARIFICATION') return false
  if (command.type === 'REFRESH_CANDIDATES') return false
  if (command.type === 'REFRESH_SERVICE_ITEMS') return false
  if (command.type === 'REPLACE_SEGMENT' && !command.replacement) return false
  return true
}

function assertConfirmableCommand(command: ConfirmablePlanCommand) {
  switch (command.type) {
    case 'REFRESH_CANDIDATES':
    case 'REQUEST_CLARIFICATION':
    case 'REFRESH_SERVICE_ITEMS':
    case 'CHOOSE_CANDIDATE':
    case 'CHOOSE_PLAN_VARIANT':
      throw new Error(`${command.type} cannot be wrapped in a command confirmation`)
    case 'REPLACE_SEGMENT':
      if (!command.replacement) {
        throw new Error('Candidate search cannot be wrapped in a command confirmation')
      }
      return
    default:
      return
  }
}

function markConfirmedCommand(command: ConfirmablePlanCommand): ConfirmablePlanCommand {
  return { ...command, source: 'action-card' } as ConfirmablePlanCommand
}

function inferCommandPreview(plan: Plan, commands: ConfirmablePlanCommand[]) {
  const affectedIds = new Set<string>()
  const riskNotes = new Set<string>()
  let afterOrder: string[] | undefined
  for (const command of commands) {
    switch (command.type) {
      case 'CLEAR_PLAN_SEGMENTS': {
        const requested = command.segmentIds?.length ? new Set(command.segmentIds) : undefined
        for (const segment of plan.segments) {
          if (segment.isTransit) continue
          if (requested && !requested.has(segment.id)) continue
          if (segment.locked && !command.includeLocked) {
            riskNotes.add(`“${segment.title}”已锁定，不会被清空`)
            continue
          }
          affectedIds.add(segment.id)
        }
        riskNotes.add('确认后会移除相关路线和服务项选择')
        break
      }
      case 'DELETE_SEGMENT':
      case 'REPLACE_SEGMENT':
      case 'REWRITE_SEGMENT':
      case 'LOCK_SEGMENT':
      case 'UNLOCK_SEGMENT':
        affectedIds.add(command.segmentId)
        if (command.type === 'DELETE_SEGMENT') riskNotes.add('删除后可通过版本撤销恢复')
        break
      case 'ADD_SEGMENT':
        riskNotes.add(`将新增“${command.segment.title}”节点`)
        break
      case 'REORDER_SEGMENT': {
        affectedIds.add(command.segmentId)
        try {
          afterOrder = reorderPlanSegmentsWithTime(plan.segments, command.segmentId, command.anchorSegmentId, command.position)
            .filter((segment) => !segment.isTransit)
            .map((segment) => segment.title)
        } catch {
          afterOrder = undefined
        }
        break
      }
      case 'SET_ROUTE_CHOICE':
      case 'CLEAR_ROUTE_CHOICE':
        affectedIds.add(command.fromSegmentId)
        affectedIds.add(command.toSegmentId)
        break
      case 'SELECT_SERVICE_ITEM':
      case 'REMOVE_SERVICE_ITEM':
      case 'UPDATE_SERVICE_ITEM_QUANTITY':
        if ('segmentId' in command && command.segmentId) affectedIds.add(command.segmentId)
        break
      case 'CONFIRM_PLAN':
      case 'CREATE_SANDBOX_ORDER':
        riskNotes.add('确认后计划会进入已确认状态')
        break
      default:
        break
    }
  }
  const affectedSegmentIds = [...affectedIds].filter((id) => plan.segments.some((segment) => segment.id === id))
  const affectedSegmentTitles = affectedSegmentIds
    .map((id) => plan.segments.find((segment) => segment.id === id)?.title)
    .filter((title): title is string => Boolean(title))
  return {
    affectedSegmentIds,
    affectedSegmentTitles,
    beforeVersion: plan.currentVersion,
    summary: commands.map(summarizeCommand).join('，'),
    riskNotes: [...riskNotes],
    beforeOrder: plan.segments.filter((segment) => !segment.isTransit).map((segment) => segment.title),
    afterOrder,
  }
}

function assertExecutablePlan(plan: Plan) {
  if (plan.segments.filter((segment) => !segment.isTransit).length < 1) {
    throw new Error('At least one executable plan segment is required')
  }
}

export function getPlanRouteChoiceId(fromSegmentId: string, toSegmentId: string) {
  return `${fromSegmentId}->${toSegmentId}`
}

function upsertRouteChoice(choices: PlanRouteChoice[] | undefined, choice: PlanRouteChoice) {
  return [...(choices ?? []).filter((item) => item.id !== choice.id), choice]
}

function reconcileRouteChoices(segments: PlanSegment[], choices: PlanRouteChoice[] | undefined) {
  if (!choices?.length) return []
  const allowedIds = new Set(adjacentExecutableRouteIds(segments))
  const seen = new Set<string>()
  const next: PlanRouteChoice[] = []
  for (const choice of choices) {
    if (!allowedIds.has(choice.id) || seen.has(choice.id) || !isRouteMode(choice.mode)) continue
    seen.add(choice.id)
    next.push(choice)
  }
  return next
}

function reconcileServiceSelections(segments: PlanSegment[], selections: PlanServiceSelection[] | undefined) {
  if (!selections?.length) return []
  const segmentById = new Map(segments.filter((segment) => !segment.isTransit).map((segment) => [segment.id, segment]))
  const seen = new Set<string>()
  const next: PlanServiceSelection[] = []
  for (const selection of selections) {
    const segment = segmentById.get(selection.segmentId)
    if (!segment || seen.has(selection.id)) continue
    if (segment.poiId && segment.poiId !== selection.merchantId) continue
    if (!getMerchantOfferingById(selection.merchantId, selection.offeringId)) continue
    seen.add(selection.id)
    next.push(selection)
  }
  return next
}

function assertRouteChoiceAllowed(segments: PlanSegment[], fromSegmentId: string, toSegmentId: string) {
  const routeId = getPlanRouteChoiceId(fromSegmentId, toSegmentId)
  if (!adjacentExecutableRouteIds(segments).includes(routeId)) {
    throw new Error('Route choice must target adjacent executable segments')
  }
}

function adjacentExecutableRouteIds(segments: PlanSegment[]) {
  const executable = segments.filter((segment) => !segment.isTransit)
  const ids: string[] = []
  for (let index = 0; index < executable.length - 1; index += 1) {
    const from = executable[index]
    const to = executable[index + 1]
    if (from && to) ids.push(getPlanRouteChoiceId(from.id, to.id))
  }
  return ids
}

function isRouteMode(value: unknown): value is RouteMode {
  return value === 'walk' || value === 'transit' || value === 'taxi'
}

function requireSegmentId(segmentId: string | undefined) {
  if (!segmentId) throw new Error('Candidate target segment is missing')
  return segmentId
}

function assertSegmentExists(segments: PlanSegment[], segmentId: string) {
  if (!segments.some((segment) => segment.id === segmentId)) {
    throw new Error('Segment not found')
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled command: ${JSON.stringify(value)}`)
}
