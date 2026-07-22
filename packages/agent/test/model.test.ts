import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  generateAssistantReply,
  streamAssistantReply,
  getOpenAICompatibleBaseURLCandidates,
  getOpenAICompatibleAttemptedEndpoints,
  testOpenAICompatibleModel,
} from '../src/model'

describe('model endpoint resolution', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds provider-neutral OpenAI-compatible base URL candidates', () => {
    expect(getOpenAICompatibleBaseURLCandidates('https://api.example.com')).toEqual([
      'https://api.example.com',
      'https://api.example.com/v1',
    ])
    expect(getOpenAICompatibleBaseURLCandidates('https://api.example.com/v1')).toEqual([
      'https://api.example.com/v1',
      'https://api.example.com',
    ])
    expect(getOpenAICompatibleBaseURLCandidates('https://host.example.com/proxy')).toEqual([
      'https://host.example.com/proxy',
      'https://host.example.com/proxy/v1',
    ])
  })

  it('tests the supplied base URL before falling back to /v1', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'missing route' } }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await testOpenAICompatibleModel({
      baseURL: 'https://api.example.com',
      apiKey: 'sk-secret',
      model: 'demo-model',
    })

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result.providerInfo).toMatchObject({
      baseURL: 'https://api.example.com',
      resolvedBaseURL: 'https://api.example.com/v1',
      model: 'demo-model',
      providerMode: 'auto',
    })
  })

  it('tests /v1 before falling back to the provider root when /v1 was supplied', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'missing route' } }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await testOpenAICompatibleModel({
      baseURL: 'https://api.example.com/v1',
      apiKey: 'sk-secret',
      model: 'demo-model',
    })

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result.providerInfo?.resolvedBaseURL).toBe('https://api.example.com')
  })

  it('returns redacted provider-neutral errors with all attempted endpoints', async () => {
    vi.stubGlobal('fetch', async () => new Response(
      JSON.stringify({ error: { message: 'model not found for sk-secret' } }),
      { status: 404, statusText: 'Not Found' },
    ))

    const result = await testOpenAICompatibleModel({
      baseURL: 'https://api.example.com',
      apiKey: 'sk-secret',
      model: 'demo-model',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('HTTP 404 Not Found')
    expect(result.error).toContain('模型：demo-model')
    expect(result.error).toContain('https://api.example.com/chat/completions')
    expect(result.error).toContain('https://api.example.com/v1/chat/completions')
    expect(result.error).not.toContain('sk-secret')
    expect(result.error).not.toContain('Base URL 请使用')
  })


  it('streams assistant deltas from OpenAI-compatible SSE responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(chunkedStream([
      'data: {"choices":[{"delta":{"content":"我是"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" demo-chat"}}]}\n\n',
      'data: [DONE]\n\n',
    ]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const deltas: string[] = []

    const text = await streamAssistantReply({
      baseURL: 'https://api.example.com/v1',
      apiKey: 'sk-secret',
      model: 'demo-model',
    }, [{ role: 'user', content: '你是什么模型' }], (delta) => {
      deltas.push(delta)
    })

    expect(text).toBe('我是 demo-chat')
    expect(deltas).toEqual(['我是', ' demo-chat'])
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { stream?: boolean }
    expect(body.stream).toBe(true)
  })

  it('does not retry another endpoint after a partial stream was already delivered', async () => {
    const encoder = new TextEncoder()
    let pullCount = 0
    const interruptedStream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pullCount === 0) {
          pullCount += 1
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'))
          return
        }
        controller.error(new Error('provider connection lost'))
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(interruptedStream, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const deltas: string[] = []

    await expect(streamAssistantReply({
      baseURL: 'https://api.example.com',
      apiKey: 'sk-secret',
      model: 'demo-model',
    }, [{ role: 'user', content: 'hello' }], (delta) => {
      deltas.push(delta)
    })).rejects.toThrow('provider connection lost')

    expect(deltas).toEqual(['partial'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('does not let a stale resolved base URL block runtime fallback candidates', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'missing route' } }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'runtime answer' } }],
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const config = {
      baseURL: 'https://api.example.com',
      resolvedBaseURL: 'https://api.example.com',
      apiKey: 'sk-secret',
      model: 'demo-model',
    }

    await expect(generateAssistantReply(config, [{ role: 'user', content: 'hello' }])).resolves.toBe('runtime answer')
    expect(getOpenAICompatibleAttemptedEndpoints(config)).toEqual([
      'https://api.example.com/chat/completions',
      'https://api.example.com/v1/chat/completions',
    ])
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
function chunkedStream(chunks: string[]) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

