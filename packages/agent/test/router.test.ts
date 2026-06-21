import { describe, expect, it } from 'vitest'
import { createPlanFromPrompt } from '@planpal/domain'
import { parseModelTurnIntent, routeModelTurnIntent, routeNaturalLanguageTurn } from '../src'

describe('agent natural language router', () => {
  it('routes nearby dinner replacement to candidate search', () => {
    const plan = createPlanFromPrompt('晚上两个人附近吃饭')
    const route = routeNaturalLanguageTurn(plan, '把晚饭换近一点')
    expect(route.kind).toBe('candidate-search')
    if (route.kind === 'candidate-search') {
      const segment = plan.segments.find((item) => item.id === route.segmentId)
      expect(segment?.phase).toBe('dining')
    }
  })

  it('routes hotpot requests to dinner candidate search even without replace wording', () => {
    const plan = createPlanFromPrompt('晚上两个人附近吃饭')
    const route = routeNaturalLanguageTurn(plan, '晚上想吃火锅啊')
    expect(route.kind).toBe('candidate-search')
    if (route.kind === 'candidate-search') {
      const segment = plan.segments.find((item) => item.id === route.segmentId)
      expect(segment?.phase).toBe('dining')
      expect(route.query).toBe('晚上想吃火锅啊')
    }
  })

  it('routes confirmation to deterministic command', () => {
    const plan = createPlanFromPrompt('下午两个人逛逛')
    const route = routeNaturalLanguageTurn(plan, '确认这个计划')
    expect(route.kind).toBe('command')
    if (route.kind === 'command') {
      expect(route.command.type).toBe('CONFIRM_PLAN')
    }
  })

  it('validates model intent JSON before turning it into commands', () => {
    const plan = createPlanFromPrompt('晚上两个人附近吃饭')
    const dining = plan.segments.find((segment) => segment.phase === 'dining')!
    const intent = parseModelTurnIntent(JSON.stringify({
      action: 'replace',
      targetPhase: 'dining',
      query: '换近一点',
      reason: 'user wants nearby dinner',
    }))

    expect(intent).toEqual({
      action: 'replace',
      targetPhase: 'dining',
      query: '换近一点',
      reason: 'user wants nearby dinner',
      answer: undefined,
      targetSegmentId: undefined,
    })

    const route = routeModelTurnIntent(plan, '把晚饭换近一点', intent!)
    expect(route.kind).toBe('candidate-search')
    if (route.kind === 'candidate-search') {
      expect(route.segmentId).toBe(dining.id)
      expect(route.query).toBe('换近一点')
    }
  })
})
