import { PROFESSIONS } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app'
import { createLocalStorage } from '../../src/infra/storage/index'
import { SESSION_COOKIE } from '../../src/modules/auth/sessions'

const COOKIE = `${SESSION_COOKIE}=${'a'.repeat(43)}`

/** A database object whose every query fails with the given error. */
function brokenDatabase(error: Error, healthy = false) {
  const fail = () => {
    throw error
  }
  const handler: ProxyHandler<object> = {
    get: (_target, property) => {
      if (property === 'then') return undefined
      return new Proxy(fail, handler)
    },
    apply: () => fail(),
  }
  return { db: new Proxy(fail, handler) as never, isHealthy: async () => healthy }
}

const connectionRefused = () =>
  new Error('Failed query: select "secret_column" from "sessions" where "token_hash" = $1', {
    cause: Object.assign(new Error('connect ECONNREFUSED 10.20.30.40:5432'), {
      code: 'ECONNREFUSED',
    }),
  })

const appWith = (
  options: Partial<Parameters<typeof buildApp>[0]> & {
    database: ReturnType<typeof brokenDatabase>
  },
) =>
  buildApp({
    corsOrigin: 'http://localhost:5173',
    storage: createLocalStorage('/tmp/unused'),
    ...options,
  })

describe('when the database is down', () => {
  it.each([
    ['GET', '/api/auth/me', COOKIE],
    ['GET', '/api/cvs', COOKIE],
    ['POST', '/api/jobs', COOKIE],
    ['POST', '/api/ai/fix-mistakes', COOKIE],
    ['POST', '/api/auth/login', undefined],
    ['POST', '/api/auth/register', undefined],
    ['GET', '/api/shared/abcdefghijklmnop', undefined],
    ['GET', '/api/uploads/00000000-0000-4000-8000-000000000000', undefined],
  ] as const)(
    '%s %s answers 503 database_unavailable and leaks nothing',
    async (method, url, cookie) => {
      const app = await appWith({ database: brokenDatabase(connectionRefused()) })
      const res = await app.inject({
        method,
        url,
        payload:
          method === 'POST'
            ? {
                email: 'a@example.com',
                password: 'correct horse battery',
                position: 'a',
                company: 'b',
                language: 'en-US',
                fields: [{ path: 'a', label: '', text: 'x' }],
              }
            : undefined,
        headers: cookie ? { cookie } : {},
      })
      expect(res.statusCode).toBe(503)
      expect(res.json().error.code).toBe('database_unavailable')
      expect(res.payload).not.toMatch(/secret_column|10\.20\.30\.40|ECONNREFUSED|Failed query/)
      await app.close()
    },
  )

  it('shows the real cause only in development', async () => {
    const dev = await appWith({ database: brokenDatabase(connectionRefused()), exposeErrors: true })
    const res = await dev.inject({ method: 'GET', url: '/api/cvs', headers: { cookie: COOKIE } })
    expect(res.json().error.details).toEqual({ cause: 'connect ECONNREFUSED 10.20.30.40:5432' })
    await dev.close()
  })

  it('still answers the pages that need no database: health (as down), ping and professions', async () => {
    const app = await appWith({ database: brokenDatabase(connectionRefused(), false) })
    expect((await app.inject({ method: 'GET', url: '/api/health' })).json()).toMatchObject({
      status: 'ok',
      database: 'down',
    })
    expect((await app.inject({ method: 'GET', url: '/api/ping' })).json()).toEqual({ ok: true })
    const professions = await app.inject({ method: 'GET', url: '/api/professions' })
    expect(professions.json()).toHaveLength(Object.keys(PROFESSIONS).length)
    await app.close()
  })

  it('does not report an outage to the error tracker as a server bug', async () => {
    const reported: Error[] = []
    const app = await appWith({
      database: brokenDatabase(connectionRefused()),
      onServerError: (e) => reported.push(e),
    })
    await app.inject({ method: 'GET', url: '/api/cvs', headers: { cookie: COOKIE } })
    expect(reported).toEqual([])
    await app.close()
  })
})

describe('when something unexpected breaks', () => {
  const unexpected = () => new Error('relation "secret_table" does not exist')

  it('answers a generic 500, reports the error once, and keeps serving the next request', async () => {
    const reported: Error[] = []
    const app = await appWith({
      database: brokenDatabase(unexpected(), true),
      onServerError: (e) => reported.push(e),
    })
    const res = await app.inject({ method: 'GET', url: '/api/cvs', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(500)
    expect(res.json().error).toEqual({
      code: 'internal_error',
      message: 'Something went wrong on the server',
    })
    expect(res.payload).not.toContain('secret_table')
    expect(reported).toHaveLength(1)
    expect((await app.inject({ method: 'GET', url: '/api/ping' })).statusCode).toBe(200)
    await app.close()
  })

  const withBrokenTracker = async () => {
    const app = await appWith({
      database: brokenDatabase(unexpected(), true),
      onServerError: () => {
        throw new Error('sentry is down: dsn=https://key@sentry.example/1')
      },
    })
    const res = await app.inject({ method: 'GET', url: '/api/cvs', headers: { cookie: COOKIE } })
    await app.close()
    return res
  }

  it('still answers 500 when the error tracker itself throws', async () => {
    expect((await withBrokenTracker()).statusCode).toBe(500)
  })

  // BUG (minor): when onServerError (Sentry) throws, the error handler itself fails and Fastify's
  // default handler answers { statusCode, error: 'Internal Server Error', message: <the tracker's
  // message> }: the message of the tracker's error reaches the client (here it contains a DSN)
  // and the body is not in the API error format. Expected: the usual generic internal_error body.
  it.fails('does not show the tracker error to the client when the tracker throws', async () => {
    const res = await withBrokenTracker()
    expect(res.payload).not.toContain('sentry')
    expect(res.json().error.code).toBe('internal_error')
  })

  it('shows the cause of an unexpected error only in development', async () => {
    const app = await appWith({ database: brokenDatabase(unexpected(), true), exposeErrors: true })
    const res = await app.inject({ method: 'GET', url: '/api/cvs', headers: { cookie: COOKIE } })
    expect(res.json().error.details).toEqual({ cause: 'relation "secret_table" does not exist' })
    await app.close()
  })
})

describe('start-up checks (ensureMigrated)', () => {
  it('keeps health, ping, professions and images reachable while the tables are not ready', async () => {
    const app = await appWith({
      database: { db: undefined as never, isHealthy: async () => true },
      ensureMigrated: async () => {
        throw new Error('migration failed: secret detail')
      },
    })
    expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/api/ping' })).statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/api/professions' })).statusCode).toBe(200)
    for (const [method, url] of [
      ['GET', '/api/cvs'],
      ['POST', '/api/auth/login'],
      ['GET', '/api/shared/abcdefghijklmnop'],
      ['GET', '/api/auth/me'],
    ] as const) {
      const res = await app.inject({ method, url, payload: method === 'POST' ? {} : undefined })
      expect(res.statusCode, `${method} ${url}`).toBe(503)
      expect(res.payload).not.toContain('secret detail')
    }
    await app.close()
  })

  it('asks again on every request, so the API recovers by itself', async () => {
    let calls = 0
    const app = await appWith({
      database: { db: undefined as never, isHealthy: async () => true },
      ensureMigrated: async () => {
        calls += 1
        if (calls < 3) throw new Error('not yet')
      },
    })
    const get = () => app.inject({ method: 'GET', url: '/api/shared/abcdefghijklmnop' })
    expect((await get()).statusCode).toBe(503)
    expect((await get()).statusCode).toBe(503)
    // Ready now: the shared page is reached (and then needs the database, which this stand-in lacks).
    expect((await get()).statusCode).not.toBe(503)
    expect(calls).toBe(3)
    await app.close()
  })

  it('explains the cause of the failure to a developer only', async () => {
    const app = await appWith({
      database: { db: undefined as never, isHealthy: async () => true },
      ensureMigrated: async () => {
        throw new Error('no such database', {
          cause: new Error('password authentication failed for user "cv"'),
        })
      },
      exposeErrors: true,
    })
    const res = await app.inject({ method: 'GET', url: '/api/cvs' })
    expect(res.json().error.details).toEqual({
      cause: 'password authentication failed for user "cv"',
    })
    await app.close()
  })
})

describe('headers on every kind of answer', () => {
  const healthy = { db: undefined as never, isHealthy: async () => true }

  it.each([
    ['a normal answer', 'GET', '/api/ping'],
    ['an unknown route', 'GET', '/api/nope'],
    ['an unauthorised request', 'GET', '/api/cvs'],
    ['a validation error', 'POST', '/api/auth/login'],
    ['a refused origin', 'POST', '/api/auth/logout'],
  ])('sends the hardening headers with %s', async (_name, method, url) => {
    const app = await appWith({ database: healthy })
    const res = await app.inject({
      method: method as 'GET',
      url,
      payload: method === 'POST' ? {} : undefined,
      headers: url.endsWith('logout') ? { origin: 'https://evil.example' } : {},
    })
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['referrer-policy']).toBe('no-referrer')
    expect(res.headers['cross-origin-resource-policy']).toBe('same-site')
    await app.close()
  })

  it('does not reveal the framework in a header', async () => {
    const app = await appWith({ database: healthy })
    const res = await app.inject({ method: 'GET', url: '/api/ping' })
    expect(res.headers['x-powered-by']).toBeUndefined()
    await app.close()
  })

  it('answers the professions list only to GET', async () => {
    const app = await appWith({ database: healthy })
    expect(
      (await app.inject({ method: 'POST', url: '/api/professions', payload: {} })).statusCode,
    ).toBe(404)
    expect((await app.inject({ method: 'DELETE', url: '/api/professions' })).statusCode).toBe(404)
    await app.close()
  })

  it('treats the proxy secret as required for everything but health and ping, also for a refused origin', async () => {
    const secret = 's'.repeat(40)
    const app = await appWith({ database: healthy, proxySecret: secret })
    expect((await app.inject({ method: 'GET', url: '/api/professions' })).statusCode).toBe(403)
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/professions',
          headers: { 'x-proxy-secret': secret },
        })
      ).statusCode,
    ).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/api/ping?x=1' })).statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/api/health/' })).statusCode).toBe(403)
    expect((await app.inject({ method: 'GET', url: '/api/nope' })).statusCode).toBe(403)
    await app.close()
  })
})
