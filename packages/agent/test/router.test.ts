import { describe, expect, it } from 'vitest'
import { createPlanFromPrompt } from '@planpal/domain'
import { parseModelTurnIntent, routeModelTurnIntent, routeNaturalLanguageTurn } from '../src'

describe('agent natural language router', () => {
  it('routes nearby dinner replacement to candidate search', () => {
    const plan = createPlanFromPrompt('晚上两个人附近吃饭')
    const route = routeNaturalLanguageTurn(plan, '把晚饭换近一点')
    expect(route.kind).toBe('candidate-search')
    expect(route).toMatchObject({ kind: 'candidate-search', mode: 'replace' })
    if (route.kind === 'candidate-search' && route.mode === 'replace') {
      const segment = plan.segments.find((item) => item.id === route.segmentId)
      expect(segment?.phase).toBe('dining')
    }
  })

  it('routes hotpot requests to dinner candidate search even without replace wording', () => {
    const plan = createPlanFromPrompt('晚上两个人附近吃饭')
    const route = routeNaturalLanguageTurn(plan, '晚上想吃火锅啊')
    expect(route.kind).toBe('candidate-search')
    expect(route).toMatchObject({ kind: 'candidate-search', mode: 'replace' })
    if (route.kind === 'candidate-search' && route.mode === 'replace') {
      const segment = plan.segments.find((item) => item.id === route.segmentId)
      expect(segment?.phase).toBe('dining')
      expect(route.query).toBe('晚上想吃火锅啊')
    }
  })

  it('routes spicy and mild dining preferences to dinner candidate search', () => {
    const plan = createPlanFromPrompt('晚上两个人附近吃饭')
    const spicyRoute = routeNaturalLanguageTurn(plan, '我中午想吃辣')
    expect(spicyRoute.kind).toBe('candidate-search')
    expect(spicyRoute).toMatchObject({ kind: 'candidate-search', mode: 'replace', query: '我中午想吃辣' })
    if (spicyRoute.kind === 'candidate-search' && spicyRoute.mode === 'replace') {
      expect(plan.segments.find((item) => item.id === spicyRoute.segmentId)?.phase).toBe('dining')
    }

    const mildRoute = routeNaturalLanguageTurn(plan, '不吃辣，换个清淡点的')
    expect(mildRoute.kind).toBe('candidate-search')
    expect(mildRoute).toMatchObject({ kind: 'candidate-search', mode: 'replace' })
  })

  it('routes “不吃饭了去玩” as a cross-type replacement instead of deletion', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const route = routeNaturalLanguageTurn(plan, '还是不吃饭了去玩点其他的')
    expect(route).toMatchObject({
      kind: 'candidate-search',
      mode: 'replace',
      replacementScope: 'cross-type',
      desiredPhases: ['activity', 'leisure'],
      excludedPhases: ['dining'],
    })
    if (route.kind === 'candidate-search' && route.mode === 'replace') {
      expect(plan.segments.find((segment) => segment.id === route.segmentId)?.phase).toBe('dining')
    }
  })

  it('keeps a bare negated segment request as deletion', () => {
    const plan = createPlanFromPrompt('晚上两个人住酒店')
    const route = routeNaturalLanguageTurn(plan, '不要酒店了')
    expect(route.kind).toBe('command')
    if (route.kind === 'command') expect(route.command.type).toBe('DELETE_SEGMENT')
  })

  it('routes Sichuan/Hunan family dining preferences through candidate search', () => {
    const plan = createPlanFromPrompt('晚上两个人附近吃饭')
    const route = routeNaturalLanguageTurn(plan, '想吃川湘但带孩子')
    expect(route.kind).toBe('candidate-search')
    expect(route).toMatchObject({ kind: 'candidate-search', mode: 'replace' })
    if (route.kind === 'candidate-search' && route.mode === 'replace') {
      expect(plan.segments.find((item) => item.id === route.segmentId)?.phase).toBe('dining')
    }
  })

  it('asks for clarification on low-confidence change requests', () => {
    const plan = createPlanFromPrompt('晚上两个人附近吃饭')
    const route = routeNaturalLanguageTurn(plan, '调整一下')
    expect(route.kind).toBe('clarification')
    if (route.kind === 'clarification') {
      expect(route.requiredFields).toContain('要改哪个节点')
    }
  })

  it('routes add-after requests to candidate search without mutating the plan', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const route = routeNaturalLanguageTurn(plan, '中间再加个咖啡休息')
    expect(route.kind).toBe('candidate-search')
    expect(route).toMatchObject({ kind: 'candidate-search', mode: 'add-after' })
    if (route.kind === 'candidate-search' && route.mode === 'add-after') {
      expect(route.afterSegmentId).toBe(plan.segments[0]?.id)
      expect(route.query).toBe('中间再加个咖啡休息')
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

  it('routes clear-plan wording to a bulk clear command', () => {
    const plan = createPlanFromPrompt('下午两个人逛逛')
    const route = routeNaturalLanguageTurn(plan, '删除所有节点')
    expect(route.kind).toBe('command')
    if (route.kind === 'command') {
      expect(route.command.type).toBe('CLEAR_PLAN_SEGMENTS')
    }
  })

  it('routes reorder wording to a deterministic reorder command', () => {
    const plan = createPlanFromPrompt('下午两个人逛逛')
    const route = routeNaturalLanguageTurn(plan, '帮我重排一下')
    expect(route.kind).toBe('command')
    if (route.kind === 'command') {
      expect(route.command.type).toBe('REORDER_SEGMENT')
    }
  })

  it('routes booking-like wording to sandbox order generation', () => {
    const plan = createPlanFromPrompt('下午两个人逛逛')
    const route = routeNaturalLanguageTurn(plan, '可以模拟下单了')
    expect(route.kind).toBe('command')
    if (route.kind === 'command') {
      expect(route.command.type).toBe('CREATE_SANDBOX_ORDER')
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

    expect(intent).toMatchObject({
      action: 'replace',
      targetPhase: 'dining',
      query: '换近一点',
      reason: 'user wants nearby dinner',
    })

    const route = routeModelTurnIntent(plan, '把晚饭换近一点', intent!)
    expect(route.kind).toBe('candidate-search')
    expect(route).toMatchObject({ kind: 'candidate-search', mode: 'replace' })
    if (route.kind === 'candidate-search' && route.mode === 'replace') {
      expect(route.segmentId).toBe(dining.id)
      expect(route.query).toBe('换近一点')
    }
  })

  it('validates model add intent before turning it into an add-after candidate workflow', () => {
    const plan = createPlanFromPrompt('下午两个人附近轻松玩')
    const first = plan.segments[0]!
    const intent = parseModelTurnIntent(JSON.stringify({
      action: 'add',
      targetSegmentId: first.id,
      query: '加一个咖啡休息点',
      reason: 'user wants an extra stop',
    }))

    expect(intent).toMatchObject({
      action: 'add',
      targetSegmentId: first.id,
      query: '加一个咖啡休息点',
      reason: 'user wants an extra stop',
    })

    const route = routeModelTurnIntent(plan, '加一个咖啡休息点', intent!)
    expect(route.kind).toBe('candidate-search')
    expect(route).toMatchObject({ kind: 'candidate-search', mode: 'add-after' })
    if (route.kind === 'candidate-search' && route.mode === 'add-after') {
      expect(route.afterSegmentId).toBe(first.id)
      expect(route.query).toBe('加一个咖啡休息点')
    }
  })

  it('routes hotel and movie service requests through add and item-selection workflows', () => {
    const plan = createPlanFromPrompt('晚上两个人附近吃饭')
    const hotelRoute = routeNaturalLanguageTurn(plan, '帮我加个安静双床酒店')
    expect(hotelRoute.kind).toBe('candidate-search')
    expect(hotelRoute).toMatchObject({ kind: 'candidate-search', mode: 'add-after' })

    const movieRoute = routeNaturalLanguageTurn(plan, '饭后看个 IMAX 电影')
    expect(movieRoute.kind).toBe('candidate-search')
    expect(movieRoute).toMatchObject({ kind: 'candidate-search', mode: 'add-after' })

    const moviePlan = {
      ...plan,
      segments: [
        ...plan.segments,
        {
          ...plan.segments[0]!,
          id: 'seg_movie',
          phase: 'activity' as const,
          serviceCategory: 'movie' as const,
          poiId: 'poi_orbit_cinema',
          title: '电影场次',
          place: '轨道影厅',
        },
      ],
    }
    const ticketRoute = routeNaturalLanguageTurn(moviePlan, '买两张电影票')
    expect(ticketRoute.kind).toBe('service-item-search')
    expect(ticketRoute).toMatchObject({
      kind: 'service-item-search',
      category: 'movie',
      merchantId: 'poi_orbit_cinema',
      segmentId: 'seg_movie',
    })
  })

  it('routes negated named arrangements to deletion instead of search or addition', () => {
    const base = createPlanFromPrompt('晚上两个人附近吃饭')
    const plan = {
      ...base,
      segments: [
        ...base.segments,
        { ...base.segments[0]!, id: 'seg_coffee', title: '咖啡慢歇', place: '纸月咖啡' },
        { ...base.segments[0]!, id: 'seg_hotel', title: '酒店入住', place: '亚麻时钟酒店', serviceCategory: 'hotel' as const },
      ],
    }

    const coffeeRoute = routeNaturalLanguageTurn(plan, '删除咖啡这个安排')
    expect(coffeeRoute).toMatchObject({ kind: 'command', command: { type: 'DELETE_SEGMENT', segmentId: 'seg_coffee' } })
    const hotelRoute = routeNaturalLanguageTurn(plan, '不要酒店了')
    expect(hotelRoute).toMatchObject({ kind: 'command', command: { type: 'DELETE_SEGMENT', segmentId: 'seg_hotel' } })
    const confirmRoute = routeNaturalLanguageTurn(plan, '确认酒店安排')
    expect(confirmRoute).toMatchObject({ kind: 'command', command: { type: 'CONFIRM_PLAN' } })
  })

  it('answers safely when the plan has been cleared', () => {
    const plan = { ...createPlanFromPrompt('下午两个人附近轻松玩'), segments: [] }
    const route = routeNaturalLanguageTurn(plan, '这个计划怎么样')
    expect(route).toMatchObject({ kind: 'qa', reason: 'empty plan read-only turn' })
  })
})
