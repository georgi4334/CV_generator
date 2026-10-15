import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { afterAll, beforeEach, inject } from 'vitest'
import { buildApp } from '../src/app'
import { createSession, SESSION_COOKIE } from '../src/auth/sessions'
import { createDb, type Database } from '../src/db/client'
import { users } from '../src/db/schema'
import { createMemoryMailer } from '../src/lib/mailer'
import { createLocalStorage } from '../src/lib/storage'
import { TEST_DATABASE_URL } from './env'

export const dbAvailable = inject('dbAvailable')

/** A real app on the test database, emptied before every test. */
export function useTestApp() {
  const url = TEST_DATABASE_URL
  const context = {} as {
    app: Awaited<ReturnType<typeof buildApp>>
    database: Database
    mailer: ReturnType<typeof createMemoryMailer>
    /** The signed-in default user: send `headers: { cookie: ctx.cookie }`. */
    cookie: string
    userId: string
    /** Another signed-in user (for checking that accounts stay apart). */
    signUp: (email: string) => Promise<{ cookie: string; userId: string }>
  }

  beforeEach(async () => {
    if (!context.database) {
      context.database = createDb(url)
      context.mailer = createMemoryMailer()
      context.signUp = async (email) => {
        const [user] = await context.database.db.insert(users).values({ email }).returning()
        const { token } = await createSession(context.database, user!.id)
        return { cookie: `${SESSION_COOKIE}=${token}`, userId: user!.id }
      }
      context.app = await buildApp({
        mailer: context.mailer,
        corsOrigin: 'http://localhost:5173',
        database: context.database,
        storage: createLocalStorage(mkdtempSync(join(tmpdir(), 'cv-uploads-'))),
      })
    }
    await context.database.db.execute(
      sql`truncate users, cvs, cv_versions, uploads, share_links, jobs, cover_letters, sessions, auth_tokens cascade`,
    )
    context.mailer.outbox.length = 0
    Object.assign(context, await context.signUp('user@example.com'))
  })

  afterAll(async () => {
    await context.app?.close()
    await context.database?.close()
  })

  return context
}
