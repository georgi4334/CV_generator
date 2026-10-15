import type { FastifyInstance, FastifyRequest } from 'fastify'
import { findSession, SESSION_COOKIE, type SessionUser } from '../auth/sessions'
import type { Database } from '../db/client'
import { HttpError } from '../lib/errors'

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser
    sessionId: string
  }
}

/** The address of the local development account of the days before login existed. */
export const DEV_USER_EMAIL = 'dev@localhost'

/** Call once on a scope; its child scopes can then use `requireUser`. */
export function decorateRequests(app: FastifyInstance) {
  app.decorateRequest('user', null as never)
  app.decorateRequest('sessionId', '')
}

/**
 * An `onRequest` hook for routes that need a signed-in user: reads the session
 * cookie and sets `request.user`. Routes scope all data by `request.user.id`.
 * Register it with `scope.addHook('onRequest', requireUser(database))`.
 */
export function requireUser(database: Pick<Database, 'db'>) {
  return async (request: FastifyRequest) => {
    const token = request.cookies[SESSION_COOKIE]
    const session = token ? await findSession(database, token) : null
    if (!session) throw new HttpError(401, 'unauthorized', 'Sign in to continue')
    request.user = session.user
    request.sessionId = session.sessionId
  }
}
