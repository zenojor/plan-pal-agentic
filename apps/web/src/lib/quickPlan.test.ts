import { describe, expect, it } from 'vitest'
import { buildQuickPlanPrompt, formatHourLabel } from './quickPlan'

describe('quick plan helpers', () => {
  it('formats quick plan prompt from structured controls', () => {
    expect(formatHourLabel(14.5)).toBe('14:30')
    expect(buildQuickPlanPrompt({
      startHour: 14,
      endHour: 21.5,
      headcount: '2',
      topic: '附近轻松玩到晚上，晚饭别太远',
      locationScope: 'nearby',
      pace: 'relaxed',
      extra: '室内优先',
    })).toBe('今天 14:00 到 21:30，2 个人，附近轻松玩到晚上，晚饭别太远，优先附近少绕路，节奏轻松，少排队少折腾，室内优先。')
  })
})
