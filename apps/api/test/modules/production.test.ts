import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app'
import { productionProblems, productionWarnings } from '../../src/config/production'
import type { Env } from '../../src/config/env'
import { createBrevoMailer } from '../../src/infra/mailer'
import { createR2Storage } from '../../src/infra/storage/r2'
import { createLocalStorage } from '../../src/infra/storage/index'
import { dbAvailable, useTestApp } from '../support/context'

function recordingFetch(respond: (request: Request) => Response) {
  const requests: Request[] = []
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push(request)
    return respond(request)
  }) as typeof fetch
  return { fn, requests }
}

describe('R2 storage', () => {
  const options = {
    accountId: 'acc',
    accessKeyId: 'AKID',
    secretAccessKey: 'SECRET',
    bucket: 'uploads',
  }

  it('signs uploads, downloads and deletes against the bucket URL', async () => {
    const f = recordingFetch((request) =>
      request.method === 'GET' ? new Response('IMAGE') : new Response(null, { status: 200 }),
    )
    const storage = createR2Storage({ ...options, fetch: f.fn })
    await storage.put('abc.png', Buffer.from('IMAGE'), 'image/png')
    const stream = await storage.get('abc.png')
    const chunks: Buffer[] = []
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
    expect(Buffer.concat(chunks).toString()).toBe('IMAGE')
    await storage.remove('abc.png')

    expect(f.requests.map((r) => `${r.method} ${r.url}`)).toEqual([
      'PUT https://acc.r2.cloudflarestorage.com/uploads/abc.png',
      'GET https://acc.r2.cloudflarestorage.com/uploads/abc.png',
      'DELETE https://acc.r2.cloudflarestorage.com/uploads/abc.png',
    ])
    for (const request of f.requests) {
      expect(request.headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\//)
    }
    expect(f.requests[0]!.headers.get('content-type')).toBe('image/png')
  })

  it('returns null for a missing file and reports other errors', async () => {
    const missing = createR2Storage({
      ...options,
      fetch: recordingFetch(() => new Response('', { status: 404 })).fn,
    })
    expect(await missing.get('x.png')).toBeNull()
    await expect(missing.remove('x.png')).resolves.toBeUndefined()
    const broken = createR2Storage({
      ...options,
      fetch: recordingFetch(() => new Response('denied', { status: 403 })).fn,
    })
    await expect(broken.put('x.png', Buffer.from('1'), 'image/png')).rejects.toThrow(/403/)
  })

  it('refuses keys that could escape the bucket', async () => {
    const storage = createR2Storage({
      ...options,
      fetch: recordingFetch(() => new Response('')).fn,
    })
    await expect(storage.get('../other/x.png')).rejects.toThrow(/Invalid storage key/)
  })
})

describe('Brevo mailer', () => {
  it('sends a text email from the verified sender', async () => {
    const f = recordingFetch(() => new Response('{"messageId":"1"}', { status: 201 }))
    const mailer = createBrevoMailer({
      apiKey: 'KEY',
      from: { email: 'me@example.com', name: 'CV Generator' },
      fetch: f.fn,
    })
    await mailer.send({ to: 'ann@example.com', subject: 'Hi', text: 'Body' })
    const request = f.requests[0]!
    expect(request.url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(request.headers.get('api-key')).toBe('KEY')
    expect(await request.json()).toEqual({
      sender: { email: 'me@example.com', name: 'CV Generator' },
      to: [{ email: 'ann@example.com' }],
      subject: 'Hi',
      textContent: 'Body',
    })
  })

  it('reports a refused email', async () => {
    const mailer = createBrevoMailer({
      apiKey: 'KEY',
      from: { email: 'me@example.com', name: 'x' },
      fetch: recordingFetch(() => new Response('unauthorized', { status: 401 })).fn,
    })
    await expect(mailer.send({ to: 'a@b.c', subject: 's', text: 't' })).rejects.toThrow(/401/)
  })
})

describe('production configuration', () => {
  const base = {
    NODE_ENV: 'production',
    STORAGE: 'r2',
    R2_ACCOUNT_ID: 'a',
    R2_ACCESS_KEY_ID: 'b',
    R2_SECRET_ACCESS_KEY: 'c',
    R2_BUCKET: 'd',
    BREVO_API_KEY: 'k',
    MAIL_FROM: 'me@example.com',
    APP_URL: 'https://cv.pages.dev',
    CORS_ORIGIN: 'https://cv.pages.dev',
    PROXY_SECRET: 'x'.repeat(40),
    SENTRY_DSN: 'https://dsn',
    GEMINI_API_KEY: 'g',
  } as unknown as Env

  it('accepts a complete setup', () => {
    expect(productionProblems(base)).toEqual([])
    expect(productionWarnings(base)).toEqual([])
  })

  it('names what is missing', () => {
    const env = {
      ...base,
      STORAGE: 'local',
      BREVO_API_KEY: '',
      APP_URL: 'http://localhost:5173',
      PROXY_SECRET: 'short',
    } as Env
    expect(productionProblems(env)).toEqual([
      'STORAGE must be r2 (the server disk is not kept)',
      'Emails need BREVO_API_KEY',
      'APP_URL must be the public web address',
      'PROXY_SECRET must be at least 32 characters',
    ])
  })

  it('checks nothing in development', () => {
    expect(
      productionProblems({ ...base, NODE_ENV: 'development', STORAGE: 'local' } as Env),
    ).toEqual([])
  })
})

describe.skipIf(!dbAvailable)('behind the web app proxy', () => {
  const ctx = useTestApp()
  const SECRET = 's'.repeat(40)
  const appWithProxy = async () => {
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      database: ctx.database,
      storage: createLocalStorage('/tmp/unused'),
      proxySecret: SECRET,
    })
    return app
  }

  it('refuses requests without the secret, except health checks', async () => {
    const app = await appWithProxy()
    const direct = await app.inject({
      method: 'GET',
      url: '/api/cvs',
      headers: { cookie: ctx.cookie },
    })
    expect(direct.statusCode).toBe(403)
    expect(direct.json().error.code).toBe('forbidden')
    const wrong = await app.inject({
      method: 'GET',
      url: '/api/cvs',
      headers: { cookie: ctx.cookie, 'x-proxy-secret': 'nope' },
    })
    expect(wrong.statusCode).toBe(403)
    const proxied = await app.inject({
      method: 'GET',
      url: '/api/cvs',
      headers: { cookie: ctx.cookie, 'x-proxy-secret': SECRET },
    })
    expect(proxied.statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/api/ping' })).json()).toEqual({ ok: true })
    expect((await app.inject({ method: 'GET', url: '/api/health?x=1' })).statusCode).toBe(200)
    await app.close()
  })

  it('rate-limits by the client address the proxy forwards', async () => {
    const app = await appWithProxy()
    const login = (ip: string) =>
      app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'nobody@example.com', password: 'wrong password' },
        headers: { 'x-proxy-secret': SECRET, 'x-client-ip': ip },
      })
    for (let i = 0; i < 10; i++) expect((await login('1.1.1.1')).statusCode).toBe(401)
    expect((await login('1.1.1.1')).statusCode).toBe(429)
    expect((await login('2.2.2.2')).statusCode).toBe(401)
    await app.close()
  })

  it('sends hardening headers', async () => {
    const app = await appWithProxy()
    const res = await app.inject({ method: 'GET', url: '/api/ping' })
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    await app.close()
  })
})
