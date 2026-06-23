import type { MerchantOffering, MockRouteEstimate, Plan, PlanSegment, PlanServiceSelection, RouteMode, SandboxOrderReceipt } from './types'
import { getFictionalPoiById, getFictionalPoiByName, type FictionalPoi } from './poiCatalog'

export function buildMockRouteEstimates(segments: PlanSegment[]): MockRouteEstimate[] {
  const routeNodes = segments.filter((segment) => !segment.isTransit && segment.lnglat)
  const estimates: MockRouteEstimate[] = []
  for (let index = 0; index < routeNodes.length - 1; index += 1) {
    const from = routeNodes[index]
    const to = routeNodes[index + 1]
    if (!from?.lnglat || !to?.lnglat) continue
    const distance = distanceKm(from.lnglat, to.lnglat)
    const walkMinutes = Math.max(6, Math.round((distance / 4.4) * 60))
    const transitMinutes = Math.max(12, Math.round((distance / 17) * 60) + 8)
    const taxiMinutes = Math.max(8, Math.round((distance / 24) * 60) + 6)
    const defaultMode: RouteMode = distance <= 0.8 ? 'walk' : distance <= 2.5 ? 'transit' : 'taxi'
    estimates.push({
      id: getMockRouteId(from.id, to.id),
      fromSegmentId: from.id,
      toSegmentId: to.id,
      fromPlace: from.place,
      toPlace: to.place,
      distanceKm: roundDistance(distance),
      defaultMode,
      riskNotes: routeRiskNotes(from, to, distance),
      source: 'mock-route',
      options: [
        {
          mode: 'walk',
          label: '步行',
          durationMinutes: walkMinutes,
          distanceKm: roundDistance(distance),
          priceEstimate: '免费',
          reliability: distance <= 1.2 ? 'steady' : 'variable',
          source: 'mock-route',
        },
        {
          mode: 'transit',
          label: '公交/地铁',
          durationMinutes: transitMinutes,
          distanceKm: roundDistance(distance),
          priceEstimate: 'CNY 2-8',
          reliability: 'variable',
          source: 'mock-route',
        },
        {
          mode: 'taxi',
          label: '打车',
          durationMinutes: taxiMinutes,
          distanceKm: roundDistance(distance),
          priceEstimate: estimateTaxiPrice(distance),
          reliability: distance <= 3 ? 'steady' : 'variable',
          source: 'mock-route',
        },
      ],
    })
  }
  return estimates
}

export function createSandboxOrderReceipt(plan: Plan, input: { createdAt?: string; version?: number } = {}): SandboxOrderReceipt {
  const executable = plan.segments.filter((segment) => !segment.isTransit)
  const headcount = Math.max(1, plan.intent.headcount || 1)
  const merchantRefs = executable.map((segment) => {
    const poi = getFictionalPoiById(segment.poiId) ?? getFictionalPoiByName(segment.place)
    return {
      segmentId: segment.id,
      poiId: poi?.id ?? segment.poiId,
      merchantName: segment.place || poi?.name || '未命名 mock 地点',
      phase: segment.phase,
      time: `${segment.startTime}-${segment.endTime}`,
      reservationMode: poi?.reservationMode ?? 'walk-in',
      source: 'fictional-local-mock-v2' as const,
      serviceCategory: segment.serviceCategory ?? poi?.serviceCategory,
    }
  })
  const items = executable.flatMap((segment) => {
    const poi = getFictionalPoiById(segment.poiId) ?? getFictionalPoiByName(segment.place)
    const selections = (plan.serviceSelections ?? []).filter((selection) => selection.segmentId === segment.id)
    if (selections.length) {
      return selections.map((selection) => receiptItemFromSelection(segment, selection, poi?.name))
    }
    const fallbackOffering = defaultReceiptOffering(segment, poi, headcount)
    return [receiptItemFromOffering(segment, fallbackOffering, {
      id: `${segment.id}_${fallbackOffering.id}`,
      merchantId: fallbackOffering.merchantId,
      merchantName: segment.place || poi?.name || '未命名 mock 地点',
      quantity: defaultOfferingQuantity(headcount, fallbackOffering),
    })]
  })
  const itemTotal = items.reduce((total, item) => total + item.priceCny * item.quantity, 0)
  const budgetTotal = executable.reduce((total, segment) => total + budgetMiddle(segment.budget) * headcount, 0)
  const estimate = Math.max(itemTotal, budgetTotal)
  return {
    receiptId: `sandbox_${plan.id}_v${input.version ?? plan.currentVersion}`,
    planId: plan.id,
    createdAt: input.createdAt ?? plan.updatedAt,
    merchantRefs,
    items,
    totalEstimate: {
      currency: 'CNY',
      low: Math.max(0, Math.round(estimate * 0.85)),
      high: Math.max(0, Math.round(estimate * 1.18)),
    },
    status: 'sandbox_generated',
    disclaimer: '这是 PlanPal 本地 sandbox 模拟确认单，仅用于演示；不代表真实预订、真实下单、真实支付或第三方凭证。',
  }
}

function receiptItemFromSelection(segment: PlanSegment, selection: PlanServiceSelection, merchantName?: string): SandboxOrderReceipt['items'][number] {
  return receiptItemFromOffering(segment, selection.offeringSnapshot, {
    id: selection.id,
    merchantId: selection.merchantId,
    merchantName: segment.place || merchantName || '未命名 mock 地点',
    quantity: selection.quantity,
  })
}

function receiptItemFromOffering(
  segment: PlanSegment,
  offering: MerchantOffering,
  input: {
    id: string
    merchantId: string
    merchantName: string
    quantity: number
  },
): SandboxOrderReceipt['items'][number] {
  return {
    id: input.id,
    segmentId: segment.id,
    offeringId: offering.id,
    merchantId: input.merchantId,
    merchantName: input.merchantName,
    label: offering.title,
    quantity: input.quantity,
    priceCny: offering.priceCny,
    unitPriceCny: offering.priceCny,
    category: offering.category,
    serviceCategory: offering.category,
    scheduledFor: offering.showtime ?? offering.availabilitySlots[0] ?? segment.startTime,
    fulfillment: offering.fulfillment,
  }
}

function defaultReceiptOffering(segment: PlanSegment, poi: FictionalPoi | undefined, headcount: number): MerchantOffering {
  const offering = poi?.offerings.find((item) => item.priceCny > 0) ?? poi?.offerings[0]
  if (offering) return offering
  const fallbackPrice = budgetMiddle(segment.budget)
  return {
    id: `${segment.id}_fallback_offering`,
    merchantId: segment.poiId ?? segment.id,
    category: segment.serviceCategory ?? (segment.phase === 'dining' ? 'dining' : segment.phase === 'drinks' ? 'drinks' : segment.phase === 'activity' ? 'activity' : 'other'),
    title: headcount > 1 ? '模拟到店确认' : '模拟个人到店确认',
    description: '本地 fallback mock 服务项，不代表真实商户项目。',
    priceCny: fallbackPrice,
    unit: '次',
    availabilitySlots: [segment.startTime],
    tags: ['fallback', 'sandbox'],
    fulfillment: 'mock-only',
    refundPolicy: 'sandbox fallback，无真实退款规则。',
    mockSource: 'fictional-local-mock-v2',
  }
}

function defaultOfferingQuantity(headcount: number, offering: MerchantOffering) {
  if (offering.priceCny <= 0 || offering.category === 'hotel') return 1
  if (offering.category === 'movie' || offering.category === 'ticket') return headcount
  if (offering.unit === '组' || offering.unit === '套') return Math.max(1, Math.ceil(headcount / 2))
  return Math.max(1, headcount)
}

export function getMockRouteId(fromSegmentId: string, toSegmentId: string) {
  return `${fromSegmentId}->${toSegmentId}`
}

function routeRiskNotes(from: PlanSegment, to: PlanSegment, distance: number) {
  const notes = ['mock-route estimated']
  if (distance > 2.5) notes.push('距离较长，建议保留打车备选')
  if (!from.lnglat || !to.lnglat) notes.push('坐标不完整')
  if (from.phase === 'dining' || to.phase === 'dining') notes.push('饭点前后建议预留缓冲')
  return notes
}

function budgetMiddle(value: string | undefined) {
  const numbers = value?.match(/\d+/g)?.map((item) => Number.parseInt(item, 10)).filter(Number.isFinite) ?? []
  if (numbers.length >= 2) return Math.round(((numbers[0] ?? 0) + (numbers[1] ?? 0)) / 2)
  return numbers[0] ?? 60
}

function estimateTaxiPrice(distance: number) {
  const low = Math.max(14, Math.round(14 + distance * 2.2))
  const high = Math.max(low + 6, Math.round(low + 8 + distance * 1.6))
  return `CNY ${low}-${high}`
}

function roundDistance(value: number) {
  return Math.round(value * 10) / 10
}

function distanceKm(from: [number, number], to: [number, number]) {
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
