import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  segmentGraphemes,
  StreamingTypewriter,
  TYPEWRITER_BASE_INTERVAL_MS,
  type StreamingTypewriterSnapshot,
} from './useStreamingTypewriter'

describe('StreamingTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('buffers a delta and reveals it progressively instead of displaying the whole chunk', () => {
    const snapshots: StreamingTypewriterSnapshot[] = []
    const typewriter = new StreamingTypewriter({ onSnapshot: (snapshot) => snapshots.push(snapshot) })

    typewriter.start()
    typewriter.push('你好世界')

    expect(typewriter.getSnapshot()).toMatchObject({
      displayedText: '',
      receivedText: '你好世界',
      networkStreaming: true,
      typing: true,
    })
    vi.advanceTimersByTime(TYPEWRITER_BASE_INTERVAL_MS)
    expect(typewriter.getSnapshot().displayedText).toBe('你')
    expect(typewriter.getSnapshot().displayedText).not.toBe(typewriter.getSnapshot().receivedText)

    vi.runAllTimers()
    expect(snapshots.at(-1)?.displayedText).toBe('你好世界')
    expect(typewriter.getSnapshot().networkStreaming).toBe(true)
    typewriter.dispose()
  })

  it('keeps multiple deltas in order and drains after the network completes', () => {
    const settled: string[] = []
    const typewriter = new StreamingTypewriter({ onSettled: (text) => settled.push(text) })

    typewriter.start()
    typewriter.push('第一')
    typewriter.push(' second')
    typewriter.push('🙂')
    expect(vi.getTimerCount()).toBe(1)

    typewriter.finish('第一 second🙂')
    expect(typewriter.getSnapshot()).toMatchObject({
      displayedText: '',
      networkStreaming: false,
      receivedText: '第一 second🙂',
      typing: true,
    })

    vi.runAllTimers()
    expect(typewriter.getSnapshot()).toEqual({
      displayedText: '第一 second🙂',
      networkStreaming: false,
      receivedText: '第一 second🙂',
      typing: false,
    })
    expect(settled).toEqual(['第一 second🙂'])
    typewriter.dispose()
  })

  it('uses grapheme clusters for emoji and Unicode text', () => {
    const family = '👨‍👩‍👧‍👦'
    expect(segmentGraphemes(`${family}好`)).toEqual([family, '好'])
    const typewriter = new StreamingTypewriter()

    typewriter.start()
    typewriter.push(`${family}好`)
    vi.advanceTimersByTime(TYPEWRITER_BASE_INTERVAL_MS)

    expect(typewriter.getSnapshot().displayedText).toBe(family)
    typewriter.dispose()
  })

  it('clears its only timer and pending queue on cancel or unmount disposal', () => {
    const typewriter = new StreamingTypewriter()
    typewriter.start()
    typewriter.push('尚未显示的内容')
    typewriter.push('不会创建第二个 timer')
    expect(vi.getTimerCount()).toBe(1)

    typewriter.cancel()
    expect(vi.getTimerCount()).toBe(0)
    expect(typewriter.getSnapshot()).toMatchObject({ typing: false, networkStreaming: false })

    typewriter.start()
    typewriter.push('unmount')
    expect(vi.getTimerCount()).toBe(1)
    typewriter.dispose()
    expect(vi.getTimerCount()).toBe(0)
    vi.runAllTimers()
    expect(typewriter.getSnapshot().displayedText).toBe('')
  })

  it('can reactivate after a StrictMode-style effect cleanup without duplicating timers', () => {
    const typewriter = new StreamingTypewriter()
    typewriter.dispose()
    typewriter.activate()
    typewriter.start()
    typewriter.push('严格模式')
    typewriter.push('仍然单线程')

    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(TYPEWRITER_BASE_INTERVAL_MS)
    expect(typewriter.getSnapshot().displayedText).toBe('严')
    typewriter.dispose()
  })

  it('reconciles a canonical final suffix without jumping to it immediately', () => {
    const typewriter = new StreamingTypewriter()
    typewriter.start()
    typewriter.push('已收到')
    vi.advanceTimersByTime(TYPEWRITER_BASE_INTERVAL_MS)
    expect(typewriter.getSnapshot().displayedText).toBe('已')

    typewriter.finish('已收到完整答案')
    expect(typewriter.getSnapshot().displayedText).toBe('已')
    expect(typewriter.getSnapshot().receivedText).toBe('已收到完整答案')

    vi.runAllTimers()
    expect(typewriter.getSnapshot().displayedText).toBe('已收到完整答案')
    typewriter.dispose()
  })
})
