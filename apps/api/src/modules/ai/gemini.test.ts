import { describe, expect, it } from 'vitest'
import { createGeminiProvider, validateGeminiKey } from './gemini'
import { AiError, extractJson, generateJson } from './provider'
import { z } from 'zod'

const request = {
  task: 'fix' as const,
  system: 'SYS',
  prompt: 'PROMPT',
  temperature: 0.1,
  input: {},
}

type Reply = { status?: number; body?: unknown; raw?: string }
function stubFetch(reply: Reply | (() => Promise<Response>)) {
  const calls: { url: string; init: RequestInit }[] = []
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    if (typeof reply === 'function') return reply()
    return new Response(reply.raw ?? JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
    })
  }) as unknown as typeof fetch
  return { fn, calls }
}
const gemini = (reply: Reply | (() => Promise<Response>), extra = {}) =>
  createGeminiProvider({ apiKey: 'k', model: 'm', fetch: stubFetch(reply).fn, ...extra })
const kindOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'ok',
    (e: unknown) => (e instanceof AiError ? e.kind : `non-AiError:${(e as Error).message}`),
  )
const textReply = (text: string) => ({ body: { candidates: [{ content: { parts: [{ text }] } }] } })

describe('Gemini provider edge cases', () => {
  describe('HTTP status mapping', () => {
    it.each([
      [401, {}, 'key'],
      [403, { error: { message: 'denied' } }, 'key'],
      [400, { error: { message: 'API key not valid. Please pass a valid API key.' } }, 'key'],
      [400, { error: { message: 'api KEY expired' } }, 'key'],
      [400, { error: { message: 'Invalid JSON payload' } }, 'failed'],
      [400, {}, 'failed'],
      [429, { error: { message: 'quota' } }, 'busy'],
      [429, {}, 'busy'],
      [500, { error: { message: 'internal' } }, 'failed'],
      [503, {}, 'failed'],
      [404, { error: { message: 'model not found' } }, 'failed'],
    ])('status %i with %j is %s', async (status, body, kind) => {
      expect(await kindOf(gemini({ status, body }).complete(request))).toBe(kind)
    })

    it('keeps the status and Google message in a failed error, and a default for no details', async () => {
      const withMessage = await gemini({ status: 500, body: { error: { message: 'oops' } } })
        .complete(request)
        .catch((e: Error) => e.message)
      expect(withMessage).toBe('Gemini answered 500: oops')
      const noDetails = await gemini({ status: 502, body: {} })
        .complete(request)
        .catch((e: Error) => e.message)
      expect(noDetails).toBe('Gemini answered 502: no details')
    })

    it("uses Google's message for a busy error, or a default one", async () => {
      const custom = await gemini({ status: 429, body: { error: { message: 'slow down' } } })
        .complete(request)
        .catch((e: Error) => e.message)
      expect(custom).toBe('slow down')
      const plain = await gemini({ status: 429 })
        .complete(request)
        .catch((e: Error) => e.message)
      expect(plain).toBe('Gemini quota reached')
    })

    it.each([
      ['an HTML error page', '<html>502 Bad Gateway</html>'],
      ['an empty body', ''],
      ['truncated JSON', '{"error": {"mess'],
    ])('survives %s as a non-JSON error body', async (_name, raw) => {
      expect(await kindOf(gemini({ status: 502, raw }).complete(request))).toBe('failed')
      expect(await kindOf(gemini({ status: 429, raw }).complete(request))).toBe('busy')
      expect(await kindOf(gemini({ status: 403, raw }).complete(request))).toBe('key')
    })

    it('does not leak the API key into error messages', async () => {
      const ai = createGeminiProvider({
        apiKey: 'SUPER-SECRET-KEY',
        model: 'm',
        fetch: stubFetch({ status: 500, body: { error: { message: 'boom' } } }).fn,
      })
      const error = (await ai.complete(request).catch((e: Error) => e)) as Error
      expect(error.message).not.toContain('SUPER-SECRET-KEY')
    })
  })

  describe('answers with 200', () => {
    it('refuses a blocked prompt even when candidates are present', async () => {
      const reply = {
        body: {
          promptFeedback: { blockReason: 'PROHIBITED_CONTENT' },
          candidates: [{ content: { parts: [{ text: 'x' }] } }],
        },
      }
      const error = (await gemini(reply)
        .complete(request)
        .catch((e: AiError) => e)) as AiError
      expect(error.kind).toBe('blocked')
      expect(error.message).toContain('PROHIBITED_CONTENT')
    })

    it.each([
      ['no candidates key', {}],
      ['empty candidates', { candidates: [] }],
      ['a candidate without content', { candidates: [{}] }],
      ['content without parts', { candidates: [{ content: {} }] }],
      ['empty parts', { candidates: [{ content: { parts: [] } }] }],
      ['parts without text', { candidates: [{ content: { parts: [{}] } }] }],
      ['only an empty string', { candidates: [{ content: { parts: [{ text: '' }] } }] }],
    ])('fails clearly for %s', async (_name, body) => {
      const error = (await gemini({ body })
        .complete(request)
        .catch((e: AiError) => e)) as AiError
      expect(error).toBeInstanceOf(AiError)
      expect(error.kind).toBe('failed')
      expect(error.message).toContain('empty answer')
    })

    it('filters out thought parts, also when they are all there is', async () => {
      const parts = [
        { text: 'I should think…', thought: true },
        { text: '{"a":' },
        { text: '1}' },
        { text: 'more thinking', thought: true },
      ]
      const answer = await gemini({ body: { candidates: [{ content: { parts } }] } }).complete(
        request,
      )
      expect(answer).toBe('{"a":1}')
      const onlyThoughts = { candidates: [{ content: { parts: [{ text: 'hm', thought: true }] } }] }
      expect(await kindOf(gemini({ body: onlyThoughts }).complete(request))).toBe('failed')
    })

    it('uses only the first candidate', async () => {
      const body = {
        candidates: [
          { content: { parts: [{ text: 'first' }] } },
          { content: { parts: [{ text: 'second' }] } },
        ],
      }
      expect(await gemini({ body }).complete(request)).toBe('first')
    })

    it.each([
      ['SAFETY', 'blocked'],
      ['RECITATION', 'failed'],
      ['MAX_TOKENS', 'failed'],
      ['OTHER', 'failed'],
    ])('finish reason %s without text is %s', async (finishReason, kind) => {
      expect(
        await kindOf(gemini({ body: { candidates: [{ finishReason }] } }).complete(request)),
      ).toBe(kind)
    })

    it('still returns text when the finish reason is MAX_TOKENS (partial answer)', async () => {
      const body = {
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"a"' }] } }],
      }
      expect(await gemini({ body }).complete(request)).toBe('{"a"')
    })

    it('returns a huge answer unchanged', async () => {
      const big = 'x'.repeat(2_000_000)
      expect(await gemini(textReply(big)).complete(request)).toHaveLength(2_000_000)
    })

    it('answers a successful but non-JSON body as an AiError, not a crash', async () => {
      expect(await kindOf(gemini({ status: 200, raw: 'not json' }).complete(request))).toBe(
        'failed',
      )
    })

    // BUG (minor): a literal JSON `null` body (200 or error status) makes `body.promptFeedback` /
    // `body.error` throw a TypeError instead of an AiError, so the route answers 500, not 502.
    it.fails('handles a JSON null body as a failed AiError', async () => {
      expect(await kindOf(gemini({ status: 200, raw: 'null' }).complete(request))).toBe('failed')
    })
  })

  describe('network problems', () => {
    it('wraps a rejected fetch with the reason', async () => {
      const ai = gemini(async () => {
        throw new TypeError('getaddrinfo ENOTFOUND generativelanguage.googleapis.com')
      })
      const error = (await ai.complete(request).catch((e: AiError) => e)) as AiError
      expect(error.kind).toBe('failed')
      expect(error.message).toContain('Could not reach Gemini')
      expect(error.message).toContain('ENOTFOUND')
    })

    it('aborts after the timeout and reports it as a failed (not busy, not key) error', async () => {
      const ai = createGeminiProvider({
        apiKey: 'k',
        model: 'm',
        timeoutMs: 20,
        fetch: ((_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal!.addEventListener('abort', () => reject(init.signal!.reason))
          })) as unknown as typeof fetch,
      })
      expect(await kindOf(ai.complete(request))).toBe('failed')
    })

    it('passes an abort signal to fetch', async () => {
      const f = stubFetch(textReply('{}'))
      await createGeminiProvider({ apiKey: 'k', model: 'm', fetch: f.fn }).complete(request)
      expect(f.calls[0]!.init.signal).toBeInstanceOf(AbortSignal)
    })

    it('a body that fails while reading is treated like an empty body', async () => {
      const ai = gemini(
        async () =>
          ({
            status: 200,
            ok: true,
            json: async () => {
              throw new Error('stream broke')
            },
          }) as unknown as Response,
      )
      expect(await kindOf(ai.complete(request))).toBe('failed')
    })
  })

  describe('request building', () => {
    it('encodes the model name in the URL and honours a custom base URL', async () => {
      const f = stubFetch(textReply('{}'))
      await createGeminiProvider({
        apiKey: 'k',
        model: 'models/../evil?x=1',
        baseUrl: 'http://stub.local/v9',
        fetch: f.fn,
      }).complete(request)
      expect(f.calls[0]!.url).toBe(
        'http://stub.local/v9/models/models%2F..%2Fevil%3Fx%3D1:generateContent',
      )
    })

    it('sends emoji, NUL bytes and quotes in the prompt as valid JSON', async () => {
      const f = stubFetch(textReply('{}'))
      const prompt = '🙂 "quoted" \u0000 \\ \n'
      await createGeminiProvider({ apiKey: 'k', model: 'm', fetch: f.fn }).complete({
        ...request,
        prompt,
      })
      expect(JSON.parse(f.calls[0]!.init.body as string).contents[0].parts[0].text).toBe(prompt)
    })

    it('keeps the key out of the URL, even a key with odd characters', async () => {
      const f = stubFetch(textReply('{}'))
      await createGeminiProvider({ apiKey: 'a b&c=d/é', model: 'm', fetch: f.fn }).complete(request)
      expect(f.calls[0]!.url).not.toContain('a b')
      expect((f.calls[0]!.init.headers as Record<string, string>)['x-goog-api-key']).toBe(
        'a b&c=d/é',
      )
    })
  })
})

describe('validateGeminiKey', () => {
  const validate = (reply: Reply | (() => Promise<Response>), opts = {}) =>
    validateGeminiKey('KEY', { fetch: stubFetch(reply).fn, ...opts })

  it('resolves when Google lists a model', async () => {
    await expect(validate({ body: { models: [] } })).resolves.toBeUndefined()
  })

  it('asks for one model, with the key in a header and a custom base URL', async () => {
    const f = stubFetch({ body: {} })
    await validateGeminiKey('KEY', { fetch: f.fn, baseUrl: 'http://stub.local/v1' })
    expect(f.calls[0]!.url).toBe('http://stub.local/v1/models?pageSize=1')
    expect((f.calls[0]!.init.headers as Record<string, string>)['x-goog-api-key']).toBe('KEY')
    expect(f.calls[0]!.url).not.toContain('KEY')
  })

  it.each([400, 401, 403])('maps %i to a key error', async (status) => {
    expect(await kindOf(validate({ status }))).toBe('key')
  })

  it.each([404, 429, 500, 503])(
    'maps %i to a failed (not key) error: Google is the problem',
    async (status) => {
      const error = (await validate({ status }).catch((e: AiError) => e)) as AiError
      expect(error.kind).toBe('failed')
      expect(error.message).toBe(`Gemini answered ${status}`)
    },
  )

  it('maps a network failure to a failed error', async () => {
    const error = (await validate(async () => {
      throw new TypeError('fetch failed')
    }).catch((e: AiError) => e)) as AiError
    expect(error.kind).toBe('failed')
    expect(error.message).toContain('Could not reach Gemini')
  })

  it('times out on a hanging connection', async () => {
    const hang = (async (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(init.signal!.reason))
      })) as unknown as typeof fetch
    expect(await kindOf(validateGeminiKey('KEY', { fetch: hang, timeoutMs: 20 }))).toBe('failed')
  })
})

describe('generateJson with a scripted provider', () => {
  const schema = z.object({ ok: z.boolean() })
  const providerOf = (answers: string[]) => {
    const prompts: string[] = []
    return {
      prompts,
      provider: {
        label: 't',
        async complete(r: { prompt: string }) {
          prompts.push(r.prompt)
          return answers.shift() ?? ''
        },
      },
    }
  }

  it('accepts a valid answer at once', async () => {
    const p = providerOf(['{"ok":true}'])
    expect(await generateJson(p.provider, request, schema)).toEqual({ ok: true })
    expect(p.prompts).toHaveLength(1)
  })

  it('asks again once for valid JSON of the wrong shape, then gives up with a failed AiError', async () => {
    const p = providerOf(['{"ok":"yes"}', '{"nope":1}', '{"ok":true}'])
    await expect(generateJson(p.provider, request, schema)).rejects.toMatchObject({
      kind: 'failed',
    })
    expect(p.prompts).toHaveLength(2)
    expect(p.prompts[1]).toContain('previous answer was not valid')
  })

  it('never asks a third time', async () => {
    const p = providerOf(['x', 'y', '{"ok":true}'])
    await expect(generateJson(p.provider, request, schema)).rejects.toBeInstanceOf(AiError)
    expect(p.prompts).toHaveLength(2)
  })

  it('lets a provider error pass through unchanged (no retry)', async () => {
    const boom = new AiError('busy', 'quota')
    const calls: number[] = []
    const provider = {
      label: 't',
      async complete() {
        calls.push(1)
        throw boom
      },
    }
    await expect(generateJson(provider, request, schema)).rejects.toBe(boom)
    expect(calls).toHaveLength(1)
  })

  it('does not crash on a huge answer without JSON', async () => {
    const p = providerOf(['x'.repeat(2_000_000), 'y'.repeat(10)])
    await expect(generateJson(p.provider, request, schema)).rejects.toBeInstanceOf(AiError)
  })
})

describe('extractJson (edge cases)', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'blank'],
    ['}{', 'braces in the wrong order'],
    ['[1,2,3]', 'an array only'],
    ['```json\n```', 'an empty fence'],
    ['{"a":', 'cut off'],
  ])('throws for %j (%s)', (text) => {
    expect(() => extractJson(text)).toThrow()
  })

  it('reads a fence without a language tag and text on both sides', () => {
    expect(extractJson('Sure:\n```\n{"a":1}\n```\nHope that helps')).toEqual({ a: 1 })
  })

  it('reads nested objects and braces inside strings', () => {
    expect(extractJson('{"a":{"b":"}{"}}')).toEqual({ a: { b: '}{' } })
  })

  it('takes the span from the first { to the last }, so two objects fail to parse', () => {
    expect(() => extractJson('{"a":1} and {"b":2}')).toThrow()
  })
})
