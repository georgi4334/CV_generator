import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TEST_USER } from '@/test/fakeAuthApi'
import { authKeys } from './authKeys'
import { api, ApiRequestError, assetUrl, toApiRequestError } from './client'
import { queryClient } from './queryClient'

type Reply = { status: number; data: unknown }

/** Makes the next requests answer like a server would (axios rejects non-2xx itself). */
function answerWith(reply: Reply | ((config: InternalAxiosRequestConfig) => Reply | Error)) {
  const adapter: AxiosAdapter = async (config) => {
    const result = typeof reply === 'function' ? reply(config) : reply
    if (result instanceof Error) throw result
    const response = { ...result, statusText: '', headers: {}, config }
    if (result.status >= 200 && result.status < 300) return response
    throw new AxiosError(
      `Request failed with status code ${result.status}`,
      AxiosError.ERR_BAD_RESPONSE,
      config,
      null,
      response,
    )
  }
  api.defaults.adapter = adapter
}

const originalAdapter = api.defaults.adapter
beforeEach(() => queryClient.setQueryData(authKeys.me, TEST_USER))
afterEach(() => {
  api.defaults.adapter = originalAdapter
  queryClient.clear()
})

const failure = async (request: Promise<unknown>) => {
  const error = await request.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ApiRequestError)
  return error as ApiRequestError
}

describe('toApiRequestError', () => {
  it('keeps an ApiRequestError as it is', () => {
    const error = new ApiRequestError(409, 'conflict', 'x')
    expect(toApiRequestError(error)).toBe(error)
  })

  it.each([
    ['a string', 'boom', 'boom'],
    ['a plain Error', new Error('bad thing'), 'bad thing'],
    ['null', null, 'null'],
    ['undefined', undefined, 'undefined'],
    ['a number', 42, '42'],
  ])('turns %s into an unknown_error that can be retried', (_, cause, message) => {
    const error = toApiRequestError(cause)
    expect(error).toMatchObject({ status: null, code: 'unknown_error', message })
    expect(error.retryable).toBe(true)
  })

  it('does not throw on circular objects', () => {
    const loop: Record<string, unknown> = {}
    loop.self = loop
    expect(() => toApiRequestError(loop)).not.toThrow()
  })

  it('reads the API error body, including details', () => {
    const cause = new AxiosError('x', 'ERR_BAD_REQUEST', undefined, null, {
      status: 402,
      data: { error: { code: 'plan_limit', message: 'Upgrade', details: { max: 3 } } },
      statusText: '',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    })
    expect(toApiRequestError(cause)).toMatchObject({
      status: 402,
      code: 'plan_limit',
      message: 'Upgrade',
      details: { max: 3 },
    })
  })
})

describe('ApiRequestError.retryable', () => {
  it.each([
    [null, true],
    [500, true],
    [502, true],
    [503, true],
    [599, true],
    [400, false],
    [401, false],
    [404, false],
    [409, false],
    // A rate limit is not retried automatically (the user decides when to try again).
    [429, false],
  ])('status %s -> retryable %s', (status, retryable) => {
    expect(new ApiRequestError(status, 'x', 'm').retryable).toBe(retryable)
  })
})

describe('the api client turns every failure into an ApiRequestError', () => {
  it('a network error (no response) is a retryable network_error', async () => {
    answerWith(() => new AxiosError('Network Error', AxiosError.ERR_NETWORK))
    const error = await failure(api.get('/cvs'))
    expect(error).toMatchObject({ status: null, code: 'network_error' })
    expect(error.retryable).toBe(true)
  })

  it('a timeout is reported like a network error', async () => {
    answerWith(() => new AxiosError('timeout of 15000ms exceeded', AxiosError.ECONNABORTED))
    const error = await failure(api.get('/cvs'))
    expect(error).toMatchObject({ status: null, code: 'network_error' })
  })

  it('a cancelled request does not crash the error handling', async () => {
    answerWith(() => new AxiosError('canceled', AxiosError.ERR_CANCELED))
    const error = await failure(api.get('/cvs'))
    expect(error.status).toBeNull()
  })

  it('a 500 with an HTML body becomes a generic http_error, not a crash', async () => {
    answerWith({ status: 500, data: '<html><body><h1>502 Bad Gateway</h1></body></html>' })
    const error = await failure(api.get('/cvs'))
    expect(error).toMatchObject({ status: 500, code: 'http_error' })
    expect(error.message).toBe('The server answered with status 500')
    expect(error.message).not.toContain('<html>')
    expect(error.retryable).toBe(true)
  })

  it.each([
    ['an empty body', ''],
    ['a null body', null],
    ['an array', []],
    ['an error without a code', { error: { message: 'oops' } }],
    ['an error that is a string', { error: 'oops' }],
    ['a numeric code', { error: { code: 5, message: 'x' } }],
  ])('a 503 with %s falls back to http_error', async (_, data) => {
    answerWith({ status: 503, data })
    expect(await failure(api.get('/x'))).toMatchObject({ status: 503, code: 'http_error' })
  })

  it('keeps the code of an error the web app does not know yet', async () => {
    answerWith({
      status: 418,
      data: { error: { code: 'teapot_overflow', message: 'I am a teapot' } },
    })
    expect(await failure(api.get('/x'))).toMatchObject({
      status: 418,
      code: 'teapot_overflow',
      message: 'I am a teapot',
    })
  })

  it('a 429 keeps its code and is not retried automatically', async () => {
    answerWith({
      status: 429,
      data: { error: { code: 'rate_limited', message: 'Slow down' } },
    })
    const error = await failure(api.post('/ai/assist', {}))
    expect(error).toMatchObject({ status: 429, code: 'rate_limited' })
    expect(error.retryable).toBe(false)
  })

  it('a 429 without the API body still gives a usable error', async () => {
    answerWith({ status: 429, data: 'Too Many Requests' })
    expect(await failure(api.get('/x'))).toMatchObject({ status: 429, code: 'http_error' })
  })

  it('passes successful responses through untouched', async () => {
    answerWith({ status: 200, data: { ok: true } })
    expect((await api.get('/x')).data).toEqual({ ok: true })
  })
})

describe('an ended session (401)', () => {
  const unauthorized = { status: 401, data: { error: { code: 'unauthorized', message: 'No' } } }

  it('signs the user out of the cache', async () => {
    answerWith(unauthorized)
    await failure(api.get('/cvs'))
    expect(queryClient.getQueryData(authKeys.me)).toBeNull()
  })

  it('does so once for a burst of parallel 401s and keeps the cache consistent', async () => {
    answerWith(unauthorized)
    const seen: unknown[] = []
    const stop = queryClient.getQueryCache().subscribe(() => {
      seen.push(queryClient.getQueryData(authKeys.me))
    })
    const errors = await Promise.all(Array.from({ length: 20 }, () => failure(api.get('/cvs'))))
    stop()
    expect(errors.every((e) => e.status === 401)).toBe(true)
    expect(queryClient.getQueryData(authKeys.me)).toBeNull()
    // Every 401 writes the same value; subscribers only ever see "signed out", never a flip-flop.
    expect(new Set(seen)).toEqual(new Set([null]))
  })

  it('leaves a failed sign-in on its own page (no sign-out)', async () => {
    answerWith({
      status: 401,
      data: { error: { code: 'invalid_credentials', message: 'Wrong email or password' } },
    })
    const error = await failure(api.post('/auth/login', {}))
    expect(error.code).toBe('invalid_credentials')
    expect(queryClient.getQueryData(authKeys.me)).toEqual(TEST_USER)
  })

  it.each([403, 404, 409, 500])('does not sign out on a %s', async (status) => {
    answerWith({ status, data: { error: { code: 'x', message: 'y' } } })
    await failure(api.get('/cvs'))
    expect(queryClient.getQueryData(authKeys.me)).toEqual(TEST_USER)
  })

  it('does not sign out on a network error', async () => {
    answerWith(() => new AxiosError('Network Error', AxiosError.ERR_NETWORK))
    await failure(api.get('/cvs'))
    expect(queryClient.getQueryData(authKeys.me)).toEqual(TEST_USER)
  })
})

describe('assetUrl', () => {
  it.each([
    [null, undefined],
    ['', undefined],
    ['/api/uploads/a.png', '/api/uploads/a.png'],
    ['https://cdn.example.com/a.png', 'https://cdn.example.com/a.png'],
    ['data:image/png;base64,AAAA', 'data:image/png;base64,AAAA'],
    ['relative/a.png', 'relative/a.png'],
  ])('%s -> %s when the API is on the same origin', (url, expected) => {
    expect(assetUrl(url)).toBe(expected)
  })
})

describe('assetUrl when the API lives on another origin', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('points uploaded images at the API and leaves other urls alone', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api')
    vi.resetModules()
    const { assetUrl: remote } = await import('./client')
    expect(remote('/api/uploads/a.png')).toBe('https://api.example.com/api/uploads/a.png')
    expect(remote('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
    expect(remote('/other/a.png')).toBe('/other/a.png')
    expect(remote(null)).toBeUndefined()
  })
})
