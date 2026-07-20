import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPlanWithVariants } from '../src'

const config = {
  baseURL: 'https://api.example.com/v1',
  apiKey: 'sk-secret-for-test',
  model: 'demo-chat',
}

describe('plan creation variants', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses BYOK model output for plan variants without leaking the API key', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            variants: [
              {
                title: '模型轻松版',
                summary: '模型生成的轻松方案',
                tags: ['轻松'],
                reasons: ['匹配偏好'],
                segments: [
                  { phase: 'activity', title: '模型活动', place: '模型地点', startTime: '14:00', endTime: '15:30', reason: '轻松开始', budget: 'CNY 50-100/人', notes: '确认天气和场次', lnglat: [121.471, 31.231] },
                  { phase: 'leisure', title: '模型缓冲', place: '模型咖啡', startTime: '15:40', endTime: '16:10', reason: '吸收时间误差', budget: 'CNY 30-60/人', notes: '吸收时间误差', locked: true },
                  { phase: 'activity', title: '模型体验', place: '星桥陶艺实验室', startTime: '16:20', endTime: '17:00', reason: '增加互动', budget: 'CNY 80-160/人' },
                  { phase: 'dining', title: '模型晚饭', place: '模型餐厅', startTime: '17:20', endTime: '18:30', reason: '近一点', budget: 'CNY 80-120/人' },
                ],
              },
              {
                title: '模型近距离版',
                summary: '模型生成的近距离方案',
                tags: ['近一点'],
                reasons: ['少绕路'],
                segments: [
                  { phase: 'activity', title: '近处活动', place: '近处地点', startTime: '14:00', endTime: '15:30', reason: '近', budget: 'CNY 50-100/人' },
                ],
              },
            ],
          }),
        },
      }],
    }), { status: 200 }))

    const result = await createPlanWithVariants('下午两个人附近轻松玩', config)

    expect(result.plan.pendingAction?.kind).toBe('plan-variant-selection')
    expect(result.plan.pendingAction?.kind === 'plan-variant-selection' && result.plan.pendingAction.variants[0]?.title).toBe('模型轻松版')
    if (result.plan.pendingAction?.kind !== 'plan-variant-selection') throw new Error('expected variants')
    const firstVariant = result.plan.pendingAction.variants[0]!
    expect(firstVariant.segments).toHaveLength(4)
    expect(firstVariant.segments[1]).toMatchObject({ locked: true, notes: '吸收时间误差' })
    expect(firstVariant.segments[2]?.serviceCategory).toBe('activity')
    expect(firstVariant.segments[2]?.poiId).toBe('model-activity-3')
    expect(firstVariant.segments[3]?.serviceCategory).toBe('dining')
    expect(firstVariant.segments.every((segment) => segment.lnglat)).toBe(true)
    expect(JSON.stringify(result.events)).not.toContain(config.apiKey)
  })

  it('repairs under-expanded complex model plans through model-led repair', async () => {
    let calls = 0
    vi.stubGlobal('fetch', async () => {
      calls += 1
      const content = calls === 1
        ? {
            variants: [
              {
                title: '压缩方案 A',
                summary: '第一次把复杂任务压缩了',
                tags: ['商务'],
                reasons: ['需要修复'],
                segments: [
                  { phase: 'activity', title: '演示', place: '会议室', startTime: '14:00', endTime: '16:00', reason: '产品演示', budget: 'CNY 100-200/人' },
                  { phase: 'dining', title: '晚餐', place: '餐厅', startTime: '17:00', endTime: '18:30', reason: '商务晚餐', budget: 'CNY 200-300/人' },
                  { phase: 'drinks', title: '复盘', place: '大堂吧', startTime: '19:00', endTime: '20:00', reason: '简短复盘', budget: 'CNY 80-160/人' },
                ],
              },
              {
                title: '压缩方案 B',
                summary: '同样不足',
                tags: ['稳妥'],
                reasons: ['需要修复'],
                segments: [
                  { phase: 'activity', title: '演示', place: '会议室', startTime: '14:00', endTime: '16:00', reason: '产品演示', budget: 'CNY 100-200/人' },
                  { phase: 'dining', title: '晚餐', place: '餐厅', startTime: '17:00', endTime: '18:30', reason: '商务晚餐', budget: 'CNY 200-300/人' },
                  { phase: 'drinks', title: '复盘', place: '大堂吧', startTime: '19:00', endTime: '20:00', reason: '简短复盘', budget: 'CNY 80-160/人' },
                ],
              },
            ],
          }
        : {
            variants: [
              {
                title: '修复方案 A',
                summary: '拆出缓冲和检查点',
                tags: ['商务', '稳妥'],
                reasons: ['按复杂任务拆解'],
                segments: [
                  { phase: 'activity', title: '到达校准', place: '会客区', startTime: '14:00', endTime: '14:25', reason: '确认客户目标', budget: 'CNY 40-80/人', notes: '确认人数、禁忌、时间' },
                  { phase: 'activity', title: '产品演示', place: '会议室', startTime: '14:35', endTime: '15:50', reason: '核心任务', budget: 'CNY 100-200/人' },
                  { phase: 'leisure', title: '缓冲交流', place: '休息区', startTime: '16:00', endTime: '16:35', reason: '吸收超时', budget: 'CNY 0-60/人', locked: true },
                  { phase: 'dining', title: '商务晚餐', place: '餐厅', startTime: '17:00', endTime: '18:30', reason: '稳定沟通', budget: 'CNY 200-300/人' },
                  { phase: 'drinks', title: '简短复盘', place: '大堂吧', startTime: '19:00', endTime: '20:00', reason: '沉淀下一步', budget: 'CNY 80-160/人' },
                ],
              },
              {
                title: '修复方案 B',
                summary: '另一套拆解',
                tags: ['效率'],
                reasons: ['按复杂任务拆解'],
                segments: [
                  { phase: 'activity', title: '接待', place: '会客区', startTime: '14:00', endTime: '14:20', reason: '开场', budget: 'CNY 40-80/人' },
                  { phase: 'activity', title: '演示', place: '会议室', startTime: '14:30', endTime: '15:45', reason: '核心任务', budget: 'CNY 100-200/人' },
                  { phase: 'leisure', title: '缓冲', place: '休息区', startTime: '15:55', endTime: '16:25', reason: '不赶', budget: 'CNY 0-60/人' },
                  { phase: 'dining', title: '晚餐', place: '餐厅', startTime: '17:00', endTime: '18:30', reason: '商务晚餐', budget: 'CNY 200-300/人' },
                ],
              },
            ],
          }
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 })
    })

    const result = await createPlanWithVariants(
      '周五下午接待 4 位客户，从产品演示到晚餐和简短复盘，路线要稳，不能太赶，预算中高。',
      config,
    )

    expect(calls).toBe(2)
    expect(result.events.some((event) => event.payload && typeof event.payload === 'object' && (event.payload as { phase?: unknown }).phase === 'repair-plan')).toBe(true)
    if (result.plan.pendingAction?.kind !== 'plan-variant-selection') throw new Error('expected variants')
    expect(result.plan.pendingAction.variants[0]?.title).toBe('修复方案 A')
    expect(result.plan.pendingAction.variants[0]?.segments.length).toBeGreaterThanOrEqual(4)
  })

  it('sanitizes model-generated variant text and invalid segment times', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            variants: [
              {
                title: `泄露 ${config.apiKey}`,
                summary: 'provider echoed Bearer abc.def',
                tags: [config.apiKey, '轻松'],
                reasons: ['provider echoed Bearer abc.def'],
                segments: [
                  {
                    phase: 'activity',
                    title: `活动 ${config.apiKey}`,
                    place: '模型地点',
                    startTime: 'soon',
                    endTime: 'later',
                    reason: 'bad Bearer abc.def',
                    budget: 'CNY 50-100/人',
                  },
                ],
              },
              {
                title: '时间错乱版',
                summary: '结束早于开始也要被修正',
                tags: ['时间'],
                reasons: ['测试时间修正'],
                segments: [
                  {
                    phase: 'dining',
                    title: '模型晚饭',
                    place: '模型餐厅',
                    startTime: '19:30',
                    endTime: '18:00',
                    reason: '时间错乱',
                    budget: 'CNY 80-120/人',
                  },
                ],
              },
            ],
          }),
        },
      }],
    }), { status: 200 }))

    const result = await createPlanWithVariants('下午两个人附近轻松玩', config)
    const action = result.plan.pendingAction

    expect(action?.kind).toBe('plan-variant-selection')
    if (action?.kind !== 'plan-variant-selection') throw new Error('expected plan variants')
    const serialized = JSON.stringify(action)
    expect(serialized).not.toContain(config.apiKey)
    expect(serialized).not.toContain('Bearer abc.def')
    expect(serialized).toContain('[redacted]')
    for (const variant of action.variants) {
      for (const segment of variant.segments) {
        expect(segment.startTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/)
        expect(segment.endTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/)
        expect(Number.isFinite(segment.durationMinutes)).toBe(true)
        expect(segment.durationMinutes).toBeGreaterThanOrEqual(30)
        expect(segment.endTime).not.toBe('later')
        expect(segment.startTime).not.toBe('soon')
      }
    }
  })

  it('fails without creating local variants when the model connection fails', async () => {
    vi.stubGlobal('fetch', async () => new Response(
      JSON.stringify({ error: { message: `bad key ${config.apiKey}` } }),
      { status: 401, statusText: 'Unauthorized' },
    ))

    const events: Array<{ type: string }> = []
    await expect(createPlanWithVariants('下午两个人附近轻松玩', config, (event) => {
      events.push(event)
    })).rejects.toThrow('模型方案生成失败')

    expect(events.some((event) => event.type === 'agent.model.error')).toBe(true)
    expect(events.some((event) => event.type === 'agent.finished')).toBe(false)
    expect(JSON.stringify(events)).not.toContain(config.apiKey)
    expect(JSON.stringify(events)).toContain('[redacted]')
  })
})
