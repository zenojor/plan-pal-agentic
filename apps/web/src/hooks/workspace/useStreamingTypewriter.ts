import { useEffect, useRef, useState } from 'react'

export const TYPEWRITER_BASE_INTERVAL_MS = 28

export type StreamingTypewriterSnapshot = {
  displayedText: string
  networkStreaming: boolean
  receivedText: string
  typing: boolean
}

type StreamingTypewriterOptions = {
  intervalMs?: number
  onSettled?: (text: string) => void
  onSnapshot?: (snapshot: StreamingTypewriterSnapshot) => void
}

export class StreamingTypewriter {
  private readonly intervalMs: number
  private readonly onSettled?: (text: string) => void
  private readonly onSnapshot?: (snapshot: StreamingTypewriterSnapshot) => void
  private disposed = false
  private finalText: string | undefined
  private queue: string[] = []
  private settled = true
  private snapshot: StreamingTypewriterSnapshot = emptySnapshot()
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(options: StreamingTypewriterOptions = {}) {
    this.intervalMs = options.intervalMs ?? TYPEWRITER_BASE_INTERVAL_MS
    this.onSettled = options.onSettled
    this.onSnapshot = options.onSnapshot
  }

  activate() {
    this.disposed = false
  }

  start() {
    if (this.disposed) return
    this.clearTimer()
    this.queue = []
    this.finalText = undefined
    this.settled = false
    this.snapshot = { ...emptySnapshot(), networkStreaming: true }
    this.notify()
  }

  push(delta: string) {
    if (this.disposed || !delta) return
    const graphemes = segmentGraphemes(delta)
    if (graphemes.length === 0) return
    this.settled = false
    this.snapshot = {
      ...this.snapshot,
      networkStreaming: true,
      receivedText: `${this.snapshot.receivedText}${delta}`,
      typing: true,
    }
    this.queue.push(...graphemes)
    this.notify()
    this.schedule()
  }

  finish(finalText?: string) {
    if (this.disposed) return
    this.finalText = finalText
    if (finalText !== undefined && finalText !== this.snapshot.receivedText) {
      this.reconcileFinalText(finalText)
    }
    this.snapshot = {
      ...this.snapshot,
      networkStreaming: false,
      typing: this.queue.length > 0,
    }
    this.notify()
    if (this.queue.length > 0) {
      this.schedule()
      return
    }
    this.settle()
  }

  cancel() {
    if (this.disposed) return false
    const hadReceivedText = this.snapshot.receivedText.length > 0
    this.clearTimer()
    this.queue = []
    this.finalText = undefined
    this.settled = true
    this.snapshot = {
      displayedText: this.snapshot.displayedText,
      networkStreaming: false,
      receivedText: this.snapshot.displayedText,
      typing: false,
    }
    this.notify()
    return hadReceivedText
  }

  dispose() {
    this.disposed = true
    this.clearTimer()
    this.queue = []
  }

  getSnapshot() {
    return { ...this.snapshot }
  }

  hasReceivedText() {
    return this.snapshot.receivedText.length > 0
  }

  private reconcileFinalText(finalText: string) {
    this.snapshot = { ...this.snapshot, receivedText: finalText }
    if (finalText.startsWith(this.snapshot.displayedText)) {
      this.queue = segmentGraphemes(finalText.slice(this.snapshot.displayedText.length))
    }
  }

  private schedule() {
    if (this.disposed || this.timer || this.queue.length === 0) return
    const cadence = cadenceForBacklog(this.queue.length, this.intervalMs)
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.tick(cadence.batchSize)
    }, cadence.delayMs)
  }

  private tick(batchSize: number) {
    if (this.disposed || this.queue.length === 0) return
    const next = this.queue.splice(0, batchSize).join('')
    this.snapshot = {
      ...this.snapshot,
      displayedText: `${this.snapshot.displayedText}${next}`,
      typing: this.queue.length > 0,
    }
    this.notify()
    if (this.queue.length > 0) {
      this.schedule()
      return
    }
    if (!this.snapshot.networkStreaming) this.settle()
  }

  private settle() {
    if (this.settled) return
    const expected = this.finalText ?? this.snapshot.receivedText
    this.snapshot = {
      displayedText: expected,
      networkStreaming: false,
      receivedText: expected,
      typing: false,
    }
    this.settled = true
    this.notify()
    this.onSettled?.(expected)
  }

  private notify() {
    this.onSnapshot?.(this.getSnapshot())
  }

  private clearTimer() {
    if (!this.timer) return
    clearTimeout(this.timer)
    this.timer = undefined
  }
}

type UseStreamingTypewriterOptions = {
  intervalMs?: number
  onDisplayedText: (text: string) => void
  onSettled: (text: string) => void
  onTypingChange: (typing: boolean) => void
}

export function useStreamingTypewriter(options: UseStreamingTypewriterOptions) {
  const optionsRef = useRef(options)
  optionsRef.current = options
  const [typewriter] = useState(() => new StreamingTypewriter({
    intervalMs: options.intervalMs,
    onSettled: (text) => optionsRef.current.onSettled(text),
    onSnapshot: (snapshot) => {
      optionsRef.current.onTypingChange(snapshot.typing)
      if (snapshot.displayedText) optionsRef.current.onDisplayedText(snapshot.displayedText)
    },
  }))

  useEffect(() => {
    typewriter.activate()
    return () => typewriter.dispose()
  }, [typewriter])

  return typewriter
}

export function segmentGraphemes(text: string) {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return Array.from(segmenter.segment(text), (item) => item.segment)
  }
  return Array.from(text)
}

function cadenceForBacklog(backlog: number, intervalMs: number) {
  if (backlog >= 160) return { batchSize: 8, delayMs: Math.max(8, Math.round(intervalMs * 0.36)) }
  if (backlog >= 80) return { batchSize: 4, delayMs: Math.max(10, Math.round(intervalMs * 0.5)) }
  if (backlog >= 32) return { batchSize: 2, delayMs: Math.max(14, Math.round(intervalMs * 0.72)) }
  return { batchSize: 1, delayMs: intervalMs }
}

function emptySnapshot(): StreamingTypewriterSnapshot {
  return {
    displayedText: '',
    networkStreaming: false,
    receivedText: '',
    typing: false,
  }
}
