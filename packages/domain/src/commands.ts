import type { AgentEvent, CommandResult, MerchantOffering, PendingAction, Plan, PlanCommand, PlanPatch, PlanRouteChoice, PlanSegment, PlanServiceSelection, PlanVariantSelection, ReorderPosition, RouteMode } from './types'
import { createId, nowIso } from './ids'
import { createAddSegmentCandidates, createReplacementCandidates } from './seed'
import { getFictionalPoiById, getFictionalPoiByName, getMerchantOfferingById, searchMerchantOfferings, pickFictionalPoi } from './poiCatalog'
import { createSandboxOrderReceipt } from './mockServices'

export function applyPlanCommand(plan: Plan, command: PlanCommand, runId = createId('cmd')): CommandResult {
  const beforeVersion = plan.currentVersion
  const updated = applyCommand(plan, command)
  const event = createPlanUpdatedEvent(updated, runId, command)
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

function applyCommand(plan: Plan, command: PlanCommand): Plan {
  switch (command.type) {
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
      return touch(plan, {
        status: 'confirmed',
        pendingAction: undefined,
        sandboxOrder: createSandboxOrderReceipt(plan, {
          createdAt: nowIso(),
          version: plan.currentVersion + 1,
        }),
      })
    case 'CREATE_SANDBOX_ORDER':
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

function replaceSegment(plan: Plan, command: Extract<PlanCommand, { type: 'REPLACE_SEGMENT' }>) {
  const target = plan.segments.find((segment) => segment.id === command.segmentId)
  if (!target) {
    throw new Error('Segment not found')
  }
  if (target.locked) {
    throw new Error('Locked segments cannot be replaced')
  }
  if (!command.replacement) {
    const action: PendingAction = {
      id: createId('action'),
      kind: 'candidate-selection',
      mode: 'replace',
      targetSegmentId: command.segmentId,
      title: '选择替换候选',
      description: 'PlanPal 找到几个具体的虚构地点，选择一个后会直接更新拼图。',
      searchQuery: command.searchQuery?.trim() || undefined,
      candidates: createReplacementCandidates(plan, command.segmentId, command.searchQuery),
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
  return touch(plan, {
    segments: plan.segments.map((segment) =>
      segment.id === pending.targetSegmentId ? normalizeSegment({ ...segment, ...candidate.segment }, segment) : segment,
    ),
    serviceSelections: (plan.serviceSelections ?? []).filter((selection) => selection.segmentId !== pending.targetSegmentId),
    pendingAction: undefined,
  })
}

function refreshCandidates(plan: Plan, command: Extract<PlanCommand, { type: 'REFRESH_CANDIDATES' }>) {
  const existing = command.actionId ? plan.pendingAction : undefined
  if (command.actionId && (!existing || existing.kind !== 'candidate-selection' || existing.id !== command.actionId)) {
    throw new Error('Candidate action is no longer active')
  }
  const mode = command.mode ?? (existing?.kind === 'candidate-selection' ? existing.mode : 'replace')
  const targetSegmentId = command.targetSegmentId ?? (existing?.kind === 'candidate-selection' ? existing.targetSegmentId : undefined)
  const afterSegmentId = command.afterSegmentId ?? (existing?.kind === 'candidate-selection' ? existing.afterSegmentId : null)
  const explicitSearchQuery = command.searchQuery?.trim()
  const searchQuery = explicitSearchQuery || (existing?.kind === 'candidate-selection' ? existing.searchQuery : undefined)
  const excluded = explicitSearchQuery
    ? [...(command.excludeCandidateIds ?? [])]
    : [
        ...(existing?.kind === 'candidate-selection' ? existing.excludeCandidateIds ?? existing.candidates.map((candidate) => candidate.id) : []),
        ...(command.excludeCandidateIds ?? []),
      ]
  const candidates = mode === 'add-after'
    ? createAddSegmentCandidates(plan, afterSegmentId, searchQuery, excluded)
    : createReplacementCandidates(plan, requireSegmentId(targetSegmentId), searchQuery, excluded)
  const action: PendingAction = {
    id: existing?.kind === 'candidate-selection' ? existing.id : createId('action'),
    kind: 'candidate-selection',
    mode,
    targetSegmentId,
    afterSegmentId,
    title: mode === 'add-after' ? '给空档加点别的' : '选择替换候选',
    description: mode === 'add-after'
      ? 'PlanPal 找到几个适合塞进空档的具体地点，选择后会直接加入拼图。'
      : 'PlanPal 找到几个具体的替换地点，选择后会直接更新拼图。',
    searchQuery,
    candidates,
    excludeCandidateIds: [...new Set(excluded)],
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
  const results = searchMerchantOfferings({
    merchantId: merchant.id,
    category: command.category ?? segment.serviceCategory,
    query,
    limit: command.limit ?? 6,
  })
  const offerings = results.length
    ? results.map((result) => result.offering)
    : merchant.offerings.slice(0, Math.max(1, Math.min(6, command.limit ?? 6)))
  const action: PendingAction = {
    id: command.actionId && plan.pendingAction?.id === command.actionId ? command.actionId : createId('action'),
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

function createPlanUpdatedEvent(plan: Plan, runId: string, command: PlanCommand): AgentEvent {
  return {
    id: createId('evt'),
    runId,
    planId: plan.id,
    type: 'plan.updated',
    sequence: 1,
    message: summarizeCommand(command),
    payload: { command, version: plan.currentVersion },
    createdAt: nowIso(),
  }
}

export function summarizeCommand(command: PlanCommand) {
  switch (command.type) {
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
