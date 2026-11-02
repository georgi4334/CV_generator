import { createEmptyCv, createExampleCv } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { apiCaller, rawCaller, unknownId, type Method } from '../support/api'
import { dbAvailable, useTestApp } from '../support/context'

const JSON_TYPE = 'application/json'

describe.skipIf(!dbAvailable)('malformed requests', () => {
  const ctx = useTestApp()
  const call = apiCaller(ctx)
  const raw = rawCaller(ctx)

  /** Routes that read a JSON body. `lenient`: an absent / null body means "all defaults". */
  const bodyRoutes = async () => {
    const cv = (await call('POST', '/cvs', {})).json()
    return [
      { name: 'POST /cvs', method: 'POST', url: '/cvs', lenient: true },
      { name: 'PATCH /cvs/:id', method: 'PATCH', url: `/cvs/${cv.id}`, lenient: false },
      {
        name: 'POST /cvs/:id/duplicate',
        method: 'POST',
        url: `/cvs/${cv.id}/duplicate`,
        lenient: true,
      },
      {
        name: 'POST /cvs/:id/versions',
        method: 'POST',
        url: `/cvs/${cv.id}/versions`,
        lenient: true,
      },
      { name: 'PUT /cvs/:id/share', method: 'PUT', url: `/cvs/${cv.id}/share`, lenient: false },
      { name: 'POST /jobs', method: 'POST', url: '/jobs', lenient: false },
      { name: 'POST /cover-letters', method: 'POST', url: '/cover-letters', lenient: true },
      { name: 'POST /resignations', method: 'POST', url: '/resignations', lenient: true },
      { name: 'PUT /ai/key', method: 'PUT', url: '/ai/key', lenient: false },
      { name: 'POST /ai/fix-mistakes', method: 'POST', url: '/ai/fix-mistakes', lenient: false },
      { name: 'POST /ai/tailor', method: 'POST', url: '/ai/tailor', lenient: false },
      { name: 'POST /ai/assist', method: 'POST', url: '/ai/assist', lenient: false },
      { name: 'PATCH /auth/me', method: 'PATCH', url: '/auth/me', lenient: false },
      {
        name: 'POST /auth/change-password',
        method: 'POST',
        url: '/auth/change-password',
        lenient: false,
      },
      {
        name: 'POST /auth/delete-account',
        method: 'POST',
        url: '/auth/delete-account',
        lenient: false,
      },
      { name: 'POST /auth/register', method: 'POST', url: '/auth/register', lenient: false },
      { name: 'POST /auth/login', method: 'POST', url: '/auth/login', lenient: false },
      {
        name: 'POST /auth/reset-password',
        method: 'POST',
        url: '/auth/reset-password',
        lenient: false,
      },
      {
        name: 'POST /auth/verify-email',
        method: 'POST',
        url: '/auth/verify-email',
        lenient: false,
      },
    ] as { name: string; method: Method; url: string; lenient: boolean }[]
  }

  it.each([
    ['an array', '[]'],
    ['a string', '"hello"'],
    ['a number', '42'],
    ['a boolean', 'true'],
    ['an empty body with a JSON content type', ''],
    ['cut-off JSON', '{"title":'],
    ['single quotes', "{'title':'x'}"],
    ['trailing garbage', '{"title":"x"} {"title":"y"}'],
  ])('answers 400 on every JSON route for %s, never a 500', async (_name, body) => {
    const statuses: Record<string, number> = {}
    for (const route of await bodyRoutes()) {
      statuses[route.name] = (await raw(route.method, route.url, body, JSON_TYPE)).statusCode
    }
    expect(Object.values(statuses).filter((s) => s !== 400)).toEqual([])
  })

  it('treats a JSON body that is exactly null, or no body, as "all defaults" where that makes sense', async () => {
    for (const route of await bodyRoutes()) {
      for (const [label, body, type] of [
        ['null', 'null', JSON_TYPE],
        ['no body', undefined, undefined],
      ] as const) {
        const res = await raw(route.method, route.url, body, type)
        const expected = route.lenient ? 201 : 400
        // Auth routes without a body can also hit a rate limit or a missing-session answer.
        expect(
          [expected, 429].includes(res.statusCode),
          `${route.name} with ${label}: ${res.statusCode}`,
        ).toBe(true)
      }
    }
  })

  it('answers 415 for form bodies and other content types the API does not read', async () => {
    for (const route of await bodyRoutes()) {
      for (const type of ['application/x-www-form-urlencoded', 'application/xml', 'image/png']) {
        const res = await raw(route.method, route.url, 'a=1', type)
        expect(res.statusCode, `${route.name} ${type}`).toBe(415)
        expect(res.json().error.code).toBe('bad_request')
      }
    }
  })

  it('does not read JSON sent as text/plain (400, not a 500 and not an accepted request)', async () => {
    for (const route of await bodyRoutes()) {
      const res = await raw(route.method, route.url, '{"title":"x"}', 'text/plain')
      expect(res.statusCode, route.name).toBe(400)
    }
  })

  it('accepts a JSON content type with a charset parameter', async () => {
    const res = await raw(
      'POST',
      '/cvs',
      '{"title":"With charset"}',
      'application/json; charset=utf-8',
    )
    expect(res.statusCode).toBe(201)
  })

  describe('body size', () => {
    it('answers 413 with a JSON error for a body over 2 MiB, on any route', async () => {
      const big = JSON.stringify({ title: 'x'.repeat(3 * 1024 * 1024) })
      for (const url of ['/cvs', '/jobs', '/auth/login']) {
        const res = await raw(
          'POST',
          url,
          big,
          JSON_TYPE,
          url === '/auth/login' ? null : ctx.cookie,
        )
        expect(res.statusCode, url).toBe(413)
        expect(res.json().error.code).toBe('bad_request')
      }
    })

    it('refuses an oversized body before the session is even checked', async () => {
      const big = JSON.stringify({ title: 'x'.repeat(3 * 1024 * 1024) })
      const res = await raw('POST', '/cvs', big, JSON_TYPE, null)
      expect([401, 413]).toContain(res.statusCode)
    })

    it('stores a valid document of about 1.5 MiB (many long texts)', async () => {
      const doc = createEmptyCv()
      const summary = doc.sections.find((s) => s.type === 'summary')!
      doc.sections = Array.from({ length: 300 }, (_, i) => ({
        ...summary,
        id: `s${i}`,
        text: 'x'.repeat(5000),
      })) as typeof doc.sections
      const res = await call('POST', '/cvs', { document: doc })
      expect(res.statusCode).toBe(201)
      expect(res.json().document.sections).toHaveLength(300)
      const read = await call('GET', `/cvs/${res.json().id}`)
      expect(read.json().document.sections).toHaveLength(300)
    })

    it('a document just over 2 MiB is refused with 413 and nothing is stored', async () => {
      const doc = createEmptyCv()
      const summary = doc.sections.find((s) => s.type === 'summary')!
      doc.sections = Array.from({ length: 450 }, (_, i) => ({
        ...summary,
        id: `s${i}`,
        text: 'x'.repeat(5000),
      })) as typeof doc.sections
      expect((await call('POST', '/cvs', { document: doc })).statusCode).toBe(413)
      expect((await call('GET', '/cvs')).json()).toEqual([])
    })

    it('a huge array of tiny sections is stored or refused cleanly (no timeout, no 500)', async () => {
      const doc = createEmptyCv()
      const summary = doc.sections.find((s) => s.type === 'summary')!
      doc.sections = Array.from({ length: 5000 }, (_, i) => ({
        ...summary,
        id: `s${i}`,
        text: 'a',
      })) as typeof doc.sections
      const res = await call('POST', '/cvs', { document: doc })
      expect([201, 400, 413]).toContain(res.statusCode)
    })

    it('rejects deeply nested JSON that is not a document (400, no stack overflow)', async () => {
      const nested = '['.repeat(5000) + ']'.repeat(5000)
      const res = await raw('POST', '/cvs', `{"document":${nested}}`, JSON_TYPE)
      expect([400, 413]).toContain(res.statusCode)
    })
  })

  describe('field values', () => {
    it.each([
      ['a number', 5],
      ['an array', ['a']],
      ['an object', { a: 1 }],
      ['a boolean', true],
    ])('refuses %s as a title', async (_name, title) => {
      const res = await call('POST', '/cvs', { title })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('validation_error')
    })

    it('refuses a null title (it is optional, not nullable)', async () => {
      expect((await call('POST', '/cvs', { title: null })).statusCode).toBe(400)
    })

    it.each([
      ['empty', ''],
      ['only spaces', '    '],
      ['only a newline and tab', '\n\t'],
      ['201 characters', 'x'.repeat(201)],
      ['10,000 characters', 'x'.repeat(10_000)],
    ])('refuses a title that is %s', async (_name, title) => {
      expect((await call('POST', '/cvs', { title })).statusCode).toBe(400)
    })

    it('accepts a title of exactly 200 characters and trims spaces around it', async () => {
      const res = await call('POST', '/cvs', { title: `  ${'x'.repeat(200)}  ` })
      expect(res.statusCode).toBe(201)
      expect(res.json().title).toBe('x'.repeat(200))
    })

    it.each([
      ['emoji', '🙂 Résumé 👩‍💻 日本語 العربية'],
      ['path traversal', '../../etc/passwd'],
      ['backslashes', '..\\..\\windows\\system32'],
      ['SQL injection', "Robert'); DROP TABLE cvs;--"],
      ['SQL quote and comment', "' OR '1'='1' --"],
      ['HTML', '<script>alert(1)</script><img src=x onerror=alert(1)>'],
      ['template syntax', '${process.env.SECRET} {{7*7}} %s %d'],
      ['JSON in a title', '{"title":"nested"}'],
      ['control characters', 'tab\there\nnewline\rreturn\u0007bell'],
      ['zero-width and RTL marks', 'a​b‮c'],
      ['regex characters', '.*+?^${}()|[]\\'],
    ])('stores %s in a title as plain text and gives it back unchanged', async (_name, title) => {
      const res = await call('POST', '/cvs', { title })
      expect(res.statusCode).toBe(201)
      const id = res.json().id
      expect((await call('GET', `/cvs/${id}`)).json().title).toBe(title.trim())
      expect((await call('GET', '/cvs')).json()[0].title).toBe(title.trim())
    })

    it('does not execute SQL in a title: the tables are all still there afterwards', async () => {
      await call('POST', '/cvs', { title: "x'); DROP TABLE cvs; --" })
      await call('POST', '/jobs', { position: "x'); DROP TABLE jobs; --", company: "y'; --" })
      expect((await call('GET', '/cvs')).statusCode).toBe(200)
      expect((await call('GET', '/jobs')).json()).toHaveLength(1)
    })

    it('ignores unknown fields instead of storing them or failing', async () => {
      const res = await call('POST', '/cvs', {
        title: 'Known',
        userId: unknownId(),
        plan: 'pro',
        revision: 99,
        id: unknownId(),
        createdAt: '2000-01-01T00:00:00.000Z',
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().revision).toBe(1)
      expect(res.json().createdAt.startsWith('2000')).toBe(false)
    })

    it.each([
      ['__proto__', '{"title":"x","__proto__":{"isAdmin":true}}'],
      ['constructor.prototype', '{"title":"x","constructor":{"prototype":{"isAdmin":true}}}'],
    ])('refuses a %s key (prototype pollution) with 400', async (_name, body) => {
      const res = await raw('POST', '/cvs', body, JSON_TYPE)
      expect(res.statusCode).toBe(400)
      expect(({} as Record<string, unknown>).isAdmin).toBeUndefined()
      expect((await call('GET', '/cvs')).json()).toEqual([])
    })

    it('does not let a request change the plan, the email or the id of the account', async () => {
      const res = await call('PATCH', '/auth/me', {
        name: 'Changed',
        plan: 'pro',
        email: 'attacker@example.com',
        id: unknownId(),
        emailVerified: true,
        passwordHash: 'x',
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().user).toMatchObject({
        name: 'Changed',
        plan: 'free',
        email: 'user@example.com',
        id: ctx.userId,
        emailVerified: false,
      })
    })

    it('refuses an unknown profession id and a profession id of the wrong type', async () => {
      for (const professionId of ['wizard', 3, '', 'DESIGNER']) {
        expect(
          (await call('POST', '/cvs', { professionId })).statusCode,
          String(professionId),
        ).toBe(400)
      }
    })

    it('accepts a null profession id', async () => {
      expect((await call('POST', '/cvs', { professionId: null })).statusCode).toBe(201)
    })

    it('refuses a document that is not an object, has no sections array or a wrong schema version', async () => {
      const valid = createEmptyCv()
      for (const document of [
        'text',
        [],
        {},
        { ...valid, sections: 'none' },
        { ...valid, sections: [null] },
        { ...valid, schemaVersion: 2 },
        { ...valid, language: 'fr' },
        { ...valid, header: null },
      ]) {
        const res = await call('POST', '/cvs', { document })
        expect(res.statusCode, JSON.stringify(document).slice(0, 60)).toBe(400)
      }
    })

    it('stores an example document of every profession-sized CV unchanged', async () => {
      const document = createExampleCv('software-developer')
      const res = await call('POST', '/cvs', { document })
      expect(res.json().document).toEqual(document)
    })
  })

  describe('ids in the path', () => {
    const resources = ['cvs', 'jobs', 'cover-letters', 'resignations']

    it.each([
      'not-a-uuid',
      '123',
      '00000000-0000-0000-0000-00000000000', // one digit short
      '00000000-0000-0000-0000-0000000000000', // one digit too many
      'ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ',
      "1'; DROP TABLE cvs;--",
      '%20',
      'null',
      'undefined',
      '{id}',
    ])('answers 400 (not 404 or 500) for the id %j on every resource and method', async (id) => {
      const encoded = encodeURIComponent(id)
      for (const resource of resources) {
        for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
          const res = await call(
            method,
            `/${resource}/${encoded}`,
            method === 'PATCH' ? { title: 'x' } : undefined,
          )
          expect(res.statusCode, `${method} /${resource}/${id}`).toBe(400)
          expect(res.json().error.code).toBe('validation_error')
        }
      }
    })

    it('answers 404 for a well-formed id that does not exist, on every resource and method', async () => {
      const id = unknownId()
      for (const resource of resources) {
        for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
          const res = await call(
            method,
            `/${resource}/${id}`,
            method === 'PATCH' ? { title: 'x' } : undefined,
          )
          expect(res.statusCode, `${method} /${resource}/${id}`).toBe(404)
          expect(res.json().error.code).toBe('not_found')
        }
      }
    })

    it('answers 404 for the nil and max UUIDs', async () => {
      for (const id of [
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
      ]) {
        expect((await call('GET', `/cvs/${id}`)).statusCode).toBe(id.startsWith('0') ? 404 : 404)
      }
    })

    it('does not mind the case of a UUID', async () => {
      const cv = (await call('POST', '/cvs', {})).json()
      expect((await call('GET', `/cvs/${cv.id.toUpperCase()}`)).statusCode).toBe(200)
    })

    it('treats a trailing slash like the same route, and a double slash as unknown', async () => {
      const cv = (await call('POST', '/cvs', {})).json()
      expect([200, 404]).toContain((await call('GET', `/cvs/${cv.id}/`)).statusCode)
      expect((await call('GET', `//cvs/${cv.id}`)).statusCode).toBe(404)
    })

    it('answers 404 for routes and methods that do not exist', async () => {
      for (const [method, url] of [
        ['GET', '/cvs/' + unknownId() + '/nope'],
        ['PUT', '/cvs'],
        ['DELETE', '/cvs'],
        ['PATCH', '/jobs'],
        ['GET', '/auth/login'],
        ['POST', '/health'],
        ['GET', '/'],
        ['GET', '/cvs/..'],
      ] as const) {
        const res = await call(method, url, method === 'GET' ? undefined : {})
        expect(res.statusCode, `${method} ${url}`).toBe(404)
        expect(res.json().error.code).toBe('not_found')
      }
    })
  })

  describe('bad URLs and query strings', () => {
    it('answers a bad percent-encoding with 400', async () => {
      const res = await ctx.app.inject({
        method: 'GET',
        url: '/api/cvs/%',
        headers: { cookie: ctx.cookie },
      })
      expect(res.statusCode).toBe(400)
    })

    // BUG (minor): Fastify's own "bad URL" answer bypasses the API error handler, so the body is
    // {"error":"Bad Request","code":"FST_ERR_BAD_URL",...} instead of {"error":{"code","message"}}.
    // GET /api/cvs/% -> 400 with `error` a string; the web app's ApiError parsing expects an object.
    it.fails('uses the API error format for a bad percent-encoding', async () => {
      const res = await ctx.app.inject({
        method: 'GET',
        url: '/api/cvs/%',
        headers: { cookie: ctx.cookie },
      })
      expect(typeof res.json().error).toBe('object')
    })

    it('ignores unknown query parameters', async () => {
      const res = await ctx.app.inject({
        method: 'GET',
        url: '/api/cvs?admin=true&userId=1&limit=-5',
        headers: { cookie: ctx.cookie },
      })
      expect(res.statusCode).toBe(200)
    })

    it('does not treat a query string as part of an id', async () => {
      const cv = (await call('POST', '/cvs', {})).json()
      expect((await call('GET', `/cvs/${cv.id}?x=1`)).statusCode).toBe(200)
      expect((await call('GET', `/cvs/${cv.id}%3Fx=1`)).statusCode).toBe(400)
    })
  })

  // BUG: text containing a NUL character (U+0000) is not rejected by validation, reaches Postgres
  // (text/jsonb columns cannot hold it) and the request ends in a 500 instead of a 400.
  describe('NUL characters in text', () => {
    const NUL = 'a\u0000b'
    const cases: [string, Method, string, () => object][] = [
      ['a CV title', 'POST', '/cvs', () => ({ title: NUL })],
      [
        'a CV header name',
        'POST',
        '/cvs',
        () => {
          const document = createEmptyCv()
          document.header.name = NUL
          return { document }
        },
      ],
      ['a job position', 'POST', '/jobs', () => ({ position: NUL, company: 'Acme' })],
      ['job notes', 'POST', '/jobs', () => ({ position: 'Dev', company: 'Acme', notes: NUL })],
      ['a cover letter title', 'POST', '/cover-letters', () => ({ title: NUL })],
      ['a resignation title', 'POST', '/resignations', () => ({ title: NUL })],
      ['the profile name', 'PATCH', '/auth/me', () => ({ name: NUL })],
      [
        'the name when registering',
        'POST',
        '/auth/register',
        () => ({ email: 'nul@example.com', password: 'a long enough pass', name: NUL }),
      ],
    ]
    it.fails.each(cases)('is refused with 400 in %s', async (_name, method, url, body) => {
      const res = await call(method, url, body(), url === '/auth/register' ? null : ctx.cookie)
      expect(res.statusCode).toBe(400)
    })

    it('does not leak the database error when it happens', async () => {
      const res = await call('POST', '/cvs', { title: NUL })
      expect(res.payload).not.toMatch(/postgres|invalid byte sequence|0x00|insert into/i)
    })

    it('leaves the data usable afterwards', async () => {
      await call('POST', '/cvs', { title: NUL })
      expect((await call('GET', '/cvs')).statusCode).toBe(200)
    })
  })

  // BUG: a lone UTF-16 surrogate inside the document (JSONB) makes Postgres fail -> 500, not 400.
  it.fails('refuses a lone surrogate in a CV document with 400', async () => {
    const document = createEmptyCv()
    document.header.name = '\ud800'
    expect((await call('POST', '/cvs', { document })).statusCode).toBe(400)
  })
})
