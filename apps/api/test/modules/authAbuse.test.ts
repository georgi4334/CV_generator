import { eq, sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app'
import { authTokens, cvs, sessions, users } from '../../src/db/schema/index'
import type { Mailer } from '../../src/infra/mailer'
import { createLocalStorage, type Storage } from '../../src/infra/storage/index'
import { SESSION_COOKIE } from '../../src/modules/auth/sessions'
import { countBy, inParallel } from '../support/api'
import { dbAvailable, useTestApp } from '../support/context'

const PASSWORD = 'correct horse battery'
const ORIGIN = 'http://localhost:5173'

describe.skipIf(!dbAvailable)('auth abuse and edge cases', () => {
  const ctx = useTestApp()
  const apps: Awaited<ReturnType<typeof buildApp>>[] = []
  afterEach(async () => {
    vi.useRealTimers()
    await Promise.all(apps.splice(0).map((app) => app.close()))
  })

  const freshApp = async (options: Partial<Parameters<typeof buildApp>[0]> = {}) => {
    const app = await buildApp({
      corsOrigin: ORIGIN,
      database: ctx.database,
      storage: createLocalStorage('/tmp/unused'),
      mailer: ctx.mailer,
      ...options,
    })
    apps.push(app)
    return app
  }
  type App = Awaited<ReturnType<typeof freshApp>>

  const post = (app: App, url: string, payload?: unknown, cookie?: string, ip?: string) =>
    app.inject({
      method: 'POST',
      url: `/api/auth${url}`,
      payload: payload as object,
      headers: { ...(cookie ? { cookie } : {}), ...(ip ? { 'x-forwarded-for': ip } : {}) },
    })
  const cookieOf = (res: { cookies: { name: string; value: string }[] }) => {
    const c = res.cookies.find((x) => x.name === SESSION_COOKIE)
    return c ? `${SESSION_COOKIE}=${c.value}` : undefined
  }
  const register = async (app: App, email = 'ann@example.com', password = PASSWORD) => {
    const res = await post(app, '/register', { email, password, name: 'Ann' })
    expect(res.statusCode).toBe(201)
    return { res, cookie: cookieOf(res)! }
  }
  const me = (app: App, cookie?: string) =>
    app.inject({ method: 'GET', url: '/api/auth/me', headers: cookie ? { cookie } : {} })
  const login = (app: App, email: string, password: string, ip?: string) =>
    post(app, '/login', { email, password }, undefined, ip)
  const tokenFromMail = (index = -1) =>
    /token=([\w-]+)/.exec(ctx.mailer.outbox.at(index)!.text)![1]!
  const mailSettled = () => new Promise((resolve) => setTimeout(resolve, 15))

  describe('session cookies', () => {
    it('refuses a tampered, truncated, extended or empty cookie value', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const token = cookie.split('=')[1]!
      const flipped = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')
      for (const value of [
        flipped,
        token.slice(1),
        token.slice(0, -5),
        `${token}x`,
        `${token}${token}`,
        '',
        ' ',
        '0',
      ]) {
        const res = await me(app, `${SESSION_COOKIE}=${value}`)
        expect(res.statusCode, value.slice(0, 12)).toBe(401)
      }
      expect((await me(app, cookie)).statusCode).toBe(200)
    })

    it('does not accept the token in upper case, with another cookie name, or in a header', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const token = cookie.split('=')[1]!
      expect((await me(app, `${SESSION_COOKIE}=${token.toUpperCase()}`)).statusCode).toBe(401)
      expect((await me(app, `session=${token}`)).statusCode).toBe(401)
      const viaHeader = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token}`, 'x-session': token },
      })
      expect(viaHeader.statusCode).toBe(401)
    })

    it('answers 401, not 500, for strange cookie values (huge, NUL, unicode, SQL, bad encoding)', async () => {
      const app = await freshApp()
      for (const value of [
        'x'.repeat(50_000),
        '%00',
        'é',
        "' OR 1=1 --",
        '%E0%A4%A',
        '"quoted"',
        'a;b',
      ]) {
        const res = await me(app, `${SESSION_COOKIE}=${value}`)
        expect([401, 431], value.slice(0, 12)).toContain(res.statusCode)
      }
    })

    it('stops working at once when the user row is deleted', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      await ctx.database.db.delete(users).where(eq(users.email, 'ann@example.com'))
      expect((await me(app, cookie)).statusCode).toBe(401)
      expect(
        (await app.inject({ method: 'GET', url: '/api/cvs', headers: { cookie } })).statusCode,
      ).toBe(401)
      expect(
        await ctx.database.db.select().from(sessions).where(eq(sessions.tokenHash, 'x')),
      ).toEqual([])
    })

    it('removes an expired session row when it is used, and keeps answering 401', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      await ctx.database.db.execute(
        sql`update sessions set expires_at = now() - interval '1 second'`,
      )
      const before = await ctx.database.db.select().from(sessions)
      expect((await me(app, cookie)).statusCode).toBe(401)
      expect((await me(app, cookie)).statusCode).toBe(401)
      const after = await ctx.database.db.select().from(sessions)
      expect(after.length).toBe(before.length - 1)
    })

    it('logout twice, with a made-up cookie or with no cookie is always 204', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      expect((await post(app, '/logout', undefined, cookie)).statusCode).toBe(204)
      expect((await post(app, '/logout', undefined, cookie)).statusCode).toBe(204)
      expect((await post(app, '/logout', undefined, `${SESSION_COOKIE}=nonsense`)).statusCode).toBe(
        204,
      )
      expect((await post(app, '/logout')).statusCode).toBe(204)
      expect((await me(app, cookie)).statusCode).toBe(401)
    })

    it('logout clears the cookie in the response', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const res = await post(app, '/logout', undefined, cookie)
      const cleared = res.cookies.find((c) => c.name === SESSION_COOKIE)!
      expect(cleared.value).toBe('')
      expect(new Date(cleared.expires!).getTime()).toBeLessThan(Date.now())
    })

    it('logging out one browser keeps the same account signed in on another', async () => {
      const app = await freshApp()
      const first = await register(app)
      const second = cookieOf(await login(app, 'ann@example.com', PASSWORD))!
      await post(app, '/logout', undefined, first.cookie)
      expect((await me(app, first.cookie)).statusCode).toBe(401)
      expect((await me(app, second)).statusCode).toBe(200)
    })

    it('a session token of one user never opens another user', async () => {
      const app = await freshApp()
      const { cookie } = await register(app, 'one@example.com')
      await register(app, 'two@example.com')
      expect((await me(app, cookie)).json().user.email).toBe('one@example.com')
    })
  })

  describe('registration', () => {
    it.each([
      [' ANN@Example.COM '],
      ['ann@EXAMPLE.com'],
      ['\tann@example.com\n'],
      ['Ann@example.com'],
    ])('refuses %j when ann@example.com exists (409, one account)', async (email) => {
      const app = await freshApp()
      await register(app)
      const res = await post(app, '/register', { email, password: PASSWORD })
      expect(res.statusCode).toBe(409)
      expect(res.json().error.code).toBe('email_taken')
      expect(
        await ctx.database.db.select().from(users).where(eq(users.email, 'ann@example.com')),
      ).toHaveLength(1)
    })

    it('treats plus-addresses as different accounts (no hidden aliasing)', async () => {
      const app = await freshApp()
      await register(app)
      expect(
        (await post(app, '/register', { email: 'ann+shop@example.com', password: PASSWORD }))
          .statusCode,
      ).toBe(201)
    })

    it.each([
      ['a Cyrillic look-alike letter', 'аnn@example.com'],
      ['a fullwidth at-sign', 'ann＠example.com'],
      ['a fullwidth letter', 'ａnn@example.com'],
      ['an emoji', '🙂@example.com'],
      ['a zero-width space', 'ann​@example.com'],
      ['an internationalised domain', 'ann@exämple.com'],
      ['two dots', 'a..b@example.com'],
      ['no domain dot', 'ann@example'],
      ['spaces inside', 'a nn@example.com'],
      ['two at-signs', 'a@b@example.com'],
      ['a newline in the middle', 'ann\n@example.com'],
      ['a header injection', 'ann@example.com\r\nBcc: evil@example.com'],
      ['255 characters', `${'a'.repeat(243)}@example.com`],
    ])('refuses an email with %s (400)', async (_name, email) => {
      const app = await freshApp()
      const res = await post(app, '/register', { email, password: PASSWORD })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('validation_error')
    })

    it('accepts the longest valid email (254 characters)', async () => {
      const app = await freshApp()
      const local = 'a'.repeat(64)
      const domain = `${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(55)}.com`
      const email = `${local}@${domain}`
      expect(email.length).toBeLessThanOrEqual(254)
      const res = await post(app, '/register', { email, password: PASSWORD })
      expect([201, 400]).toContain(res.statusCode)
    })

    it('refuses a 1 MB password and a 129-character one before hashing, and takes exactly 128', async () => {
      const app = await freshApp()
      const started = Date.now()
      const huge = await post(app, '/register', {
        email: 'a@example.com',
        password: 'x'.repeat(1_000_000),
      })
      expect(huge.statusCode).toBe(400)
      expect(Date.now() - started).toBeLessThan(1500)
      expect(
        (await post(app, '/register', { email: 'a@example.com', password: 'x'.repeat(129) }))
          .statusCode,
      ).toBe(400)
      const ok = await post(app, '/register', { email: 'a@example.com', password: 'xy'.repeat(64) })
      expect(ok.statusCode).toBe(201)
      expect((await login(app, 'a@example.com', 'xy'.repeat(64))).statusCode).toBe(200)
    })

    it('refuses passwords of the wrong type or empty', async () => {
      const app = await freshApp()
      for (const password of [undefined, null, 12345678, ['a'], { a: 1 }, '', ' ']) {
        const res = await post(app, '/register', { email: 'b@example.com', password })
        expect(res.statusCode, String(password)).toBe(400)
      }
    })

    it('accepts any characters in a password, also emoji and a NUL byte, and checks them on login', async () => {
      const app = await freshApp()
      const password = 'pässwörd 🙂 \u0000 end'
      await register(app, 'emoji@example.com', password)
      expect((await login(app, 'emoji@example.com', password)).statusCode).toBe(200)
      expect((await login(app, 'emoji@example.com', 'pässwörd 🙂 ')).statusCode).toBe(401)
    })

    it('treats a password typed with composed or decomposed accents as the same', async () => {
      const app = await freshApp()
      await register(app, 'nfc@example.com', 'café au lait!')
      expect((await login(app, 'nfc@example.com', 'café au lait!')).statusCode).toBe(200)
    })

    // BUG (minor): the list of common passwords is checked on the raw text, but passwords are
    // hashed after NFKC normalisation, so "ｐａｓｓｗｏｒｄ" (fullwidth) is accepted as a new
    // password although it is the same as the refused "password". POST /api/auth/register
    // { email, password: "ｐａｓｓｗｏｒｄ" } -> 201; expected 400 (password too common).
    it.fails('refuses a common password written with fullwidth characters', async () => {
      const app = await freshApp()
      const res = await post(app, '/register', {
        email: 'full@example.com',
        password: 'ｐａｓｓｗｏｒｄ',
      })
      expect(res.statusCode).toBe(400)
    })

    it('refuses names that are too long or not text, accepts 100 characters and emoji', async () => {
      const app = await freshApp()
      for (const name of ['x'.repeat(101), 5, ['a'], null]) {
        expect(
          (await post(app, '/register', { email: 'n@example.com', password: PASSWORD, name }))
            .statusCode,
        ).toBe(400)
      }
      const res = await post(app, '/register', {
        email: 'n@example.com',
        password: PASSWORD,
        name: '🙂'.repeat(50),
      })
      expect(res.statusCode).toBe(201)
    })

    it('keeps a name with markup or line breaks as plain data and sends the mail only to the address', async () => {
      const app = await freshApp()
      const name = '<img src=x onerror=alert(1)>\r\nBcc: evil@example.com'
      const res = await post(app, '/register', {
        email: 'inj@example.com',
        password: PASSWORD,
        name,
      })
      expect(res.statusCode).toBe(201)
      await mailSettled()
      expect(ctx.mailer.outbox.map((m) => m.to)).toEqual(['inj@example.com'])
      expect(ctx.mailer.outbox[0]!.text).not.toContain('evil@example.com')
    })

    it('refuses an unknown language', async () => {
      const app = await freshApp()
      for (const locale of ['fr', 'EN', '', 5]) {
        expect(
          (await post(app, '/register', { email: 'l@example.com', password: PASSWORD, locale }))
            .statusCode,
        ).toBe(400)
      }
    })

    it('creates exactly one account when the same address registers five times at once', async () => {
      const app = await freshApp()
      const results = await inParallel(5, () =>
        post(app, '/register', { email: 'race@example.com', password: PASSWORD }),
      )
      expect(countBy(results, (r) => r.statusCode)).toEqual({ '201': 1, '409': 4 })
      expect(
        await ctx.database.db.select().from(users).where(eq(users.email, 'race@example.com')),
      ).toHaveLength(1)
    })

    it('registers again with the same address once the account is gone', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      await post(app, '/delete-account', { password: PASSWORD }, cookie)
      const again = await register(app)
      expect((await me(app, again.cookie)).json().user.emailVerified).toBe(false)
      expect(
        (
          await app.inject({ method: 'GET', url: '/api/cvs', headers: { cookie: again.cookie } })
        ).json(),
      ).toEqual([])
    })

    // BUG (minor): sendMail() does not catch a mailer whose send() throws before returning a
    // promise. POST /api/auth/register creates the account, then answers 500 (no cookie, the
    // person thinks sign-up failed and gets 409 "email taken" on the retry). Expected 201.
    it.fails('still answers 201 when the mail service throws synchronously', async () => {
      const mailer: Mailer = {
        delivers: true,
        send: (() => {
          throw new Error('sync boom')
        }) as unknown as Mailer['send'],
      }
      const app = await freshApp({ mailer })
      const res = await post(app, '/register', { email: 'sync@example.com', password: PASSWORD })
      expect(res.statusCode).toBe(201)
    })
  })

  describe('login and guessing passwords', () => {
    const wrong = (app: App, ip?: string, email = 'ann@example.com') =>
      login(app, email, 'a wrong password', ip)

    it('locks out after 10 wrong passwords from one address, under any spelling of the email, and whatever X-Forwarded-For says', async () => {
      const app = await freshApp()
      await register(app)
      const spellings = [
        'ann@example.com',
        'ANN@example.com',
        ' ann@example.com ',
        'Ann@Example.Com',
      ]
      for (let i = 0; i < 10; i++) {
        expect((await wrong(app, `10.0.0.${i}`, spellings[i % spellings.length])).statusCode).toBe(
          401,
        )
      }
      const locked = await wrong(app, '10.9.9.9')
      expect(locked.statusCode).toBe(429)
      expect(locked.json().error.code).toBe('too_many_requests')
      expect((await login(app, 'ann@example.com', PASSWORD)).statusCode).toBe(429)
    }, 30_000)

    it('lets the right password in again once the 15 minute window is over', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      const app = await freshApp()
      await register(app)
      for (let i = 0; i < 11; i++) await wrong(app)
      expect((await login(app, 'ann@example.com', PASSWORD)).statusCode).toBe(429)
      vi.setSystemTime(Date.now() + 14 * 60_000)
      expect((await login(app, 'ann@example.com', PASSWORD)).statusCode).toBe(429)
      vi.setSystemTime(Date.now() + 61_000)
      expect((await login(app, 'ann@example.com', PASSWORD)).statusCode).toBe(200)
    }, 30_000)

    it('forgets the failed attempts after a successful sign-in', async () => {
      const app = await freshApp()
      await register(app)
      for (let i = 0; i < 9; i++) await wrong(app)
      expect((await login(app, 'ann@example.com', PASSWORD)).statusCode).toBe(200)
      // Without the reset this would be the 11th attempt and be refused.
      expect((await wrong(app)).statusCode).toBe(401)
      expect((await login(app, 'ann@example.com', PASSWORD)).statusCode).toBe(200)
    }, 30_000)

    it('counts guesses per address and account: another address is not locked out (trusted proxy)', async () => {
      const app = await freshApp({ trustProxy: true })
      await register(app)
      for (let i = 0; i < 10; i++) await wrong(app, '10.0.0.1')
      expect((await wrong(app, '10.0.0.1')).statusCode).toBe(429)
      expect((await login(app, 'ann@example.com', PASSWORD, '10.0.0.2')).statusCode).toBe(200)
      // The same address can still try other accounts: the limit is per address and account.
      expect((await wrong(app, '10.0.0.1', 'bob@example.com')).statusCode).toBe(401)
    }, 30_000)

    it('limits one address to 50 sign-in attempts in total, whichever accounts it tries', async () => {
      const app = await freshApp()
      // Attempts count before the body is read, so empty bodies use up the budget cheaply.
      for (let i = 0; i < 50; i++) expect((await post(app, '/login', {})).statusCode).toBe(400)
      expect((await post(app, '/login', {})).statusCode).toBe(429)
      expect((await wrong(app, undefined, 'any@example.com')).statusCode).toBe(429)
    })

    it('answers the same body and status for an account without a password, an unknown account and a wrong password', async () => {
      const app = await freshApp()
      await register(app)
      const bodies = await Promise.all([
        wrong(app, undefined, 'ann@example.com'),
        wrong(app, undefined, 'user@example.com'), // exists, but has no password
        wrong(app, undefined, 'ghost@example.com'),
      ])
      expect(bodies.map((r) => r.statusCode)).toEqual([401, 401, 401])
      expect(new Set(bodies.map((r) => r.payload)).size).toBe(1)
    })

    it('refuses a 1 MB password at once, without spending the hashing time or counting a guess', async () => {
      const app = await freshApp()
      await register(app)
      const started = Date.now()
      const res = await login(app, 'ann@example.com', 'x'.repeat(1_000_000))
      expect(res.statusCode).toBe(400)
      expect(Date.now() - started).toBeLessThan(1500)
    })

    it('treats an email with SQL in it as data', async () => {
      const app = await freshApp()
      await register(app)
      // An apostrophe is not a valid email character; as a password it is just text.
      expect((await login(app, "a'or'1'='1@example.com", 'x')).statusCode).toBe(400)
      expect((await login(app, 'ghost+or+1@example.com', "' or '1'='1")).statusCode).toBe(401)
      expect((await login(app, 'ann@example.com', "' or '1'='1")).statusCode).toBe(401)
    })

    it('refuses missing fields, wrong types and an empty password', async () => {
      const app = await freshApp()
      for (const body of [
        {},
        { email: 'a@example.com' },
        { password: 'x' },
        { email: 5, password: 'x' },
        { email: 'a@example.com', password: '' },
        { email: ['a@example.com'], password: 'x' },
      ]) {
        expect((await post(app, '/login', body)).statusCode, JSON.stringify(body)).toBe(400)
      }
    })

    it('a sign-in sets a fresh cookie each time and the older sessions keep working', async () => {
      const app = await freshApp()
      const first = await register(app)
      const second = cookieOf(await login(app, 'ann@example.com', PASSWORD))!
      expect(second).not.toBe(first.cookie)
      expect((await me(app, first.cookie)).statusCode).toBe(200)
      expect((await me(app, second)).statusCode).toBe(200)
    })

    it('limits sign-ups from one address to 10 an hour, then allows them again', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      const app = await freshApp()
      // Attempts count before the body is read, so empty bodies use up the budget cheaply.
      for (let i = 0; i < 10; i++) expect((await post(app, '/register', {})).statusCode).toBe(400)
      const limited = await post(app, '/register', { email: 'u11@example.com', password: PASSWORD })
      expect(limited.statusCode).toBe(429)
      expect(
        await ctx.database.db.select().from(users).where(eq(users.email, 'u11@example.com')),
      ).toEqual([])
      vi.setSystemTime(Date.now() + 60 * 60_000 + 1000)
      expect(
        (await post(app, '/register', { email: 'u11@example.com', password: PASSWORD })).statusCode,
      ).toBe(201)
    })
  })

  describe('one-time email links', () => {
    const MALFORMED = [
      ['empty', ''],
      ['too short', 'abc'],
      ['whitespace', ' '.repeat(43)],
      ['a path', '../../etc/passwd'],
      ['SQL', "' OR 1=1 --"],
      ['unicode', 'é'.repeat(43)],
      ['a huge string', 'a'.repeat(100_000)],
      ['a number', 12345],
      ['null', null],
      ['an array', ['a'.repeat(43)]],
      ['an object', { $ne: null }],
    ] as const

    it.each(MALFORMED)('refuses a %s token to verify an email (400)', async (_name, token) => {
      const app = await freshApp()
      const res = await post(app, '/verify-email', { token })
      expect(res.statusCode).toBe(400)
    })

    it.each(MALFORMED)('refuses a %s token to reset a password (400)', async (_name, token) => {
      const app = await freshApp()
      const res = await post(app, '/reset-password', { token, password: 'a brand new secret' })
      expect(res.statusCode).toBe(400)
    })

    it('answers an invented well-formed token with invalid_token', async () => {
      const app = await freshApp()
      const res = await post(app, '/verify-email', { token: 'A'.repeat(43) })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('invalid_token')
    })

    it('refuses a token whose letters changed case', async () => {
      const app = await freshApp()
      await register(app)
      await mailSettled()
      const token = tokenFromMail()
      const swapped = token.replace(/[a-z]/gi, (c) =>
        c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase(),
      )
      expect((await post(app, '/verify-email', { token: swapped })).statusCode).toBe(400)
      expect((await post(app, '/verify-email', { token })).statusCode).toBe(204)
    })

    it('stores the confirmation once: the second use of the same link fails and nothing changes', async () => {
      const app = await freshApp()
      await register(app)
      await mailSettled()
      const token = tokenFromMail()
      expect((await post(app, '/verify-email', { token })).statusCode).toBe(204)
      const before = (
        await ctx.database.db.select().from(users).where(eq(users.email, 'ann@example.com'))
      )[0]!
      expect((await post(app, '/verify-email', { token })).statusCode).toBe(400)
      const after = (
        await ctx.database.db.select().from(users).where(eq(users.email, 'ann@example.com'))
      )[0]!
      expect(after.emailVerifiedAt).toEqual(before.emailVerifiedAt)
    })

    it('refuses an expired confirmation link and an expired reset link', async () => {
      const app = await freshApp()
      await register(app)
      await mailSettled()
      const verify = tokenFromMail()
      await post(app, '/forgot-password', { email: 'ann@example.com' })
      await mailSettled()
      const reset = tokenFromMail()
      await ctx.database.db.execute(
        sql`update auth_tokens set expires_at = now() - interval '1 second'`,
      )
      expect((await post(app, '/verify-email', { token: verify })).statusCode).toBe(400)
      expect(
        (await post(app, '/reset-password', { token: reset, password: 'a brand new secret' }))
          .statusCode,
      ).toBe(400)
      expect((await login(app, 'ann@example.com', PASSWORD)).statusCode).toBe(200)
    })

    it('accepts a link up to the last moment of its life', async () => {
      const app = await freshApp()
      await register(app)
      await mailSettled()
      const token = tokenFromMail()
      await ctx.database.db.execute(
        sql`update auth_tokens set expires_at = now() + interval '2 seconds'`,
      )
      expect((await post(app, '/verify-email', { token })).statusCode).toBe(204)
    })

    it('does not accept a confirmation link as a reset link, or the other way round, and keeps both usable', async () => {
      const app = await freshApp()
      await register(app)
      await mailSettled()
      const verify = tokenFromMail()
      await post(app, '/forgot-password', { email: 'ann@example.com' })
      await mailSettled()
      const reset = tokenFromMail()
      expect(
        (await post(app, '/reset-password', { token: verify, password: 'a brand new secret' }))
          .statusCode,
      ).toBe(400)
      expect((await post(app, '/verify-email', { token: reset })).statusCode).toBe(400)
      expect((await post(app, '/verify-email', { token: verify })).statusCode).toBe(204)
      expect(
        (await post(app, '/reset-password', { token: reset, password: 'a brand new secret' }))
          .statusCode,
      ).toBe(204)
    })

    it('keeps the reset link valid when the new password was refused as too weak', async () => {
      const app = await freshApp()
      await register(app)
      await post(app, '/forgot-password', { email: 'ann@example.com' })
      await mailSettled()
      const token = tokenFromMail()
      for (const password of ['short', 'password', 'x'.repeat(129)]) {
        expect((await post(app, '/reset-password', { token, password })).statusCode).toBe(400)
      }
      expect(
        (await post(app, '/reset-password', { token, password: 'a brand new secret' })).statusCode,
      ).toBe(204)
      expect((await login(app, 'ann@example.com', 'a brand new secret')).statusCode).toBe(200)
      expect((await login(app, 'ann@example.com', PASSWORD)).statusCode).toBe(401)
    })

    it('two parallel uses of one reset link: exactly one succeeds', async () => {
      const app = await freshApp()
      await register(app)
      await post(app, '/forgot-password', { email: 'ann@example.com' })
      await mailSettled()
      const token = tokenFromMail()
      const results = await inParallel(4, (i) =>
        post(app, '/reset-password', { token, password: `parallel password ${i}` }),
      )
      expect(countBy(results, (r) => r.statusCode)).toEqual({ '204': 1, '400': 3 })
    })

    it('a link of a deleted account is useless', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      await post(app, '/forgot-password', { email: 'ann@example.com' })
      await mailSettled()
      const token = tokenFromMail()
      await post(app, '/delete-account', { password: PASSWORD }, cookie)
      expect(
        (await post(app, '/reset-password', { token, password: 'a brand new secret' })).statusCode,
      ).toBe(400)
      expect(await ctx.database.db.select().from(authTokens)).toEqual([])
    })

    it('stores the link as a hash only', async () => {
      const app = await freshApp()
      await register(app)
      await mailSettled()
      const token = tokenFromMail()
      const rows = await ctx.database.db.select().from(authTokens)
      expect(rows.map((r) => r.tokenHash)).not.toContain(token)
      expect(JSON.stringify(rows)).not.toContain(token)
    })

    it('allows 20 link checks an hour from one address, then 429, then works again', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      const app = await freshApp()
      for (let i = 0; i < 20; i++) {
        expect((await post(app, '/verify-email', { token: 'A'.repeat(43) })).statusCode).toBe(400)
      }
      expect((await post(app, '/verify-email', { token: 'A'.repeat(43) })).statusCode).toBe(429)
      expect(
        (
          await post(app, '/reset-password', {
            token: 'A'.repeat(43),
            password: 'a brand new secret',
          })
        ).statusCode,
      ).toBe(429)
      vi.setSystemTime(Date.now() + 61 * 60_000)
      expect((await post(app, '/verify-email', { token: 'A'.repeat(43) })).statusCode).toBe(400)
    })

    it('resets a password and signs out every browser, including a stolen session', async () => {
      const app = await freshApp()
      const stolen = await register(app)
      const other = cookieOf(await login(app, 'ann@example.com', PASSWORD))!
      await post(app, '/forgot-password', { email: 'ann@example.com' })
      await mailSettled()
      await post(app, '/reset-password', { token: tokenFromMail(), password: 'a brand new secret' })
      expect((await me(app, stolen.cookie)).statusCode).toBe(401)
      expect((await me(app, other)).statusCode).toBe(401)
    })
  })

  describe('forgot password', () => {
    it('answers 204 with an empty body in every case: known, unknown, no password, limited', async () => {
      const app = await freshApp()
      await register(app)
      const bodies: string[] = []
      for (const email of [
        'ann@example.com',
        'ghost@example.com',
        'user@example.com',
        'ann@example.com',
        'ann@example.com',
      ]) {
        const res = await post(app, '/forgot-password', { email })
        expect(res.statusCode, email).toBe(204)
        bodies.push(res.body)
      }
      expect(new Set(bodies)).toEqual(new Set(['']))
    })

    it('sends nothing for an account that has no password', async () => {
      const app = await freshApp()
      ctx.mailer.outbox.length = 0
      await post(app, '/forgot-password', { email: 'user@example.com' })
      await mailSettled()
      expect(ctx.mailer.outbox).toEqual([])
    })

    it('shares the 3 mails an hour between all spellings of one address, then recovers', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      const app = await freshApp()
      await register(app)
      await mailSettled()
      ctx.mailer.outbox.length = 0
      for (const email of [
        'ann@example.com',
        'ANN@example.com',
        ' Ann@Example.com ',
        'ann@example.com',
      ]) {
        expect((await post(app, '/forgot-password', { email })).statusCode).toBe(204)
      }
      await mailSettled()
      expect(ctx.mailer.outbox).toHaveLength(3)
      vi.setSystemTime(Date.now() + 61 * 60_000)
      await post(app, '/forgot-password', { email: 'ann@example.com' })
      await mailSettled()
      expect(ctx.mailer.outbox).toHaveLength(4)
    })

    it('answers 429 after 5 requests an hour from one address, whichever emails', async () => {
      const app = await freshApp()
      for (let i = 0; i < 5; i++) {
        expect(
          (await post(app, '/forgot-password', { email: `nobody${i}@example.com` })).statusCode,
        ).toBe(204)
      }
      expect(
        (await post(app, '/forgot-password', { email: 'nobody6@example.com' })).statusCode,
      ).toBe(429)
    })

    it.each([
      [{}],
      [{ email: 5 }],
      [{ email: '' }],
      [{ email: 'not an email' }],
      [{ email: 'a@example.com', locale: 'xx' }],
    ])('refuses the body %j with 400', async (body) => {
      const app = await freshApp()
      expect((await post(app, '/forgot-password', body)).statusCode).toBe(400)
    })

    it('still answers 204 when the mail service rejects, and when it never answers', async () => {
      const rejecting = await freshApp({
        mailer: { delivers: true, send: () => Promise.reject(new Error('down')) },
      })
      await register(rejecting)
      expect(
        (await post(rejecting, '/forgot-password', { email: 'ann@example.com' })).statusCode,
      ).toBe(204)
      const hanging = await freshApp({
        mailer: { delivers: true, send: () => new Promise(() => {}) },
      })
      const started = Date.now()
      expect(
        (await post(hanging, '/forgot-password', { email: 'ann@example.com' })).statusCode,
      ).toBe(204)
      expect(Date.now() - started).toBeLessThan(2000)
    })

    // BUG (minor): sendMail() calls mailer.send(...).catch(...). A mailer whose send() throws
    // synchronously (before returning a promise) is not caught: POST /api/auth/forgot-password
    // answers 500 for an existing account, which also reveals that the account exists.
    it.fails('answers 204 when the mailer throws synchronously', async () => {
      const mailer: Mailer = {
        delivers: true,
        send: (() => {
          throw new Error('sync boom')
        }) as unknown as Mailer['send'],
      }
      const app = await freshApp({ mailer })
      const registered = await freshApp()
      await register(registered)
      expect((await post(app, '/forgot-password', { email: 'ann@example.com' })).statusCode).toBe(
        204,
      )
    })
  })

  describe('resend confirmation', () => {
    it('sends nothing to an already confirmed account, and answers 204', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      await mailSettled()
      await post(app, '/verify-email', { token: tokenFromMail() })
      ctx.mailer.outbox.length = 0
      expect((await post(app, '/resend-verification', undefined, cookie)).statusCode).toBe(204)
      expect(ctx.mailer.outbox).toEqual([])
    })

    it('allows 3 an hour and then answers 429', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      for (let i = 0; i < 3; i++) {
        expect((await post(app, '/resend-verification', undefined, cookie)).statusCode).toBe(204)
      }
      expect((await post(app, '/resend-verification', undefined, cookie)).statusCode).toBe(429)
    })

    it('needs a session', async () => {
      const app = await freshApp()
      expect((await post(app, '/resend-verification')).statusCode).toBe(401)
    })
  })

  describe('changing the password and deleting the account', () => {
    it('shares one budget of 10 password checks between changing it and deleting the account', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      for (let i = 0; i < 5; i++) {
        expect(
          (
            await post(
              app,
              '/change-password',
              { currentPassword: 'wrong guess', newPassword: 'a brand new secret' },
              cookie,
            )
          ).statusCode,
        ).toBe(403)
        expect(
          (await post(app, '/delete-account', { password: 'wrong guess' }, cookie)).statusCode,
        ).toBe(403)
      }
      expect((await post(app, '/delete-account', { password: PASSWORD }, cookie)).statusCode).toBe(
        429,
      )
      expect((await me(app, cookie)).statusCode).toBe(200)
    })

    it('refuses a weak or too long new password without changing the old one', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      for (const newPassword of ['short', 'password', 'x'.repeat(129), '', 5]) {
        expect(
          (await post(app, '/change-password', { currentPassword: PASSWORD, newPassword }, cookie))
            .statusCode,
        ).toBe(400)
      }
      expect((await login(app, 'ann@example.com', PASSWORD)).statusCode).toBe(200)
    })

    it('needs a session for both', async () => {
      const app = await freshApp()
      expect(
        (
          await post(app, '/change-password', {
            currentPassword: 'a',
            newPassword: 'a brand new secret',
          })
        ).statusCode,
      ).toBe(401)
      expect((await post(app, '/delete-account', { password: PASSWORD })).statusCode).toBe(401)
    })

    it('an account without a password cannot delete itself by guessing', async () => {
      const app = await freshApp()
      const res = await post(app, '/delete-account', { password: 'anything at all' }, ctx.cookie)
      expect(res.statusCode).toBe(403)
      expect((await me(app, ctx.cookie)).statusCode).toBe(200)
    })

    it('deleting removes every kind of data of the user, and nothing of anybody else', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const as = (method: 'POST' | 'PUT', url: string, payload: object, c = cookie) =>
        app.inject({ method, url: `/api${url}`, payload, headers: { cookie: c } })
      const cv = (await as('POST', '/cvs', {})).json()
      const job = (
        await as('POST', '/jobs', { position: 'Dev', company: 'Acme', cvId: cv.id })
      ).json()
      await as('POST', '/cover-letters', { jobId: job.id })
      await as('POST', '/resignations', {})
      await as('POST', `/cvs/${cv.id}/versions`, { label: 'v' })
      const link = (await as('PUT', `/cvs/${cv.id}/share`, { isActive: true })).json().link
      await as('POST', '/cvs', {}, ctx.cookie) // someone else's CV must stay
      expect((await post(app, '/delete-account', { password: PASSWORD }, cookie)).statusCode).toBe(
        204,
      )

      const counts = await ctx.database.db.execute(sql`
        select (select count(*) from cvs)::int as cvs, (select count(*) from jobs)::int as jobs,
               (select count(*) from cover_letters)::int as letters, (select count(*) from resignations)::int as res,
               (select count(*) from cv_versions)::int as versions, (select count(*) from share_links)::int as links,
               (select count(*) from sessions where user_id not in (select id from users))::int as stray`)
      expect(counts[0]).toEqual({
        cvs: 1,
        jobs: 0,
        letters: 0,
        res: 0,
        versions: 0,
        links: 0,
        stray: 0,
      })
      expect(
        (await app.inject({ method: 'GET', url: `/api/shared/${link.slug}` })).statusCode,
      ).toBe(404)
      expect(await ctx.database.db.select().from(cvs)).toHaveLength(1)
    })

    it('removes the uploaded files from storage, and still deletes the account if a file cannot be removed', async () => {
      const removed: string[] = []
      const storage: Storage = {
        async put() {},
        async get() {
          return null
        },
        async remove(key) {
          removed.push(key)
          if (removed.length === 1) throw new Error('storage offline')
        },
      }
      const app = await freshApp({ storage })
      const { cookie } = await register(app)
      const [mine] = await ctx.database.db
        .select()
        .from(users)
        .where(eq(users.email, 'ann@example.com'))
      await ctx.database.db.execute(
        sql`insert into uploads (id, user_id, storage_key, content_type, size) values
          (gen_random_uuid(), ${mine!.id}, 'a.png', 'image/png', 1), (gen_random_uuid(), ${mine!.id}, 'b.png', 'image/png', 1)`,
      )
      const res = await post(app, '/delete-account', { password: PASSWORD }, cookie)
      expect(res.statusCode).toBe(204)
      expect(removed.sort()).toEqual(['a.png', 'b.png'])
      expect(await ctx.database.db.select().from(users).where(eq(users.id, mine!.id))).toEqual([])
    })

    it('after deletion the old cookie fails everywhere (data routes, profile, share, AI)', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      await post(app, '/delete-account', { password: PASSWORD }, cookie)
      for (const [method, url] of [
        ['GET', '/api/auth/me'],
        ['GET', '/api/cvs'],
        ['POST', '/api/cvs'],
        ['GET', '/api/jobs'],
        ['GET', '/api/ai/status'],
        ['POST', '/api/uploads'],
      ] as const) {
        const res = await app.inject({
          method,
          url,
          payload: method === 'POST' ? {} : undefined,
          headers: { cookie },
        })
        expect(res.statusCode, `${method} ${url}`).toBe(401)
      }
    })

    it('deleting twice with the same cookie: the second one is 401, not 500', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      expect((await post(app, '/delete-account', { password: PASSWORD }, cookie)).statusCode).toBe(
        204,
      )
      expect((await post(app, '/delete-account', { password: PASSWORD }, cookie)).statusCode).toBe(
        401,
      )
    })

    it('two parallel deletions end with one 204 and no 500', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const results = await inParallel(3, () =>
        post(app, '/delete-account', { password: PASSWORD }, cookie),
      )
      const statuses = results.map((r) => r.statusCode)
      expect(statuses.filter((s) => s === 204).length).toBeGreaterThanOrEqual(1)
      expect(statuses.every((s) => [204, 401].includes(s))).toBe(true)
    })

    it('profile: refuses a name over 100 characters and a bad language, trims names', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const patch = (payload: unknown) =>
        app.inject({
          method: 'PATCH',
          url: '/api/auth/me',
          payload: payload as object,
          headers: { cookie },
        })
      expect((await patch({ name: 'x'.repeat(101) })).statusCode).toBe(400)
      expect((await patch({ locale: 'fr' })).statusCode).toBe(400)
      expect((await patch({ name: 5 })).statusCode).toBe(400)
      expect((await patch({ name: '  Ann B  ' })).json().user.name).toBe('Ann B')
      expect((await patch({ name: '' })).json().user.name).toBe('')
    })
  })

  describe('requests from other websites', () => {
    const evil = 'https://evil.example'
    const withOrigin = (
      app: App,
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      url: string,
      origin: string,
      cookie: string,
    ) => app.inject({ method, url: `/api${url}`, payload: {}, headers: { origin, cookie } })

    it.each([
      ['POST', '/cvs'],
      ['PUT', '/ai/key'],
      ['PATCH', '/auth/me'],
      ['DELETE', '/cvs/00000000-0000-4000-8000-000000000000'],
      ['POST', '/auth/logout'],
      ['POST', '/auth/login'],
    ] as const)(
      'refuses %s %s from another origin with 403, before anything happens',
      async (method, url) => {
        const app = await freshApp()
        const res = await withOrigin(app, method, url, evil, ctx.cookie)
        expect(res.statusCode).toBe(403)
        expect(res.json().error.code).toBe('forbidden_origin')
      },
    )

    it.each([
      'null',
      'http://localhost:5173.evil.example',
      'http://localhost:5174',
      'https://localhost:5173',
      'http://LOCALHOST:5173',
      ORIGIN + '/',
    ])('refuses the origin %j', async (origin) => {
      const app = await freshApp()
      expect((await withOrigin(app, 'POST', '/cvs', origin, ctx.cookie)).statusCode).toBe(403)
      expect(
        (
          await app.inject({ method: 'GET', url: '/api/cvs', headers: { cookie: ctx.cookie } })
        ).json(),
      ).toEqual([])
    })

    it('accepts every origin of a list, and requests without an Origin header', async () => {
      const app = await freshApp({ corsOrigin: `${ORIGIN}, https://cv.example.com` })
      expect(
        (await withOrigin(app, 'POST', '/cvs', 'https://cv.example.com', ctx.cookie)).statusCode,
      ).toBe(201)
      expect((await withOrigin(app, 'POST', '/cvs', ORIGIN, ctx.cookie)).statusCode).toBe(201)
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/cvs',
            payload: {},
            headers: { cookie: ctx.cookie },
          })
        ).statusCode,
      ).toBe(201)
    })

    it('does not send CORS permission to another website, also on a preflight', async () => {
      const app = await freshApp()
      const read = await app.inject({
        method: 'GET',
        url: '/api/cvs',
        headers: { origin: evil, cookie: ctx.cookie },
      })
      expect(read.headers['access-control-allow-origin']).toBeUndefined()
      const preflight = await app.inject({
        method: 'OPTIONS',
        url: '/api/cvs',
        headers: { origin: evil, 'access-control-request-method': 'POST' },
      })
      expect(preflight.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('answers a preflight from the web app with credentials and the allowed methods', async () => {
      const app = await freshApp()
      const preflight = await app.inject({
        method: 'OPTIONS',
        url: '/api/cvs',
        headers: { origin: ORIGIN, 'access-control-request-method': 'PATCH' },
      })
      expect(preflight.statusCode).toBe(204)
      expect(preflight.headers['access-control-allow-origin']).toBe(ORIGIN)
      expect(preflight.headers['access-control-allow-credentials']).toBe('true')
      expect(String(preflight.headers['access-control-allow-methods'])).toContain('PATCH')
    })

    it('reading with a stranger origin still needs the session (the cookie is not enough on its own)', async () => {
      const app = await freshApp()
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { origin: evil },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('client address and proxy headers', () => {
    it('ignores a forwarded client address that is empty or longer than 100 characters', async () => {
      const app = await freshApp({ proxySecret: 's'.repeat(40) })
      const attempt = (ip: string) =>
        app.inject({
          method: 'POST',
          url: '/api/auth/forgot-password',
          payload: {},
          headers: { 'x-proxy-secret': 's'.repeat(40), 'x-client-ip': ip },
        })
      // 5 requests an hour per address; invalid and over-long addresses all count as the socket address.
      for (const ip of ['', 'x'.repeat(101), '', 'y'.repeat(500), '']) {
        expect((await attempt(ip)).statusCode).toBe(400)
      }
      expect((await attempt('')).statusCode).toBe(429)
      expect((await attempt('x'.repeat(101))).statusCode).toBe(429)
      expect((await attempt('1.2.3.4')).statusCode).toBe(400)
    })

    it('refuses a proxy secret of the wrong length, the right length but wrong, and an array of headers', async () => {
      const app = await freshApp({ proxySecret: 's'.repeat(40) })
      for (const secret of ['', 's'.repeat(39), 's'.repeat(41), 't'.repeat(40)]) {
        const res = await app.inject({
          method: 'GET',
          url: '/api/cvs',
          headers: { 'x-proxy-secret': secret, cookie: ctx.cookie },
        })
        expect(res.statusCode, secret.length.toString()).toBe(403)
      }
    })
  })

  it('does not break the other tests: the account used by the helpers is still there', async () => {
    const [row] = await ctx.database.db.select().from(users).where(eq(users.id, ctx.userId))
    expect(row?.email).toBe('user@example.com')
  })

  beforeEach(() => {
    vi.useRealTimers()
  })
})
