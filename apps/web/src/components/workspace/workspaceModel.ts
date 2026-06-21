import { getFictionalPoiById, getFictionalPoiByName, getPlanRouteChoiceId, reorderPlanSegmentsWithTime, type AgentEvent, type CandidateOption, type CommandResult, type PendingAction, type Plan, type PlanCommand, type PlanSegment, type PlanVariantOption, type PlanVariantSelection, type ReorderPosition, type RouteMode } from '@planpal/domain'
import { isCompleteModelConfig, type StoredModelConfig } from '../../lib/modelConfig'

export type WorkspaceColumnId = 'chat' | 'puzzle' | 'merchant' | 'details' | 'map' | 'trace'
export type MobileWorkspaceColumnId = Exclude<WorkspaceColumnId, 'chat'>
export type WorkspaceRouteMode = RouteMode
export type SelectedRouteModes = Record<string, WorkspaceRouteMode>

export type WorkspaceLayoutState = {
  activeMobileColumn: MobileWorkspaceColumnId
  columns: WorkspaceColumnId[]
}

export type ChatMessage = {
  role: 'user' | 'planpal'
  content: string
  streaming?: boolean
  receipt?: boolean
}

export type AgentProgressItem = {
  id: string
  label: string
  detail: string
  state: 'active' | 'done' | 'error'
}

export type CandidateCardDisplay = {
  badges: string[]
  description: string
  subtitle: string
  placementLabel: string
  reasons: string[]
  title: string
  writeLabel: string
}

export type PlanReceiptDisplay = {
  disclaimer: string
  segments: Array<{
    budget: string
    id: string
    index: number
    line: string
    place: string
    reason: string
    time: string
    title: string
  }>
  statusLabel: string
  text: string
  title: string
  versionLabel: string
}

export type PlanVariantCardDisplay = {
  badges: string[]
  reasons: string[]
  summary: string
  timeline: string[]
  title: string
  writeLabel: string
}

export type VariantTicketDisplay = {
  alternateCount: number
  expandedByDefault: boolean
  selectedVariantId?: string
  subtitle: string
  title: string
  variants: Array<PlanVariantCardDisplay & {
    active: boolean
    id: string
  }>
}

export type PlanSafetyCheckState = 'ok' | 'warning' | 'blocked'

export type PlanSafetyCheck = {
  id: string
  detail: string
  label: string
  state: PlanSafetyCheckState
}

export type PlanExecutionBrief = {
  canConfirm: boolean
  checkSummary: string
  checks: PlanSafetyCheck[]
  complexityLabel: string
  confirmBlockedReason: string
  durationLabel: string
  nodeCountLabel: string
  routeCoverageLabel: string
}

export type MerchantReferenceDisplay = {
  address: string
  booking: string
  confidence: string
  constraints: string[]
  contact: string
  hours: string
  queue: string
  summary: string
  tags: string[]
}

type MerchantReferenceTemplate = Omit<MerchantReferenceDisplay, 'address'>

export type WorkspaceBoardStyle = {
  '--workspace-board-width': string
  '--workspace-column-count': string
}

export type PlanSegmentDisplay = {
  id: string
  segmentId: string
  index: number
  phase: PlanSegment['phase']
  title: string
  place: string
  time: string
  startTime: string
  endTime: string
  durationMinutes: number
  status: string
  reason: string
  budget: string
  notes: string
  poiId?: string
  locked: boolean
  isTransit: boolean
  transportMode: string
  lnglat?: [number, number]
}

export type ItineraryTicketDisplay = {
  budgetLabel: string
  chips: string[]
  durationLabel: string
  indexLabel: string
  lockLabel: string
  notesLabel: string
  phaseLabel: string
  place: string
  primaryActionLabel: string
  reason: string
  statusLabel: string
  time: string
  title: string
}

export type WorkspaceDisplayItem =
  | {
      id: string
      kind: 'segment'
      segment: PlanSegment
    }
  | {
      afterSegmentId: string
      beforeSegmentId?: string
      durationMinutes: number
      id: string
      kind: 'free-slot'
      label: string
      startTime: string
      endTime: string
    }
  | {
      fromSegmentId: string
      toSegmentId: string
      id: string
      kind: 'transit-summary'
      label: string
      durationMinutes: number
    }

export type RouteEstimate = {
  id: string
  fromId: string
  toId: string
  fromPlace: string
  toPlace: string
  from: [number, number]
  to: [number, number]
  distanceKm: number
  defaultMode: WorkspaceRouteMode
  options: Array<{
    mode: WorkspaceRouteMode
    label: string
    durationMinutes: number
    distanceKm: number
    priceEstimate: string
  }>
}

export type RouteLegDisplay = {
  detail: string
  distanceLabel: string
  durationLabel: string
  fromLabel: string
  modeLabel: string
  priceLabel: string
  statusLabel: string
  title: string
  toLabel: string
}

export const workspaceColumnOrder: WorkspaceColumnId[] = ['chat', 'puzzle', 'merchant', 'details', 'map', 'trace']
export const mobileWorkspaceColumns: MobileWorkspaceColumnId[] = ['puzzle', 'merchant', 'details', 'map', 'trace']
export const defaultWorkspaceColumns: WorkspaceColumnId[] = ['chat', 'puzzle']

export const workspaceColumnMeta: Record<WorkspaceColumnId, { title: string; hint: string; mobileLabel: string }> = {
  chat: {
    title: '与 PlanPal 对话',
    hint: '自然语言进入 Agent，不绕过拼图命令',
    mobileLabel: '对话',
  },
  puzzle: {
    title: '拼图',
    hint: '确定性编辑当前计划对象',
    mobileLabel: '拼图',
  },
  merchant: {
    title: '商家',
    hint: '当前选中地点的本地参考信息',
    mobileLabel: '商家',
  },
  details: {
    title: '详情',
    hint: '节点说明、备注和执行状态',
    mobileLabel: '详情',
  },
  map: {
    title: '路线',
    hint: '基于节点坐标的本地路线预览',
    mobileLabel: '路线',
  },
  trace: {
    title: '运行记录',
    hint: 'Agent 事件、版本和确认状态',
    mobileLabel: '记录',
  },
}

export function getDefaultWorkspaceColumns(): WorkspaceColumnId[] {
  return [...defaultWorkspaceColumns]
}

export function getDefaultWorkspaceLayout(): WorkspaceLayoutState {
  return {
    activeMobileColumn: 'puzzle',
    columns: getDefaultWorkspaceColumns(),
  }
}

export function isMobileWorkspaceColumn(column: WorkspaceColumnId): column is MobileWorkspaceColumnId {
  return column !== 'chat'
}

export function isWorkspaceColumnId(value: unknown): value is WorkspaceColumnId {
  return typeof value === 'string' && workspaceColumnOrder.includes(value as WorkspaceColumnId)
}

export function isWorkspaceRouteMode(value: unknown): value is WorkspaceRouteMode {
  return value === 'walk' || value === 'transit' || value === 'taxi'
}

export function normalizeWorkspaceColumns(value: unknown): WorkspaceColumnId[] {
  if (!Array.isArray(value)) return getDefaultWorkspaceColumns()
  const next: WorkspaceColumnId[] = []
  for (const column of value) {
    if (!isWorkspaceColumnId(column) || next.includes(column)) continue
    next.push(column)
  }
  if (!next.includes('puzzle')) {
    const chatIndex = next.indexOf('chat')
    next.splice(chatIndex >= 0 ? chatIndex + 1 : 0, 0, 'puzzle')
  }
  return next.length ? next : getDefaultWorkspaceColumns()
}

export function normalizeWorkspaceLayout(value: unknown): WorkspaceLayoutState {
  if (!value || typeof value !== 'object') return getDefaultWorkspaceLayout()
  const input = value as {
    activeMobileColumn?: unknown
    columns?: unknown
    selectedRouteModes?: unknown
  }
  const columns = normalizeWorkspaceColumns(input.columns)
  const activeMobileColumn = isMobileWorkspaceColumn(input.activeMobileColumn as WorkspaceColumnId)
    && columns.includes(input.activeMobileColumn as WorkspaceColumnId)
    ? input.activeMobileColumn as MobileWorkspaceColumnId
    : 'puzzle'
  return {
    activeMobileColumn,
    columns,
  }
}

export function getClosedWorkspaceColumns(columns: WorkspaceColumnId[]): WorkspaceColumnId[] {
  return workspaceColumnOrder.filter((column) => column !== 'puzzle' && !columns.includes(column))
}

export function addWorkspaceColumn(columns: WorkspaceColumnId[], column: WorkspaceColumnId): WorkspaceColumnId[] {
  return columns.includes(column) ? columns : [...columns, column]
}

export function removeWorkspaceColumn(columns: WorkspaceColumnId[], column: WorkspaceColumnId): WorkspaceColumnId[] {
  if (column === 'puzzle') return columns
  const next = columns.filter((item) => item !== column)
  return next.includes('puzzle') ? next : ['puzzle']
}

export function openMerchantWorkspaceColumn(columns: WorkspaceColumnId[]): WorkspaceColumnId[] {
  if (columns.includes('merchant')) return columns
  const puzzleIndex = columns.indexOf('puzzle')
  const next = [...columns]
  next.splice(puzzleIndex >= 0 ? puzzleIndex + 1 : next.length, 0, 'merchant')
  return next
}

export function moveWorkspaceColumn(
  columns: WorkspaceColumnId[],
  draggingColumn: WorkspaceColumnId | null,
  targetColumn: WorkspaceColumnId,
) {
  if (!draggingColumn || draggingColumn === targetColumn) return columns
  const fromIndex = columns.indexOf(draggingColumn)
  const toIndex = columns.indexOf(targetColumn)
  if (fromIndex < 0 || toIndex < 0) return columns
  const next = [...columns]
  const [moved] = next.splice(fromIndex, 1)
  if (!moved) return columns
  next.splice(toIndex, 0, moved)
  return next
}

export function getWorkspaceBoardStyle(columnCount: number): WorkspaceBoardStyle {
  const safeCount = Math.max(1, Math.min(6, Math.floor(columnCount) || 1))
  const boardWidths: Record<number, string> = {
    1: 'min(620px, calc(100% - 108px))',
    2: 'min(1120px, calc(100% - 108px))',
    3: 'min(1680px, calc(100% - 108px))',
    4: 'min(1680px, calc(100% - 108px))',
    5: 'min(2040px, calc(100% - 108px))',
    6: 'min(2400px, calc(100% - 108px))',
  }

  return {
    '--workspace-board-width': boardWidths[safeCount]!,
    '--workspace-column-count': String(safeCount),
  }
}

export function derivePlanSegmentDisplays(segments: PlanSegment[]): PlanSegmentDisplay[] {
  return segments.map((segment, index) => ({
    id: segment.id,
    segmentId: segment.id,
    index,
    phase: segment.phase,
    title: segment.title,
    place: segment.place || '未命名地点',
    time: formatSegmentTime(segment),
    startTime: segment.startTime,
    endTime: segment.endTime,
    durationMinutes: segment.durationMinutes,
    status: segment.status || '待确认',
    reason: segment.reason || '暂无说明',
    budget: segment.budget || '暂无预算',
    notes: segment.notes || '',
    poiId: segment.poiId,
    locked: Boolean(segment.locked),
    isTransit: Boolean(segment.isTransit),
    transportMode: segment.transportMode || '',
    lnglat: segment.lnglat,
  }))
}

export function deriveItineraryTicketDisplay(segment: PlanSegment | PlanSegmentDisplay, index: number): ItineraryTicketDisplay {
  const phase = phaseLabel(segment.phase)
  const time = 'time' in segment ? segment.time : formatSegmentTime(segment)
  const duration = `${Math.max(0, segment.durationMinutes || 0)} 分钟`
  const budget = segment.budget || '预算待定'
  const status = segment.status || '待确认'
  const locked = Boolean(segment.locked)

  return {
    budgetLabel: budget,
    chips: uniqueCompact([
      phase,
      duration,
      budget,
      locked ? '已锁定' : '',
    ]).slice(0, 4),
    durationLabel: duration,
    indexLabel: String(index + 1).padStart(2, '0'),
    lockLabel: locked ? '已锁定' : '可编辑',
    notesLabel: compactUiText(segment.notes || '暂无备注', 54),
    phaseLabel: phase || '节点',
    place: compactUiText(segment.place || '地点待定', 42),
    primaryActionLabel: locked ? '查看地点' : '换一个',
    reason: compactUiText(segment.reason || '暂无安排理由', 92),
    statusLabel: status,
    time,
    title: compactUiText(segment.title || '未命名安排', 42),
  }
}

export function deriveRouteLegDisplay(
  route: RouteEstimate,
  selectedRouteModes: SelectedRouteModes = {},
): RouteLegDisplay {
  const selectedMode = selectedRouteModes[route.id] ?? route.defaultMode
  const selectedOption = route.options.find((option) => option.mode === selectedMode) ?? route.options[0]!
  const explicit = Boolean(selectedRouteModes[route.id])

  return {
    detail: `${selectedOption.label} · ${selectedOption.durationMinutes} 分钟 · ${route.distanceKm.toFixed(1)} km · ${selectedOption.priceEstimate}`,
    distanceLabel: `${route.distanceKm.toFixed(1)} km`,
    durationLabel: `${selectedOption.durationMinutes} 分钟`,
    fromLabel: compactUiText(route.fromPlace, 24),
    modeLabel: selectedOption.label,
    priceLabel: selectedOption.priceEstimate,
    statusLabel: explicit ? '已选' : '推荐',
    title: `${compactUiText(route.fromPlace, 18)} 到 ${compactUiText(route.toPlace, 18)}`,
    toLabel: compactUiText(route.toPlace, 24),
  }
}

export function deriveWorkspaceDisplayItems(segments: PlanSegment[]): WorkspaceDisplayItem[] {
  const items: WorkspaceDisplayItem[] = []
  const executable = segments.filter((segment) => !segment.isTransit)
  executable.forEach((segment, index) => {
    const next = executable[index + 1]
    items.push({ id: segment.id, kind: 'segment', segment })
    if (!next) return
    const gap = minutesBetween(segment.endTime, next.startTime)
    items.push({
      id: `${segment.id}->${next.id}:transit`,
      kind: 'transit-summary',
      fromSegmentId: segment.id,
      toSegmentId: next.id,
      label: `${segment.place} 到 ${next.place}`,
      durationMinutes: Math.max(8, Math.min(45, Math.round(gap * 0.35))),
    })
    if (gap >= 45) {
      items.push({
        id: `${segment.id}->${next.id}:free-slot`,
        kind: 'free-slot',
        afterSegmentId: segment.id,
        beforeSegmentId: next.id,
        startTime: segment.endTime,
        endTime: next.startTime,
        durationMinutes: gap,
        label: `${formatSlotTime(segment.endTime)}-${formatSlotTime(next.startTime)} 可加点别的`,
      })
    }
  })
  return items
}

export function getSelectedSegmentDisplay(
  displays: PlanSegmentDisplay[],
  selectedSegmentId?: string,
  selectedPlace?: string | null,
) {
  if (selectedSegmentId) {
    const selected = displays.find((display) => display.id === selectedSegmentId)
    if (selected) return selected
  }
  if (selectedPlace) {
    const selected = displays.find((display) => display.place === selectedPlace)
    if (selected) return selected
  }
  return displays.find((display) => !display.isTransit) ?? displays[0]
}

export function reconcileWorkspaceSelection(
  segments: PlanSegment[],
  selectedSegmentId?: string,
  selectedPlace?: string | null,
) {
  const nextSelectedSegmentId = selectedSegmentId && segments.some((segment) => segment.id === selectedSegmentId)
    ? selectedSegmentId
    : undefined
  const nextSelectedPlace = selectedPlace && segments.some((segment) => segment.place === selectedPlace)
    ? selectedPlace
    : null
  return {
    selectedSegmentId: nextSelectedSegmentId,
    selectedPlace: nextSelectedPlace,
  }
}

export function deriveSelectedRouteModes(plan: Pick<Plan, 'routeChoices'> | undefined): SelectedRouteModes {
  const modes: SelectedRouteModes = {}
  for (const choice of plan?.routeChoices ?? []) {
    if (isWorkspaceRouteMode(choice.mode)) modes[choice.id] = choice.mode
  }
  return modes
}
export function buildRouteEstimates(displays: PlanSegmentDisplay[]): RouteEstimate[] {
  const routeNodes = displays.filter((display) => !display.isTransit && display.lnglat)
  const estimates: RouteEstimate[] = []
  for (let index = 0; index < routeNodes.length - 1; index += 1) {
    const from = routeNodes[index]
    const to = routeNodes[index + 1]
    if (!from?.lnglat || !to?.lnglat) continue
    const distance = distanceKm(from.lnglat, to.lnglat)
    const walkMinutes = Math.max(6, Math.round((distance / 4.5) * 60))
    const transitMinutes = Math.max(12, Math.round((distance / 18) * 60) + 8)
    const taxiMinutes = Math.max(8, Math.round((distance / 24) * 60) + 6)
    const defaultMode: WorkspaceRouteMode = distance <= 0.8 ? 'walk' : distance <= 2.5 ? 'transit' : 'taxi'
    estimates.push({
      id: getPlanRouteChoiceId(from.id, to.id),
      fromId: from.id,
      toId: to.id,
      fromPlace: from.place,
      toPlace: to.place,
      from: from.lnglat,
      to: to.lnglat,
      distanceKm: distance,
      defaultMode,
      options: [
        {
          mode: 'walk',
          label: '步行',
          durationMinutes: walkMinutes,
          distanceKm: distance,
          priceEstimate: '免费',
        },
        {
          mode: 'transit',
          label: '公交/地铁',
          durationMinutes: transitMinutes,
          distanceKm: distance,
          priceEstimate: 'CNY 2-8',
        },
        {
          mode: 'taxi',
          label: '打车',
          durationMinutes: taxiMinutes,
          distanceKm: distance,
          priceEstimate: estimateTaxiPrice(distance),
        },
      ],
    })
  }
  return estimates
}

export function distanceKm(from: [number, number], to: [number, number]) {
  const rad = Math.PI / 180
  const earthKm = 6371
  const dLat = (to[1] - from[1]) * rad
  const dLng = (to[0] - from[0]) * rad
  const lat1 = from[1] * rad
  const lat2 = to[1] * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earthKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function deriveCandidateCardDisplay(
  action: Extract<PendingAction, { kind: 'candidate-selection' }>,
  candidate: CandidateOption,
  plan?: Plan,
): CandidateCardDisplay {
  const segment = candidate.segment
  const target = action.targetSegmentId ? plan?.segments.find((item) => item.id === action.targetSegmentId) : undefined
  const effectiveTime = segmentTimeLabel(segment) || (target ? segmentTimeLabel(target) : '')
  return {
    title: candidate.label,
    subtitle: segment.title || phaseLabel(segment.phase ?? target?.phase) || '备选节点',
    description: candidate.description,
    placementLabel: deriveCandidatePlacementLabel(action, plan),
    writeLabel: action.mode === 'add-after' ? '选中后新增到这个空档' : '选中后替换当前节点',
    badges: uniqueCompact([
      `匹配 ${scorePercent(candidate.score)}`,
      phaseLabel(segment.phase ?? target?.phase),
      effectiveTime,
      segment.budget ?? target?.budget,
    ]),
    reasons: candidate.reasons.slice(0, 3),
  }
}

export function derivePlanVariantCardDisplay(variant: PlanVariantOption): PlanVariantCardDisplay {
  return {
    title: variant.title,
    summary: variant.summary,
    writeLabel: '选中后写入拼图主轴',
    badges: uniqueCompact([
      `匹配 ${scorePercent(variant.score)}`,
      `${variant.segments.filter((segment) => !segment.isTransit).length} 个节点`,
      ...variant.tags.slice(0, 2),
    ]),
    reasons: variant.reasons.slice(0, 3),
    timeline: variant.segments
      .filter((segment) => !segment.isTransit)
      .slice(0, 4)
      .map((segment) => `${formatSegmentTime(segment)} ${segment.title}`),
  }
}

export function deriveVariantTicketDisplay(selection: PlanVariantSelection): VariantTicketDisplay {
  const selectedVariant = selection.variants.find((variant) => variant.id === selection.selectedVariantId)
  const alternateCount = selection.selectedVariantId
    ? selection.variants.filter((variant) => variant.id !== selection.selectedVariantId).length
    : selection.variants.length

  return {
    alternateCount,
    expandedByDefault: !selection.selectedVariantId,
    selectedVariantId: selection.selectedVariantId,
    title: selectedVariant ? `当前：${selectedVariant.title}` : selection.title,
    subtitle: selectedVariant
      ? `另外 ${alternateCount} 个可切换，切换会替换当前拼图主轴`
      : selection.description,
    variants: selection.variants.map((variant) => ({
      ...derivePlanVariantCardDisplay(variant),
      active: variant.id === selection.selectedVariantId,
      id: variant.id,
    })),
  }
}

export function derivePlanExecutionBrief(plan: Plan): PlanExecutionBrief {
  const executable = plan.segments.filter((segment) => !segment.isTransit)
  const routePairCount = Math.max(0, executable.length - 1)
  const validRouteChoiceIds = new Set(plan.routeChoices?.map((choice) => choice.id) ?? [])
  const routeChoiceCount = executable.slice(0, -1).filter((segment, index) => {
    const next = executable[index + 1]
    return next ? validRouteChoiceIds.has(getPlanRouteChoiceId(segment.id, next.id)) : false
  }).length
  const missingCoordinates = executable.filter((segment) => !segment.lnglat)
  const unlocked = executable.filter((segment) => !segment.locked)
  const missingBudget = executable.filter((segment) => !segment.budget)
  const hasTimeWarnings = hasNonChronologicalSegments(executable)
  const blockedReason = plan.status === 'confirmed'
    ? '计划已确认'
    : plan.pendingAction
      ? `先处理待办：${plan.pendingAction.title}`
      : executable.length === 0
        ? '至少需要 1 个可执行节点'
        : ''
  const checks: PlanSafetyCheck[] = [
    {
      id: 'main-thread',
      label: '任务主轴',
      state: executable.length > 0 ? 'ok' : 'blocked',
      detail: executable.length > 0 ? `${executable.length} 个可执行节点已就绪` : '还没有可执行节点',
    },
    {
      id: 'pending-action',
      label: '待办卡片',
      state: plan.pendingAction ? 'blocked' : 'ok',
      detail: plan.pendingAction ? `需要先选择：${plan.pendingAction.title}` : '没有未处理选择卡片',
    },
    {
      id: 'time-order',
      label: '时间顺序',
      state: hasTimeWarnings ? 'warning' : 'ok',
      detail: hasTimeWarnings ? '节点顺序与时间存在不一致，确认前建议检查' : '节点时间可按当前顺序执行',
    },
    {
      id: 'route-reference',
      label: '路线参考',
      state: missingCoordinates.length > 0 ? 'warning' : 'ok',
      detail: missingCoordinates.length > 0
        ? `${missingCoordinates.length} 个节点缺少坐标，路线只能部分预览`
        : routePairCount > 0
          ? `${routeChoiceCount}/${routePairCount} 段路线已选择，未选择时使用推荐方式`
          : '单节点计划不需要路线选择',
    },
    {
      id: 'edit-safety',
      label: '编辑防护',
      state: unlocked.length > 0 ? 'warning' : 'ok',
      detail: unlocked.length > 0 ? `${unlocked.length} 个节点仍可继续编辑` : '所有可执行节点已锁定',
    },
    {
      id: 'budget',
      label: '预算线索',
      state: missingBudget.length > 0 ? 'warning' : 'ok',
      detail: missingBudget.length > 0 ? `${missingBudget.length} 个节点缺少预算` : '每个节点都有预算参考',
    },
  ]
  const warningCount = checks.filter((check) => check.state === 'warning').length
  const blockedCount = checks.filter((check) => check.state === 'blocked').length

  return {
    canConfirm: !blockedReason,
    checkSummary: blockedCount > 0
      ? `${blockedCount} 项阻塞，${warningCount} 项提醒`
      : warningCount > 0
        ? `${warningCount} 项确认前提醒`
        : '检查通过',
    checks,
    complexityLabel: deriveComplexityLabel(executable, plan.pendingAction),
    confirmBlockedReason: blockedReason,
    durationLabel: formatPlanDuration(executable),
    nodeCountLabel: `${executable.length} 个执行节点`,
    routeCoverageLabel: routePairCount > 0 ? `${routeChoiceCount}/${routePairCount} 段路线已选择` : '无需路线选择',
  }
}

export function deriveMerchantReference(display: PlanSegmentDisplay): MerchantReferenceDisplay {
  const poi = getFictionalPoiById(display.poiId) ?? getFictionalPoiByName(display.place)
  const coordinate = display.lnglat ? `坐标 ${display.lnglat[0].toFixed(4)}, ${display.lnglat[1].toFixed(4)}` : '坐标待补充'
  if (poi) {
    return {
      address: `${poi.address} · ${coordinate}`,
      booking: poi.booking,
      confidence: poi.confidence,
      constraints: poi.tags,
      contact: poi.contact,
      hours: `${display.time} 计划到访 · ${poi.hours}`,
      queue: poi.queue,
      summary: display.reason || poi.description,
      tags: uniqueCompact([phaseLabel(display.phase), ...poi.tags, display.budget]),
    }
  }
  const base = merchantReferenceByPhase[display.phase] ?? merchantReferenceByPhase.activity
  return {
    ...base,
    address: `${display.place} · ${coordinate}`,
    hours: `${display.time} 计划到访 · ${base.hours}`,
    summary: display.reason || base.summary,
    tags: uniqueCompact([phaseLabel(display.phase), ...base.tags, display.budget]),
  }
}

const merchantReferenceByPhase: Record<PlanSegment['phase'], MerchantReferenceTemplate> = {
  activity: {
    booking: '建议提前查看场次和入场规则',
    confidence: 'Mock 可信度 82%',
    constraints: ['天气影响低', '适合临时调整', '需要确认场次'],
    contact: '官方小程序 / 本地电话待接入',
    hours: '活动场次以官方渠道为准',
    queue: '热门时段可能排队',
    summary: '适合低负担开场，能给后续安排留出调整空间。',
    tags: ['室内优先', '低体力负担'],
  },
  dining: {
    booking: '建议提前 30-60 分钟确认等位',
    confidence: 'Mock 可信度 78%',
    constraints: ['饭点排队风险', '预算需现场确认', '多人同行建议预约'],
    contact: '点评/地图电话待接入',
    hours: '晚餐时段通常可用',
    queue: '饭点建议预留 15-25 分钟',
    summary: '适合作为计划中段补给点，位置和排队确定性优先。',
    tags: ['用餐', '排队风险'],
  },
  drinks: {
    booking: '如需包间或露台建议提前确认',
    confidence: 'Mock 可信度 74%',
    constraints: ['噪音水平需现场确认', '未成年人不适用', '末班交通需检查'],
    contact: '门店电话待接入',
    hours: '夜间营业以门店为准',
    queue: '低峰通常不用排队',
    summary: '适合做可取消的收尾节点，不会强制拉长主线。',
    tags: ['收尾', '可取消'],
  },
  leisure: {
    booking: '多数轻量停靠点无需预约',
    confidence: 'Mock 可信度 80%',
    constraints: ['适合填补空档', '消费可控', '可随时跳过'],
    contact: '暂无联系电话',
    hours: '按当前空档临时安排',
    queue: '现场情况以实际为准',
    summary: '用于吸收时间误差，降低复杂计划的失败概率。',
    tags: ['机动', '缓冲'],
  },
  transit: {
    booking: '无需预约',
    confidence: 'Mock 可信度 68%',
    constraints: ['非实时路况', '不代表真实导航', '需要出发前复核'],
    contact: '地图服务待接入',
    hours: '按路线段估算',
    queue: '交通时间可能波动',
    summary: '路线仅作为本地估算，不代表实时导航。',
    tags: ['交通', '参考'],
  },
}

function deriveCandidatePlacementLabel(
  action: Extract<PendingAction, { kind: 'candidate-selection' }>,
  plan: Plan | undefined,
) {
  if (action.mode === 'replace') {
    const target = action.targetSegmentId ? plan?.segments.find((segment) => segment.id === action.targetSegmentId) : undefined
    return target ? `替换「${target.title}」` : '替换当前节点'
  }
  const after = action.afterSegmentId ? plan?.segments.find((segment) => segment.id === action.afterSegmentId) : undefined
  if (!after || !plan) return '插入到当前空档'
  const afterIndex = plan.segments.findIndex((segment) => segment.id === after.id)
  const next = plan.segments.slice(afterIndex + 1).find((segment) => !segment.isTransit)
  if (next) return `插入在「${after.title}」之后、「${next.title}」之前`
  return `插入在「${after.title}」之后`
}

function scorePercent(score: number) {
  const value = Number.isFinite(score) ? score : 0
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function phaseLabel(phase: PlanSegment['phase'] | undefined) {
  if (!phase) return ''
  const labels: Record<PlanSegment['phase'], string> = {
    activity: '活动',
    dining: '用餐',
    drinks: '收尾',
    leisure: '机动',
    transit: '交通',
  }
  return labels[phase]
}

function segmentTimeLabel(segment: Partial<PlanSegment>) {
  if (!segment.startTime && !segment.endTime) return ''
  if (!segment.endTime || segment.startTime === segment.endTime) return segment.startTime ?? ''
  return `${segment.startTime}-${segment.endTime}`
}

function uniqueCompact(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
}

export function derivePlanReceiptDisplay(plan: Plan): PlanReceiptDisplay {
  const segments = plan.segments
    .filter((segment) => !segment.isTransit)
    .map((segment, index) => {
      const time = formatSegmentTime(segment)
      return {
        budget: segment.budget || '预算待定',
        id: segment.id,
        index: index + 1,
        line: `${index + 1}. ${time} ${segment.title} @ ${segment.place}`,
        place: segment.place || '地点待定',
        reason: segment.reason || '暂无说明',
        time,
        title: segment.title,
      }
    })
  const statusLabel = plan.status === 'confirmed' ? '已确认' : '未确认'
  const versionLabel = `Version ${plan.currentVersion}`
  const disclaimer = '这是 PlanPal 本地确认摘要，不代表真实预订、下单或第三方凭证。'
  const text = [
    `PlanPal 确认摘要：${plan.title}`,
    `${statusLabel} · ${versionLabel}`,
    disclaimer,
    '',
    ...segments.flatMap((segment) => [
      segment.line,
      `地点：${segment.place}`,
      `预算：${segment.budget}`,
      `理由：${segment.reason}`,
      '',
    ]),
  ].join('\n').trim()

  return {
    disclaimer,
    segments,
    statusLabel,
    text,
    title: plan.title,
    versionLabel,
  }
}

export function buildSegmentReorderCommand(
  segmentId: string,
  anchorSegmentId: string | null,
  position: ReorderPosition,
): PlanCommand {
  return {
    type: 'REORDER_SEGMENT',
    source: 'puzzle',
    segmentId,
    anchorSegmentId,
    position,
  }
}

export function buildCandidateCommand(actionId: string, candidate: CandidateOption): PlanCommand {
  return {
    type: 'CHOOSE_CANDIDATE',
    source: 'action-card',
    actionId,
    candidateId: candidate.id,
  }
}

export function buildCandidateRefreshCommand(input: {
  actionId?: string
  afterSegmentId?: string | null
  excludeCandidateIds?: string[]
  mode?: 'replace' | 'add-after'
  searchQuery?: string
  targetSegmentId?: string
}): PlanCommand {
  return {
    type: 'REFRESH_CANDIDATES',
    source: 'action-card',
    actionId: input.actionId,
    mode: input.mode,
    targetSegmentId: input.targetSegmentId,
    afterSegmentId: input.afterSegmentId,
    searchQuery: input.searchQuery,
    excludeCandidateIds: input.excludeCandidateIds,
  }
}

export function getCandidateRefreshExcludeIds(
  action: Extract<PendingAction, { kind: 'candidate-selection' }>,
  searchQuery?: string,
) {
  return searchQuery?.trim() ? [] : action.candidates.map((candidate) => candidate.id)
}

export function buildPlanVariantCommand(actionId: string, variant: PlanVariantOption): PlanCommand {
  return {
    type: 'CHOOSE_PLAN_VARIANT',
    source: 'action-card',
    actionId,
    variantId: variant.id,
  }
}

export function buildDismissPendingActionCommand(actionId: string): PlanCommand {
  return {
    type: 'DISMISS_PENDING_ACTION',
    source: 'action-card',
    actionId,
  }
}

export function buildRouteChoiceCommand(route: RouteEstimate, mode: WorkspaceRouteMode): PlanCommand {
  return {
    type: 'SET_ROUTE_CHOICE',
    source: 'puzzle',
    fromSegmentId: route.fromId,
    toSegmentId: route.toId,
    mode,
  }
}

export function buildClearRouteChoiceCommand(route: RouteEstimate): PlanCommand {
  return {
    type: 'CLEAR_ROUTE_CHOICE',
    source: 'puzzle',
    fromSegmentId: route.fromId,
    toSegmentId: route.toId,
  }
}

export function reorderSegmentsForCommand(segments: PlanSegment[], command: PlanCommand) {
  if (command.type !== 'REORDER_SEGMENT') return segments
  try {
    return reorderPlanSegmentsWithTime(segments, command.segmentId, command.anchorSegmentId, command.position)
  } catch {
    return segments
  }
}

export function getSegmentActionState(segment: PlanSegment) {
  const locked = Boolean(segment.locked)
  const transit = Boolean(segment.isTransit)
  return {
    canReorder: !locked && !transit,
    canDelete: !locked,
    canReplace: !locked,
    canRewrite: !locked,
    locked,
  }
}

export function getCandidateSelectionMode(pendingActionRunId: string | null) {
  return pendingActionRunId ? 'resume' : 'command'
}

export function canSendAgentChat(config: StoredModelConfig | null, draft: string, isStreaming = false) {
  return Boolean(isCompleteModelConfig(config) && draft.trim() && !isStreaming)
}

export function getAgentChatDisabledReason(
  config: StoredModelConfig | null,
  draft: string,
  isStreaming = false,
) {
  if (isStreaming) return 'Agent 正在处理上一条消息'
  if (!isCompleteModelConfig(config)) return '请先完整填写并保存模型配置'
  if (!draft.trim()) return '请输入要发送给 Agent 的内容'
  return ''
}

export function getChatExecutionPathLabel(config: StoredModelConfig | null, draft: string) {
  if (!isCompleteModelConfig(config)) return '离线 fallback'
  const normalized = draft.trim().toLowerCase()
  if (!normalized) return '等待输入'
  if (containsAny(normalized, ['换', '替换', 'replace', 'near', '近一点', '近点', '删除', '删掉', '去掉', '不要', 'remove', 'delete', '确认', '下单', '预订', 'confirm', '轻松', '别太赶', '安静', '改成', 'rewrite', '调整'])) {
    return '模型意图理解 + 确定性拼图命令'
  }
  return '模型回答'
}

export function deriveAgentProgressItems(events: AgentEvent[]): AgentProgressItem[] {
  const runId = latestRunId(events)
  if (!runId) return []
  const runEvents = events.filter((event) => event.runId === runId && event.type !== 'agent.message.delta')
  return runEvents
    .map(progressItemFromEvent)
    .filter((item): item is AgentProgressItem => Boolean(item))
    .slice(-5)
}

function latestRunId(events: AgentEvent[]) {
  return [...events].reverse().find((event) => event.runId)?.runId ?? ''
}

function progressItemFromEvent(event: AgentEvent): AgentProgressItem | null {
  const phase = readPayloadString(event, 'phase')
  switch (event.type) {
    case 'agent.started':
      return {
        id: event.id,
        label: '接收请求',
        detail: '整理当前计划和选中节点上下文',
        state: 'done',
      }
    case 'agent.model.started':
      return {
        id: event.id,
        label: phase === 'answer' ? '生成回答' : phase === 'intent' ? '理解意图' : '调用模型',
        detail: event.message,
        state: 'active',
      }
    case 'agent.model.finished':
      return {
        id: event.id,
        label: phase === 'answer' ? '回答已生成' : phase === 'intent' ? '意图已理解' : '模型已返回',
        detail: event.message,
        state: 'done',
      }
    case 'agent.model.error':
      return {
        id: event.id,
        label: '模型调用失败',
        detail: event.message,
        state: 'error',
      }
    case 'tool.called':
      return {
        id: event.id,
        label: '查找候选',
        detail: event.message,
        state: 'active',
      }
    case 'tool.result':
      return {
        id: event.id,
        label: '候选已准备',
        detail: event.message,
        state: 'done',
      }
    case 'plan.patch.proposed':
      return {
        id: event.id,
        label: '拼图命令已准备',
        detail: event.message,
        state: 'done',
      }
    case 'action.required':
      return {
        id: event.id,
        label: '等待选择',
        detail: event.message,
        state: 'active',
      }
    case 'plan.updated':
      return {
        id: event.id,
        label: '计划已更新',
        detail: event.message,
        state: 'done',
      }
    case 'agent.finished':
      return {
        id: event.id,
        label: '完成',
        detail: event.message,
        state: 'done',
      }
    case 'agent.error':
      return {
        id: event.id,
        label: '运行失败',
        detail: event.message,
        state: 'error',
      }
    default:
      return null
  }
}

function readPayloadString(event: AgentEvent, key: string) {
  const payload = event.payload
  if (!payload || typeof payload !== 'object' || !(key in payload)) return ''
  const value = (payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

export function assistantDeltaFromAgentEvent(event: AgentEvent) {
  if (event.type !== 'agent.message.delta') return ''
  const payload = event.payload
  if (payload && typeof payload === 'object' && 'delta' in payload && typeof payload.delta === 'string') {
    return payload.delta
  }
  return event.message || ''
}

export function appendAssistantDeltaMessage(messages: ChatMessage[], delta: string): ChatMessage[] {
  if (!delta) return messages
  const last = messages.at(-1)
  if (last?.role === 'planpal' && last.streaming) {
    return [...messages.slice(0, -1), { ...last, content: `${last.content}${delta}` }]
  }
  return [...messages, { role: 'planpal', content: delta, streaming: true }]
}

export function finalizeAssistantStreamingMessage(messages: ChatMessage[], content: string): ChatMessage[] {
  const last = messages.at(-1)
  if (last?.role === 'planpal' && last.streaming) {
    return [...messages.slice(0, -1), { role: 'planpal', content }]
  }
  return [...messages, { role: 'planpal', content }]
}
export function chatMessageFromAgentEvent(event: AgentEvent): ChatMessage | null {
  if (event.type === 'agent.finished') return { role: 'planpal', content: event.message }
  if (event.type === 'agent.error') {
    return {
      role: 'planpal',
      content: `Agent 运行失败：${event.message}`,
    }
  }
  return null
}

export function chatMessageFromAgentFailure(scope: 'run' | 'resume', error: unknown): ChatMessage {
  return {
    role: 'planpal',
    content: `${scope === 'resume' ? 'Agent 继续执行失败' : 'Agent 调用失败'}：${redactUiError(error)}`,
  }
}

export function shouldClearActiveRunForAgentEvent(event: AgentEvent) {
  return event.type === 'plan.updated' || event.type === 'agent.finished' || event.type === 'agent.error'
}

export function shouldRefreshPlanForAgentEvent(event: AgentEvent) {
  return event.type === 'action.required' || event.type === 'plan.updated' || event.type === 'agent.error'
}

export function pendingActionFromAgentEvent(event: AgentEvent): PendingAction | undefined {
  if (event.type !== 'action.required') return undefined
  if (!event.payload || typeof event.payload !== 'object' || !('action' in event.payload)) return undefined
  const action = (event.payload as { action?: unknown }).action
  return isPendingAction(action) ? action : undefined
}

export function shouldOpenChatForAgentEvent(event: AgentEvent) {
  return Boolean(event.type === 'agent.message.delta' || pendingActionFromAgentEvent(event) || chatMessageFromAgentEvent(event))
}

export function chatMessageFromCommandResult(command: PlanCommand, result: CommandResult): ChatMessage | null {
  switch (command.type) {
    case 'CHOOSE_PLAN_VARIANT':
      return commandReceipt(result.version, '方案已应用')
    case 'REORDER_SEGMENT':
      return commandReceipt(result.version, '顺序和时间已更新')
    case 'REPLACE_SEGMENT':
      if (command.replacement) return commandReceipt(result.version, '节点已替换')
      return {
        role: 'planpal',
        content: candidateActionReceipt(result.plan.pendingAction, '候选已准备'),
      }
    case 'REFRESH_CANDIDATES':
      return {
        role: 'planpal',
        content: candidateActionReceipt(
          result.plan.pendingAction,
          command.mode === 'add-after' ? '空档候选已准备' : '候选已刷新',
          command.searchQuery ?? (result.plan.pendingAction?.kind === 'candidate-selection'
            ? result.plan.pendingAction.searchQuery
            : undefined),
        ),
      }
    case 'CHOOSE_CANDIDATE':
      return commandReceipt(result.version, '候选已应用')
    case 'CONFIRM_PLAN':
      return commandReceipt(result.version, '计划已确认')
    case 'DISMISS_PENDING_ACTION':
      return commandReceipt(result.version, '选择已取消')
    case 'SET_ROUTE_CHOICE':
      return commandReceipt(result.version, '路线已更新')
    case 'CLEAR_ROUTE_CHOICE':
      return commandReceipt(result.version, '路线已恢复推荐')
    default:
      return null
  }
}

function commandReceipt(version: number, label: string): ChatMessage {
  return {
    role: 'planpal',
    content: `V${version} · ${label}`,
    receipt: true,
  }
}

export function chatMessageFromCommandError(command: PlanCommand, error: unknown): ChatMessage {
  return {
    role: 'planpal',
    content: `${commandFailurePrefix(command)}：${redactUiError(error)}`,
  }
}

export function shouldOpenChatForCommandResult(command: PlanCommand, result: CommandResult) {
  if (!result.plan.pendingAction) return false
  return command.type === 'REPLACE_SEGMENT' || command.type === 'REFRESH_CANDIDATES'
}

export function initialChatMessagesFromPlanEvents(_plan: Plan, _events: AgentEvent[]): ChatMessage[] {
  return []
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}


function commandFailurePrefix(command: PlanCommand) {
  switch (command.type) {
    case 'CHOOSE_CANDIDATE':
      return '候选应用失败'
    case 'CHOOSE_PLAN_VARIANT':
      return '方案选择失败'
    case 'REFRESH_CANDIDATES':
    case 'REPLACE_SEGMENT':
      return '候选生成失败'
    case 'REORDER_SEGMENT':
      return '拼图重排失败'
    case 'CONFIRM_PLAN':
      return '确认计划失败'
    case 'DISMISS_PENDING_ACTION':
      return '取消选择失败'
    case 'SET_ROUTE_CHOICE':
    case 'CLEAR_ROUTE_CHOICE':
      return '路线选择失败'
    default:
      return '拼图操作失败'
  }
}

function redactUiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '请求失败')
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
}

function isPendingAction(value: unknown): value is PendingAction {
  if (!value || typeof value !== 'object') return false
  const kind = (value as { kind?: unknown }).kind
  if (kind === 'candidate-selection') {
    return Array.isArray((value as { candidates?: unknown }).candidates)
  }
  if (kind === 'plan-variant-selection') {
    return Array.isArray((value as { variants?: unknown }).variants)
  }
  if (kind === 'clarification') {
    return Array.isArray((value as { requiredFields?: unknown }).requiredFields)
  }
  return false
}

function candidateActionReceipt(pendingAction: Plan['pendingAction'], fallback: string, searchQuery?: string) {
  if (!pendingAction || pendingAction.kind !== 'candidate-selection') return `${fallback} · 待选择`
  const query = searchQuery?.trim()
  const prefix = query ? `按“${truncateText(query, 18)}”筛选` : fallback
  return `${prefix} · ${pendingAction.candidates.length} 个候选`
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

export function compactUiText(value: string, maxLength: number) {
  const text = value.trim()
  if (text.length <= maxLength) return text
  if (maxLength <= 1) return '…'
  return `${text.slice(0, maxLength - 1)}…`
}

function formatSegmentTime(segment: PlanSegment) {
  if (!segment.startTime && !segment.endTime) return '时间待定'
  if (!segment.endTime || segment.startTime === segment.endTime) return segment.startTime
  return `${segment.startTime}-${segment.endTime}`
}

function deriveComplexityLabel(segments: PlanSegment[], pendingAction: Plan['pendingAction']) {
  if (pendingAction) return '等待用户决策'
  if (segments.length >= 5) return '复杂多节点任务'
  if (segments.length >= 3) return '标准多节点任务'
  if (segments.length >= 1) return '轻量任务'
  return '空计划'
}

function formatPlanDuration(segments: PlanSegment[]) {
  if (segments.length === 0) return '0 分钟'
  const activeMinutes = segments.reduce((total, segment) => total + Math.max(0, segment.durationMinutes || 0), 0)
  const first = segments[0]
  const last = segments.at(-1)
  const rangeMinutes = first && last ? toMinutes(last.endTime) - toMinutes(first.startTime) : 0
  if (rangeMinutes > 0) return `${formatDuration(rangeMinutes)}窗口 · ${formatDuration(activeMinutes)}执行`
  return `${formatDuration(activeMinutes)}执行`
}

function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60
  if (hours === 0) return `${mins} 分钟`
  if (mins === 0) return `${hours} 小时`
  return `${hours} 小时 ${mins} 分钟`
}

function hasNonChronologicalSegments(segments: PlanSegment[]) {
  return segments.some((segment, index) => {
    const next = segments[index + 1]
    return next ? toMinutes(next.startTime) < toMinutes(segment.endTime) : false
  })
}

function estimateTaxiPrice(distance: number) {
  const low = Math.max(14, Math.round(14 + distance * 2.2))
  const high = Math.max(low + 6, Math.round(low + 8 + distance * 1.6))
  return `CNY ${low}-${high}`
}

function minutesBetween(start: string, end: string) {
  return Math.max(0, toMinutes(end) - toMinutes(start))
}

function toMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10)
}

function formatSlotTime(value: string) {
  return value || '待定'
}








