export type QuickPlanState = {
  endHour: number
  extra: string
  headcount: string
  locationScope: 'nearby' | 'business' | 'flexible'
  pace: 'relaxed' | 'normal' | 'compact'
  startHour: number
  topic: string
}

const locationPrompts: Record<QuickPlanState['locationScope'], string> = {
  nearby: '优先附近少绕路',
  business: '按我补充的商圈或地点范围安排',
  flexible: '找不到合适候选时可以扩大范围',
}

const pacePrompts: Record<QuickPlanState['pace'], string> = {
  relaxed: '节奏轻松，少排队少折腾',
  normal: '时间利用和舒适度平衡',
  compact: '可以更紧凑，多安排一个点',
}

export function buildQuickPlanPrompt(state: QuickPlanState) {
  const topic = state.topic.trim() || '安排吃饭和轻活动'
  return [
    `今天 ${formatHourLabel(state.startHour)} 到 ${formatHourLabel(state.endHour)}`,
    state.headcount ? `${state.headcount} 个人` : '',
    topic,
    locationPrompts[state.locationScope],
    pacePrompts[state.pace],
    state.extra.trim(),
  ]
    .filter(Boolean)
    .join('，') + '。'
}

export function formatHourLabel(hour: number) {
  const safe = Math.max(0, Math.min(24, hour))
  const whole = Math.floor(safe)
  const minutes = Math.round((safe - whole) * 60)
  return `${whole.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}
