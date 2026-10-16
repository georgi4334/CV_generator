import { describe, expect, it } from 'vitest'
import { createGeminiProvider } from '../src/ai/gemini'
import { AiError, extractJson } from '../src/ai/provider'

const request = {
  task: 'fix' as const,
  system: 'SYS',
  prompt: 'PROMPT',
  temperature: 0.2,
  input: {},
}

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = []
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
  return { fn, calls }
}

describe('Gemini provider', () => {
  it('sends the prompt as JSON-mode generateContent with the key in a header', async () => {
    const f = fakeFetch(200, {
      candidates: [
        { content: { parts: [{ text: 'thinking…', thought: true }, { text: '{"a":1}' }] } },
      ],
    })
    const ai = createGeminiProvider({ apiKey: 'KEY', model: 'gemini-flash-latest', fetch: f.fn })
    expect(await ai.complete(request)).toBe('{"a":1}')
    const { url, init } = f.calls[0]!
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
    )
    expect(url).not.toContain('KEY')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('KEY')
    expect(JSON.parse(init.body as string)).toEqual({
      systemInstruction: { parts: [{ text: 'SYS' }] },
      contents: [{ role: 'user', parts: [{ text: 'PROMPT' }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    })
  })

  it('turns quota, refusals and errors into AiError kinds', async () => {
    const kind = async (status: number, body: unknown) => {
      const ai = createGeminiProvider({
        apiKey: 'k',
        model: 'm',
        fetch: fakeFetch(status, body).fn,
      })
      return ai.complete(request).then(
        () => 'ok',
        (e: AiError) => e.kind,
      )
    }
    expect(await kind(429, { error: { message: 'quota' } })).toBe('busy')
    expect(await kind(400, { error: { message: 'bad' } })).toBe('failed')
    expect(await kind(200, { promptFeedback: { blockReason: 'SAFETY' } })).toBe('blocked')
    expect(await kind(200, { candidates: [{ finishReason: 'SAFETY' }] })).toBe('blocked')
    expect(await kind(200, { candidates: [{ finishReason: 'MAX_TOKENS' }] })).toBe('failed')
  })

  it('reports network failures', async () => {
    const ai = createGeminiProvider({
      apiKey: 'k',
      model: 'm',
      fetch: (async () => {
        throw new TypeError('fetch failed')
      }) as unknown as typeof fetch,
    })
    await expect(ai.complete(request)).rejects.toMatchObject({ kind: 'failed' })
  })
})

describe('extractJson', () => {
  it('reads plain, fenced and surrounded JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 })
    expect(extractJson('Here you go: {"a":3} Thanks')).toEqual({ a: 3 })
    expect(() => extractJson('no json')).toThrow()
  })
})
