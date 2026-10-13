import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import type { Database } from '../db/client'
import type { Plan } from '@cv/shared'

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; plan: Plan }
  }
}

export const DEV_USER_EMAIL = 'dev@localhost'

/**
 * Until login exists (Step 15) every request acts as one local "dev" user,
 * created on first start. Routes already scope all data by `request.user.id`,
 * so adding real accounts only replaces this plugin. Registered only around
 * the data routes, so /health keeps working while the database is down.
 */
/**
 * Call directly on the route scope (not via `register`): Fastify keeps hooks
 * of a registered plugin private to that plugin.
 */
export function useCurrentUser(app: FastifyInstance, opts: { database: Database }) {
  const { db } = opts.database

  async function devUser() {
    const select = () =>
      db
        .select({ id: users.id, plan: users.plan })
        .from(users)
        .where(eq(users.email, DEV_USER_EMAIL))
    const [existing] = await select()
    if (existing) return existing
    await db
      .insert(users)
      .values({ email: DEV_USER_EMAIL, name: 'Developer' })
      .onConflictDoNothing()
    const [created] = await select()
    return created!
  }

  app.decorateRequest('user', null as never)
  app.addHook('onRequest', async (request) => {
    request.user = await devUser()
  })
}
