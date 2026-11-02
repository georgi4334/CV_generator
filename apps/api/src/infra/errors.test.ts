import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { HttpError, isDatabaseUnavailable, notFound, registerErrorHandler } from './errors'

describe('isDatabaseUnavailable', () => {
  it('recognises a refused connection wrapped in a query error', () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5433'), {
      code: 'ECONNREFUSED',
    })
    const error = new Error('Failed query: select ...', { cause })
    expect(isDatabaseUnavailable(error)).toBe(true)
  })

  it('recognises Postgres shutting down', () => {
    expect(isDatabaseUnavailable(Object.assign(new Error('terminating'), { code: '57P01' }))).toBe(
      true,
    )
  })

  it('does not treat other database errors as an outage', () => {
    expect(
      isDatabaseUnavailable(Object.assign(new Error('duplicate key'), { code: '23505' })),
    ).toBe(false)
    expect(isDatabaseUnavailable(new Error('boom'))).toBe(false)
  })
})

describe('isDatabaseUnavailable (more)', () => {
  it.each([
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'CONNECT_TIMEOUT',
    'CONNECTION_CLOSED',
    '08006',
  ])('treats %s as an outage', (code) => {
    expect(isDatabaseUnavailable(Object.assign(new Error('x'), { code }))).toBe(true)
  })

  it.each([null, undefined, 'ECONNREFUSED', 42, {}, { code: 5 }])(
    'is false for %j (not an error object with a known code)',
    (value) => {
      expect(isDatabaseUnavailable(value)).toBe(false)
    },
  )

  it('stops looking after a few levels of causes (and survives a cycle)', () => {
    const deep = new Error('0', {
      cause: new Error('1', {
        cause: new Error('2', {
          cause: new Error('3', {
            cause: new Error('4', {
              cause: Object.assign(new Error('5'), { code: 'ECONNREFUSED' }),
            }),
          }),
        }),
      }),
    })
    expect(isDatabaseUnavailable(deep)).toBe(false)
    const loop: { cause?: unknown } = {}
    loop.cause = loop
    expect(isDatabaseUnavailable(loop)).toBe(false)
  })
})

describe('error handler', () => {
  const build = async (options: { exposeErrors?: boolean } = {}) => {
    const reported: Error[] = []
    const app = Fastify({ bodyLimit: 1024 })
    registerErrorHandler(app, {
      exposeErrors: options.exposeErrors ?? false,
      onServerError: (error) => reported.push(error),
    })
    app.get('/http', async () => {
      throw new HttpError(418, 'teapot', 'I am a teapot', { why: 'tea' })
    })
    app.get('/http-plain', async () => {
      throw notFound('Thing')
    })
    app.get('/zod', async () => {
      z.object({ a: z.string() }).parse({ a: 1 })
    })
    app.get('/boom', async () => {
      throw new Error('secret database password is hunter2')
    })
    app.get('/string-throw', async () => {
      throw 'just a string'
    })
    app.get('/status-400', async () => {
      throw Object.assign(new Error('custom client error'), { statusCode: 400 })
    })
    app.get('/status-503', async () => {
      throw Object.assign(new Error('upstream gone'), { statusCode: 503 })
    })
    app.get('/db-down', async () => {
      throw new Error('Failed query: select 1 from secret_table', {
        cause: Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:5432'), {
          code: 'ECONNREFUSED',
        }),
      })
    })
    app.post('/echo', async (request) => ({ body: request.body }))
    await app.ready()
    return { app, reported }
  }

  it('turns an HttpError into its status, code, message and details', async () => {
    const { app } = await build()
    const res = await app.inject({ method: 'GET', url: '/http' })
    expect(res.statusCode).toBe(418)
    expect(res.json()).toEqual({
      error: { code: 'teapot', message: 'I am a teapot', details: { why: 'tea' } },
    })
  })

  it('leaves out details when there are none', async () => {
    const { app } = await build()
    const res = await app.inject({ method: 'GET', url: '/http-plain' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: { code: 'not_found', message: 'Thing not found' } })
  })

  it('maps a ZodError to 400 validation_error with the issues', async () => {
    const { app, reported } = await build()
    const res = await app.inject({ method: 'GET', url: '/zod' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('validation_error')
    expect(res.json().error.details[0]).toMatchObject({ path: ['a'], code: 'invalid_type' })
    expect(reported).toHaveLength(0)
  })

  it('hides the cause of an unknown error behind a generic 500 and reports it', async () => {
    const { app, reported } = await build()
    const res = await app.inject({ method: 'GET', url: '/boom' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({
      error: { code: 'internal_error', message: 'Something went wrong on the server' },
    })
    expect(res.payload).not.toContain('hunter2')
    expect(reported.map((e) => e.message)).toEqual(['secret database password is hunter2'])
  })

  it('shows the cause of a 500 only when exposeErrors is on (development)', async () => {
    const { app } = await build({ exposeErrors: true })
    const res = await app.inject({ method: 'GET', url: '/boom' })
    expect(res.statusCode).toBe(500)
    expect(res.json().error.details).toEqual({ cause: 'secret database password is hunter2' })
  })

  it('does not crash on a thrown non-Error value', async () => {
    const { app } = await build()
    const res = await app.inject({ method: 'GET', url: '/string-throw' })
    expect(res.statusCode).toBe(500)
    expect(res.payload).not.toContain('stack')
  })

  it('keeps a client error status from other libraries as bad_request and does not report it', async () => {
    const { app, reported } = await build()
    const res = await app.inject({ method: 'GET', url: '/status-400' })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: { code: 'bad_request', message: 'custom client error' } })
    expect(reported).toHaveLength(0)
  })

  it('treats a 5xx status from another library as an internal error without leaking its text', async () => {
    const { app, reported } = await build()
    const res = await app.inject({ method: 'GET', url: '/status-503' })
    expect(res.statusCode).toBe(500)
    expect(res.payload).not.toContain('upstream gone')
    expect(reported).toHaveLength(1)
  })

  it('answers 503 database_unavailable for a connection error, without the SQL or host', async () => {
    const { app, reported } = await build()
    const res = await app.inject({ method: 'GET', url: '/db-down' })
    expect(res.statusCode).toBe(503)
    expect(res.json().error.code).toBe('database_unavailable')
    expect(res.payload).not.toContain('secret_table')
    expect(res.payload).not.toContain('10.0.0.5')
    expect(reported).toHaveLength(0)
  })

  it('gives the underlying connection error in development', async () => {
    const { app } = await build({ exposeErrors: true })
    const res = await app.inject({ method: 'GET', url: '/db-down' })
    expect(res.json().error.details).toEqual({ cause: 'connect ECONNREFUSED 10.0.0.5:5432' })
  })

  it('answers a body over the limit with 413 and a JSON error', async () => {
    const { app } = await build()
    const res = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ text: 'x'.repeat(2000) }),
    })
    expect(res.statusCode).toBe(413)
    expect(res.json().error.code).toBe('bad_request')
  })

  it.each(['{"a":', '{a:1}', 'not json', '{"a":1}}', '\u0000'])(
    'answers malformed JSON %j with 400',
    async (payload) => {
      const { app } = await build()
      const res = await app.inject({
        method: 'POST',
        url: '/echo',
        headers: { 'content-type': 'application/json' },
        payload,
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('bad_request')
    },
  )

  it('answers an unsupported content type with 415', async () => {
    const { app } = await build()
    const res = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/xml' },
      payload: '<a/>',
    })
    expect(res.statusCode).toBe(415)
    expect(res.json().error.code).toBe('bad_request')
  })

  it('answers unknown routes and wrong methods with the JSON 404', async () => {
    const { app } = await build()
    const res = await app.inject({ method: 'DELETE', url: '/boom?x=<script>' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('not_found')
  })
})
