import {
  ChangePasswordInputSchema,
  DeleteAccountInputSchema,
  ForgotPasswordInputSchema,
  LoginInputSchema,
  RegisterInputSchema,
  ResetPasswordInputSchema,
  UpdateProfileInputSchema,
  VerifyEmailInputSchema,
  type Locale,
  type User,
} from '@cv/shared'
import { and, count, eq, gt, isNull, ne } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { resetEmail, verificationEmail } from './emails'
import { hashPassword, verifyAgainstDummy, verifyPassword } from './password'
import {
  createSession,
  deleteSessionByToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  type CookieSettings,
  type SessionUser,
} from './sessions'
import { hashToken, newToken } from './tokens'
import type { Database } from '../../db/client'
import {
  authTokens,
  coverLetters,
  resignations,
  cvs,
  jobs,
  sessions,
  uploads,
  users,
  type AuthTokenPurpose,
} from '../../db/schema/index'
import { HttpError } from '../../infra/errors'
import type { Mailer } from '../../infra/mailer'
import { createRateLimiter } from '../../infra/rateLimit'
import type { Storage } from '../../infra/storage/index'
import { DEV_USER_EMAIL, requireUser } from './requireUser'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const RESET_TOKEN_MS = HOUR
const VERIFY_TOKEN_MS = 24 * HOUR

export interface AuthRouteOptions {
  database: Database
  storage: Storage
  mailer: Mailer
  /** Where the web app lives; email links point there. */
  appUrl: string
  cookie: CookieSettings
  /** The first account takes over the data of the pre-login "dev" user. */
  claimDevData: boolean
  /** Multiplies the rate limits; only browser tests use more than 1. */
  limitScale?: number
}

const toUser = (user: SessionUser & { createdAt: Date }): User => ({
  id: user.id,
  email: user.email,
  name: user.name,
  plan: user.plan,
  emailVerified: user.emailVerified,
  locale: user.locale,
  createdAt: user.createdAt.toISOString(),
})

const isUniqueViolation = (error: unknown) =>
  [error, (error as { cause?: unknown })?.cause].some(
    (e) => (e as { code?: unknown } | undefined)?.code === '23505',
  )

const tooMany = () =>
  new HttpError(429, 'too_many_requests', 'Too many attempts. Please wait a while and try again.')

export async function authRoutes(app: FastifyInstance, opts: AuthRouteOptions) {
  const { db } = opts.database
  const authenticate = requireUser(opts.database)

  // Limits protect against guessing passwords and mail flooding (per API instance).
  const scale = opts.limitScale ?? 1
  const limits = {
    loginAccount: createRateLimiter({ max: 10 * scale, windowMs: 15 * MINUTE }),
    loginIp: createRateLimiter({ max: 50 * scale, windowMs: 15 * MINUTE }),
    register: createRateLimiter({ max: 10 * scale, windowMs: HOUR }),
    forgotIp: createRateLimiter({ max: 5 * scale, windowMs: HOUR }),
    forgotEmail: createRateLimiter({ max: 3 * scale, windowMs: HOUR }),
    token: createRateLimiter({ max: 20 * scale, windowMs: HOUR }),
    resend: createRateLimiter({ max: 3 * scale, windowMs: HOUR }),
    password: createRateLimiter({ max: 10 * scale, windowMs: 15 * MINUTE }),
  }
  const allow = (limiter: { hit: (key: string) => boolean }, key: string) => {
    if (!limiter.hit(key)) throw tooMany()
  }

  async function startSession(reply: FastifyReply, userId: string) {
    const { token, maxAgeSeconds } = await createSession(opts.database, userId)
    reply.setCookie(SESSION_COOKIE, token, {
      ...sessionCookieOptions(opts.cookie),
      maxAge: maxAgeSeconds,
    })
  }

  const endSession = (reply: FastifyReply) =>
    reply.clearCookie(SESSION_COOKIE, sessionCookieOptions(opts.cookie))

  /** Stores a one-time token (replacing older ones of that kind) and returns the secret. */
  async function issueToken(userId: string, purpose: AuthTokenPurpose, ttlMs: number) {
    const token = newToken()
    await db.transaction(async (tx) => {
      await tx
        .delete(authTokens)
        .where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose)))
      await tx.insert(authTokens).values({
        userId,
        purpose,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttlMs),
      })
    })
    return token
  }

  /** Marks a valid unused token as used, once. Returns the user it belongs to. */
  async function useToken(purpose: AuthTokenPurpose, token: string) {
    const [row] = await db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(authTokens.tokenHash, hashToken(token)),
          eq(authTokens.purpose, purpose),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: authTokens.userId })
    if (!row) throw new HttpError(400, 'invalid_token', 'This link is invalid or has expired')
    return row.userId
  }

  /** Mail problems must not break (or reveal anything about) the request. */
  const sendMail = (request: FastifyRequest, email: Parameters<Mailer['send']>[0]) => {
    opts.mailer.send(email).catch((error) => request.log.error(error, 'could not send email'))
  }

  async function verificationFor(user: { id: string; email: string; locale: Locale }) {
    const token = await issueToken(user.id, 'email_verification', VERIFY_TOKEN_MS)
    return verificationEmail(user.email, user.locale, `${opts.appUrl}/verify-email?token=${token}`)
  }

  /** After sign-up: in the background, so a mail problem never blocks creating the account. */
  async function sendVerification(
    request: FastifyRequest,
    user: { id: string; email: string; locale: Locale },
  ) {
    sendMail(request, await verificationFor(user))
  }

  app.post('/auth/register', async (request, reply) => {
    allow(limits.register, request.clientIp)
    const input = RegisterInputSchema.parse(request.body)
    if (input.email === DEV_USER_EMAIL) {
      throw new HttpError(409, 'email_taken', 'An account with this email already exists')
    }
    const passwordHash = await hashPassword(input.password)

    let created: typeof users.$inferSelect
    try {
      created = await db.transaction(async (tx) => {
        // The lock makes two simultaneous "first" accounts take turns: only one inherits.
        const [dev] = opts.claimDevData
          ? await tx
              .select({ id: users.id })
              .from(users)
              .where(eq(users.email, DEV_USER_EMAIL))
              .for('update')
          : []
        const [others] = dev
          ? await tx.select({ n: count() }).from(users).where(ne(users.email, DEV_USER_EMAIL))
          : [undefined]

        const [user] = await tx
          .insert(users)
          .values({ email: input.email, name: input.name, locale: input.locale, passwordHash })
          .returning()

        if (dev && others?.n === 0) {
          const move = { userId: user!.id }
          await tx.update(cvs).set(move).where(eq(cvs.userId, dev.id))
          await tx.update(coverLetters).set(move).where(eq(coverLetters.userId, dev.id))
          await tx.update(resignations).set(move).where(eq(resignations.userId, dev.id))
          await tx.update(jobs).set(move).where(eq(jobs.userId, dev.id))
          await tx.update(uploads).set(move).where(eq(uploads.userId, dev.id))
          await tx.delete(users).where(eq(users.id, dev.id))
        }
        return user!
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HttpError(409, 'email_taken', 'An account with this email already exists')
      }
      throw error
    }

    await startSession(reply, created.id)
    await sendVerification(request, created)
    return reply.status(201).send({
      user: toUser({ ...created, emailVerified: false }),
    })
  })

  app.post('/auth/login', async (request, reply) => {
    allow(limits.loginIp, request.clientIp)
    const input = LoginInputSchema.parse(request.body)
    const accountKey = `${request.clientIp}:${input.email}`
    allow(limits.loginAccount, accountKey)

    const [user] = await db.select().from(users).where(eq(users.email, input.email))
    const valid = user?.passwordHash
      ? await verifyPassword(input.password, user.passwordHash)
      : await verifyAgainstDummy(input.password)
    if (!user || !valid) {
      throw new HttpError(401, 'invalid_credentials', 'Wrong email or password')
    }
    limits.loginAccount.reset(accountKey)
    await startSession(reply, user.id)
    return { user: toUser({ ...user, emailVerified: user.emailVerifiedAt !== null }) }
  })

  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) await deleteSessionByToken(opts.database, token)
    endSession(reply)
    return reply.status(204).send()
  })

  app.post('/auth/forgot-password', async (request, reply) => {
    allow(limits.forgotIp, request.clientIp)
    const { email, locale } = ForgotPasswordInputSchema.parse(request.body)
    // Same answer whether or not the account exists.
    if (limits.forgotEmail.hit(email)) {
      const [user] = await db.select().from(users).where(eq(users.email, email))
      if (user?.passwordHash) {
        const token = await issueToken(user.id, 'password_reset', RESET_TOKEN_MS)
        sendMail(
          request,
          resetEmail(
            user.email,
            locale ?? user.locale,
            `${opts.appUrl}/reset-password?token=${token}`,
          ),
        )
      }
    }
    return reply.status(204).send()
  })

  app.post('/auth/reset-password', async (request, reply) => {
    allow(limits.token, request.clientIp)
    const input = ResetPasswordInputSchema.parse(request.body)
    const userId = await useToken('password_reset', input.token)
    const passwordHash = await hashPassword(input.password)
    await db.transaction(async (tx) => {
      // The link came to this mailbox, so the email is proven too.
      await tx
        .update(users)
        .set({ passwordHash, emailVerifiedAt: new Date() })
        .where(eq(users.id, userId))
      // Whoever knew the old password is signed out everywhere.
      await tx.delete(sessions).where(eq(sessions.userId, userId))
    })
    endSession(reply)
    return reply.status(204).send()
  })

  app.post('/auth/verify-email', async (request, reply) => {
    allow(limits.token, request.clientIp)
    const input = VerifyEmailInputSchema.parse(request.body)
    const userId = await useToken('email_verification', input.token)
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId))
    return reply.status(204).send()
  })

  // Everything below needs a signed-in user.
  await app.register(async (me) => {
    me.addHook('onRequest', authenticate)

    const current = async (id: string) => {
      const [row] = await db.select().from(users).where(eq(users.id, id))
      return row!
    }

    me.get('/auth/me', async (request) => {
      const user = await current(request.user.id)
      return { user: toUser({ ...user, emailVerified: user.emailVerifiedAt !== null }) }
    })

    me.patch('/auth/me', async (request) => {
      const change = UpdateProfileInputSchema.parse(request.body)
      const [user] = await db
        .update(users)
        .set(change)
        .where(eq(users.id, request.user.id))
        .returning()
      return { user: toUser({ ...user!, emailVerified: user!.emailVerifiedAt !== null }) }
    })

    // Asked for by the person, so they hear whether it worked: the email is sent
    // before answering, and a failure is reported instead of "on its way".
    me.post('/auth/resend-verification', async (request, reply) => {
      allow(limits.resend, request.user.id)
      if (!request.user.emailVerified) {
        try {
          await opts.mailer.send(await verificationFor(request.user))
        } catch (error) {
          request.log.error(error, 'could not send email')
          throw new HttpError(502, 'email_failed', 'The email could not be sent')
        }
      }
      return reply.status(204).send()
    })

    me.post('/auth/change-password', async (request, reply) => {
      allow(limits.password, request.user.id)
      const input = ChangePasswordInputSchema.parse(request.body)
      const user = await current(request.user.id)
      if (!user.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
        throw new HttpError(403, 'wrong_password', 'The current password is not correct')
      }
      const passwordHash = await hashPassword(input.newPassword)
      await db.transaction(async (tx) => {
        await tx.update(users).set({ passwordHash }).where(eq(users.id, user.id))
        // This browser stays signed in; every other one has to sign in again.
        await tx
          .delete(sessions)
          .where(and(eq(sessions.userId, user.id), ne(sessions.id, request.sessionId)))
      })
      return reply.status(204).send()
    })

    me.post('/auth/delete-account', async (request, reply) => {
      allow(limits.password, request.user.id)
      const input = DeleteAccountInputSchema.parse(request.body)
      const user = await current(request.user.id)
      if (!user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new HttpError(403, 'wrong_password', 'The password is not correct')
      }
      const files = await db
        .select({ key: uploads.storageKey })
        .from(uploads)
        .where(eq(uploads.userId, user.id))
      // CVs, letters, jobs, uploads, shares and sessions go with the user (cascade).
      await db.delete(users).where(eq(users.id, user.id))
      await Promise.all(
        files.map((file) =>
          opts.storage
            .remove(file.key)
            .catch((error) => request.log.warn(error, 'could not remove an uploaded file')),
        ),
      )
      endSession(reply)
      return reply.status(204).send()
    })
  })
}
