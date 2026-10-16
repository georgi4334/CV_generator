import { createExampleCv, UserSchema } from '@cv/shared'
import { eq, ne, sql } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import { SESSION_COOKIE } from '../src/auth/sessions'
import { authTokens, cvs, sessions, users } from '../src/db/schema'
import { createLocalStorage } from '../src/lib/storage'
import { DEV_USER_EMAIL } from '../src/plugins/auth'
import { dbAvailable, useTestApp } from './context'

const PASSWORD = 'correct horse battery'
const ORIGIN = 'http://localhost:5173'

describe.skipIf(!dbAvailable)('auth API', () => {
  const ctx = useTestApp()
  const extraApps: Awaited<ReturnType<typeof buildApp>>[] = []
  afterEach(async () => {
    await Promise.all(extraApps.splice(0).map((app) => app.close()))
  })

  /** A fresh app has fresh rate limits, so tests do not use each other's attempts. */
  const freshApp = async (options: Partial<Parameters<typeof buildApp>[0]> = {}) => {
    const app = await buildApp({
      corsOrigin: ORIGIN,
      database: ctx.database,
      storage: createLocalStorage('/tmp/unused'),
      mailer: ctx.mailer,
      ...options,
    })
    extraApps.push(app)
    return app
  }
  type App = Awaited<ReturnType<typeof freshApp>>

  const post = (app: App, url: string, payload?: object, cookie?: string) =>
    app.inject({
      method: 'POST',
      url: `/api/auth${url}`,
      payload,
      headers: cookie ? { cookie } : {},
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
  const tokenFromMail = (index = -1) => {
    const mail = ctx.mailer.outbox.at(index)!
    return /token=([\w-]+)/.exec(mail.text)![1]!
  }

  describe('register', () => {
    it('creates the account, signs in with a protected cookie and mails a confirmation link', async () => {
      const app = await freshApp()
      const { res, cookie } = await register(app, '  Ann@Example.com ')
      expect(UserSchema.parse(res.json().user)).toMatchObject({
        email: 'ann@example.com',
        name: 'Ann',
        plan: 'free',
        emailVerified: false,
      })
      expect(res.json().user.passwordHash).toBeUndefined()
      const set = res.cookies.find((c) => c.name === SESSION_COOKIE)!
      expect(set).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' })
      expect((await me(app, cookie)).json().user.email).toBe('ann@example.com')

      expect(ctx.mailer.outbox).toHaveLength(1)
      expect(ctx.mailer.outbox[0]).toMatchObject({ to: 'ann@example.com' })
      expect(ctx.mailer.outbox[0]!.text).toContain(`${ORIGIN}/verify-email?token=`)
    })

    it('stores only hashes: no password and no session token in the database', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const [user] = await ctx.database.db
        .select()
        .from(users)
        .where(eq(users.email, 'ann@example.com'))
      expect(user!.passwordHash).toMatch(/^scrypt\$/)
      expect(user!.passwordHash).not.toContain(PASSWORD)
      const rows = await ctx.database.db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, user!.id))
      expect(rows).toHaveLength(1)
      expect(cookie).not.toContain(rows[0]!.tokenHash)
      expect(rows[0]!.tokenHash).toHaveLength(64)
    })

    it('refuses a taken email in any letter case, and the old dev address', async () => {
      const app = await freshApp()
      await register(app)
      const again = await post(app, '/register', { email: 'ANN@example.com', password: PASSWORD })
      expect(again.statusCode).toBe(409)
      expect(again.json().error.code).toBe('email_taken')
      const dev = await post(app, '/register', { email: DEV_USER_EMAIL, password: PASSWORD })
      expect(dev.statusCode).toBe(400) // not an email address at all
    })

    it('refuses weak or invalid input', async () => {
      const app = await freshApp()
      for (const body of [
        { email: 'ann@example.com', password: 'short' },
        { email: 'ann@example.com', password: 'password123' },
        { email: 'not-an-email', password: PASSWORD },
        {},
      ]) {
        const res = await post(app, '/register', body)
        expect(res.statusCode).toBe(400)
        expect(res.json().error.code).toBe('validation_error')
      }
    })

    it('limits sign-ups per address', async () => {
      const app = await freshApp()
      const codes: number[] = []
      for (let i = 0; i < 11; i++) {
        codes.push(
          (await post(app, '/register', { email: `u${i}@example.com`, password: PASSWORD }))
            .statusCode,
        )
      }
      expect(codes.slice(0, 10).every((c) => c === 201)).toBe(true)
      expect(codes[10]).toBe(429)
    })
  })

  describe('login and logout', () => {
    it('signs in with the right password and email in any case', async () => {
      const app = await freshApp()
      await register(app)
      const res = await post(app, '/login', { email: 'ANN@example.com', password: PASSWORD })
      expect(res.statusCode).toBe(200)
      expect((await me(app, cookieOf(res))).statusCode).toBe(200)
    })

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const app = await freshApp()
      await register(app)
      const wrong = await post(app, '/login', {
        email: 'ann@example.com',
        password: 'wrong password',
      })
      const unknown = await post(app, '/login', {
        email: 'nobody@example.com',
        password: 'wrong password',
      })
      expect(wrong.statusCode).toBe(401)
      expect(unknown.statusCode).toBe(401)
      expect(wrong.json()).toEqual(unknown.json())
      expect(cookieOf(wrong)).toBeUndefined()
    })

    it('locks an account out of guessing after 10 attempts, even with the right password', async () => {
      const app = await freshApp()
      await register(app)
      for (let i = 0; i < 10; i++) {
        expect(
          (await post(app, '/login', { email: 'ann@example.com', password: 'nope nope' }))
            .statusCode,
        ).toBe(401)
      }
      const blocked = await post(app, '/login', { email: 'ann@example.com', password: PASSWORD })
      expect(blocked.statusCode).toBe(429)
      expect(blocked.json().error.code).toBe('too_many_requests')
    })

    it('logout ends the session on the server, not just in the browser', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const out = await post(app, '/logout', undefined, cookie)
      expect(out.statusCode).toBe(204)
      expect(out.cookies.find((c) => c.name === SESSION_COOKIE)!.value).toBe('')
      expect((await me(app, cookie)).statusCode).toBe(401)
      // Logging out twice, or while signed out, is fine.
      expect((await post(app, '/logout', undefined, cookie)).statusCode).toBe(204)
      expect((await post(app, '/logout')).statusCode).toBe(204)
    })

    it('rejects an expired session and a made-up cookie', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      await ctx.database.db.execute(
        sql`update sessions set expires_at = now() - interval '1 minute'`,
      )
      const expired = await me(app, cookie)
      expect(expired.statusCode).toBe(401)
      expect(expired.json().error.code).toBe('unauthorized')
      expect((await me(app, `${SESSION_COOKIE}=made-up`)).statusCode).toBe(401)
      expect((await me(app)).statusCode).toBe(401)
    })

    it('extends a session that has been used, but never beyond 90 days in total', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      await ctx.database.db.execute(sql`update sessions set
        created_at = now() - interval '89 days',
        last_used_at = now() - interval '2 days',
        expires_at = now() + interval '5 days'`)
      expect((await me(app, cookie)).statusCode).toBe(200)
      const [row] = await ctx.database.db
        .select()
        .from(sessions)
        .where(ne(sessions.userId, ctx.userId))
      const daysLeft = (row!.expiresAt.getTime() - Date.now()) / 86_400_000
      expect(daysLeft).toBeGreaterThan(0.9)
      expect(daysLeft).toBeLessThan(1.1) // capped at created_at + 90 days
    })
  })

  describe('guarding the data', () => {
    it('answers 401 to data routes without a session and keeps public routes open', async () => {
      const app = await freshApp()
      for (const url of ['/cvs', '/jobs', '/cover-letters']) {
        const res = await app.inject({ method: 'GET', url: `/api${url}` })
        expect(res.statusCode).toBe(401)
      }
      expect((await app.inject({ method: 'POST', url: '/api/uploads' })).statusCode).toBe(401)
      expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200)
      expect(
        (await app.inject({ method: 'GET', url: '/api/shared/unknown-slug' })).statusCode,
      ).toBe(404)
    })

    it('refuses writes that come from another website', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const evil = await app.inject({
        method: 'POST',
        url: '/api/cvs',
        payload: {},
        headers: { cookie, origin: 'https://evil.example' },
      })
      expect(evil.statusCode).toBe(403)
      expect(evil.json().error.code).toBe('forbidden_origin')
      const own = await app.inject({
        method: 'POST',
        url: '/api/cvs',
        payload: {},
        headers: { cookie, origin: ORIGIN },
      })
      expect(own.statusCode).toBe(201)
    })
  })

  describe('profile', () => {
    it('updates the name', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me',
        payload: { name: '  Anna  ' },
        headers: { cookie },
      })
      expect(res.json().user.name).toBe('Anna')
      expect((await me(app, cookie)).json().user.name).toBe('Anna')
    })
  })

  describe('email confirmation', () => {
    it('confirms with the link, once', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const token = tokenFromMail()
      expect((await post(app, '/verify-email', { token })).statusCode).toBe(204)
      expect((await me(app, cookie)).json().user.emailVerified).toBe(true)
      const again = await post(app, '/verify-email', { token })
      expect(again.statusCode).toBe(400)
      expect(again.json().error.code).toBe('invalid_token')
    })

    it('rejects unknown and expired links', async () => {
      const app = await freshApp()
      await register(app)
      const token = tokenFromMail()
      await ctx.database.db.update(authTokens).set({ expiresAt: new Date(Date.now() - 1000) })
      expect((await post(app, '/verify-email', { token })).statusCode).toBe(400)
      expect((await post(app, '/verify-email', { token: 'x'.repeat(43) })).statusCode).toBe(400)
    })

    it('sends a new link on request and the old one stops working', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const first = tokenFromMail()
      expect((await post(app, '/resend-verification', undefined, cookie)).statusCode).toBe(204)
      expect(ctx.mailer.outbox).toHaveLength(2)
      expect((await post(app, '/verify-email', { token: first })).statusCode).toBe(400)
      expect((await post(app, '/verify-email', { token: tokenFromMail() })).statusCode).toBe(204)
      // Nothing more is sent once confirmed.
      await post(app, '/resend-verification', undefined, cookie)
      expect(ctx.mailer.outbox).toHaveLength(2)
      expect((await post(app, '/resend-verification')).statusCode).toBe(401)
    })
  })

  describe('forgotten password', () => {
    it('mails a link that sets a new password, signs everything out and works once', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      ctx.mailer.outbox.length = 0

      const asked = await post(app, '/forgot-password', { email: 'Ann@example.com' })
      expect(asked.statusCode).toBe(204)
      await new Promise((r) => setTimeout(r, 10))
      expect(ctx.mailer.outbox).toHaveLength(1)
      expect(ctx.mailer.outbox[0]!.text).toContain(`${ORIGIN}/reset-password?token=`)
      const token = tokenFromMail()

      const weak = await post(app, '/reset-password', { token, password: 'short' })
      expect(weak.statusCode).toBe(400)

      const reset = await post(app, '/reset-password', { token, password: 'a brand new secret' })
      expect(reset.statusCode).toBe(204)
      expect((await me(app, cookie)).statusCode).toBe(401)
      expect(
        (await post(app, '/login', { email: 'ann@example.com', password: PASSWORD })).statusCode,
      ).toBe(401)
      const login = await post(app, '/login', {
        email: 'ann@example.com',
        password: 'a brand new secret',
      })
      expect(login.statusCode).toBe(200)
      expect(login.json().user.emailVerified).toBe(true)

      const reused = await post(app, '/reset-password', { token, password: 'another new secret' })
      expect(reused.statusCode).toBe(400)
      expect(reused.json().error.code).toBe('invalid_token')
    })

    it('answers the same for unknown addresses and sends nothing', async () => {
      const app = await freshApp()
      const res = await post(app, '/forgot-password', { email: 'nobody@example.com' })
      expect(res.statusCode).toBe(204)
      expect(res.body).toBe('')
      expect(ctx.mailer.outbox).toHaveLength(0)
    })

    it('a newer link replaces the older one', async () => {
      const app = await freshApp()
      await register(app)
      await post(app, '/forgot-password', { email: 'ann@example.com' })
      const first = tokenFromMail()
      await post(app, '/forgot-password', { email: 'ann@example.com' })
      const second = tokenFromMail()
      expect(
        (await post(app, '/reset-password', { token: first, password: 'a brand new secret' }))
          .statusCode,
      ).toBe(400)
      expect(
        (await post(app, '/reset-password', { token: second, password: 'a brand new secret' }))
          .statusCode,
      ).toBe(204)
    })

    it('does not mail more than 3 times per address and hour', async () => {
      const app = await freshApp()
      await register(app)
      ctx.mailer.outbox.length = 0
      for (let i = 0; i < 4; i++) {
        expect((await post(app, '/forgot-password', { email: 'ann@example.com' })).statusCode).toBe(
          204,
        )
      }
      await new Promise((r) => setTimeout(r, 10))
      expect(ctx.mailer.outbox).toHaveLength(3)
    })

    it('does not break when the email service fails', async () => {
      const app = await freshApp({
        mailer: {
          send: async () => {
            throw new Error('mail service down')
          },
        },
      })
      const { res } = await register(app)
      expect(res.statusCode).toBe(201)
      expect((await post(app, '/forgot-password', { email: 'ann@example.com' })).statusCode).toBe(
        204,
      )
    })
  })

  describe('change password', () => {
    it('keeps this browser signed in and signs the others out', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const other = cookieOf(
        await post(app, '/login', { email: 'ann@example.com', password: PASSWORD }),
      )!
      const res = await post(
        app,
        '/change-password',
        { currentPassword: PASSWORD, newPassword: 'a brand new secret' },
        cookie,
      )
      expect(res.statusCode).toBe(204)
      expect((await me(app, cookie)).statusCode).toBe(200)
      expect((await me(app, other)).statusCode).toBe(401)
      expect(
        (await post(app, '/login', { email: 'ann@example.com', password: 'a brand new secret' }))
          .statusCode,
      ).toBe(200)
    })

    it('needs the current password', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      const res = await post(
        app,
        '/change-password',
        { currentPassword: 'not it at all', newPassword: 'a brand new secret' },
        cookie,
      )
      expect(res.statusCode).toBe(403)
      expect(res.json().error.code).toBe('wrong_password')
    })
  })

  describe('delete account', () => {
    it('removes the account with all its data and signs out', async () => {
      const app = await freshApp()
      const { cookie } = await register(app)
      await app.inject({ method: 'POST', url: '/api/cvs', payload: {}, headers: { cookie } })
      const wrong = await post(app, '/delete-account', { password: 'not it at all' }, cookie)
      expect(wrong.statusCode).toBe(403)
      expect((await me(app, cookie)).statusCode).toBe(200)

      const res = await post(app, '/delete-account', { password: PASSWORD }, cookie)
      expect(res.statusCode).toBe(204)
      expect((await me(app, cookie)).statusCode).toBe(401)
      expect(
        await ctx.database.db.select().from(cvs).where(eq(cvs.userId, ctx.userId)),
      ).toHaveLength(0)
      const left = await ctx.database.db
        .select()
        .from(users)
        .where(eq(users.email, 'ann@example.com'))
      expect(left).toHaveLength(0)
      expect(
        (await post(app, '/login', { email: 'ann@example.com', password: PASSWORD })).statusCode,
      ).toBe(401)
    })
  })

  describe('the first account inherits the old dev data', () => {
    const seedDevData = async () => {
      await ctx.database.db.execute(sql`truncate users cascade`)
      const [dev] = await ctx.database.db
        .insert(users)
        .values({ email: DEV_USER_EMAIL })
        .returning()
      await ctx.database.db
        .insert(cvs)
        .values({ userId: dev!.id, title: 'Old CV', document: createExampleCv('designer') })
    }
    const titles = async (app: App, cookie: string) =>
      (await app.inject({ method: 'GET', url: '/api/cvs', headers: { cookie } }))
        .json()
        .map((d: { title: string }) => d.title)

    it('hands it to the first account only, and removes the dev user', async () => {
      await seedDevData()
      const app = await freshApp({ claimDevData: true })
      const first = await register(app, 'first@example.com')
      expect(await titles(app, first.cookie)).toEqual(['Old CV'])
      const dev = await ctx.database.db.select().from(users).where(eq(users.email, DEV_USER_EMAIL))
      expect(dev).toHaveLength(0)
      const second = await register(app, 'second@example.com')
      expect(await titles(app, second.cookie)).toEqual([])
    })

    it('does nothing unless switched on (production)', async () => {
      await seedDevData()
      const app = await freshApp({ claimDevData: false })
      const first = await register(app, 'first@example.com')
      expect(await titles(app, first.cookie)).toEqual([])
    })

    it('two sign-ups at the same time: exactly one inherits', async () => {
      await seedDevData()
      const app = await freshApp({ claimDevData: true })
      const results = await Promise.all(
        ['a@example.com', 'b@example.com'].map((email) => register(app, email)),
      )
      const counts = await Promise.all(results.map((r) => titles(app, r.cookie)))
      expect(counts.map((t) => t.length).sort()).toEqual([0, 1])
    })
  })
})
