import type { Locale, Plan } from '@cv/shared'
import { eq } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { sessions, users } from '../../db/schema/index'
import { hashToken, newToken } from './tokens'

export const SESSION_COOKIE = 'cv_session'

const DAY_MS = 24 * 60 * 60 * 1000
/** A session ends after this long without use... */
const IDLE_MS = 30 * DAY_MS
/** ...and never lives longer than this, however often it is used. */
const ABSOLUTE_MS = 90 * DAY_MS
/** Extending the session on every request would write on every request. */
const REFRESH_AFTER_MS = DAY_MS

export interface CookieSettings {
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
}

export const sessionCookieOptions = (settings: CookieSettings) => ({
  httpOnly: true,
  path: '/',
  secure: settings.secure,
  sameSite: settings.sameSite,
})

export interface SessionUser {
  id: string
  plan: Plan
  email: string
  name: string
  emailVerified: boolean
  locale: Locale
}

export async function createSession(
  { db }: Pick<Database, 'db'>,
  userId: string,
  now = Date.now(),
): Promise<{ token: string; maxAgeSeconds: number }> {
  const token = newToken()
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(now + IDLE_MS),
  })
  return { token, maxAgeSeconds: IDLE_MS / 1000 }
}

/** The user behind a cookie token, or null when it is unknown or expired. */
export async function findSession(
  { db }: Pick<Database, 'db'>,
  token: string,
  now = Date.now(),
): Promise<{ sessionId: string; user: SessionUser } | null> {
  const [row] = await db
    .select({
      sessionId: sessions.id,
      createdAt: sessions.createdAt,
      lastUsedAt: sessions.lastUsedAt,
      expiresAt: sessions.expiresAt,
      id: users.id,
      plan: users.plan,
      email: users.email,
      name: users.name,
      emailVerifiedAt: users.emailVerifiedAt,
      locale: users.locale,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, hashToken(token)))
  if (!row) return null
  if (row.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId))
    return null
  }
  if (now - row.lastUsedAt.getTime() > REFRESH_AFTER_MS) {
    const expiresAt = Math.min(now + IDLE_MS, row.createdAt.getTime() + ABSOLUTE_MS)
    await db
      .update(sessions)
      .set({ lastUsedAt: new Date(now), expiresAt: new Date(expiresAt) })
      .where(eq(sessions.id, row.sessionId))
  }
  return {
    sessionId: row.sessionId,
    user: {
      id: row.id,
      plan: row.plan,
      email: row.email,
      name: row.name,
      emailVerified: row.emailVerifiedAt !== null,
      locale: row.locale,
    },
  }
}

export async function deleteSessionByToken({ db }: Pick<Database, 'db'>, token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
}
