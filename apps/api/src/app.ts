import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import type { CookieSettings } from './auth/sessions'
import type { Database } from './db/client'
import { databaseUnavailable, HttpError, registerErrorHandler } from './lib/errors'
import { createLogMailer, type Mailer } from './lib/mailer'
import type { Storage } from './lib/storage'
import { decorateRequests, requireUser } from './plugins/auth'
import { authRoutes } from './routes/auth'
import { coverLetterRoutes } from './routes/coverLetters'
import { cvRoutes } from './routes/cvs'
import { healthRoutes } from './routes/health'
import { jobRoutes } from './routes/jobs'
import { professionRoutes } from './routes/professions'
import { publicShareRoutes, shareRoutes } from './routes/share'
import { publicUploadRoutes, uploadRoutes } from './routes/uploads'

export interface AppOptions {
  corsOrigin: string
  database: Pick<Database, 'db' | 'isHealthy'>
  storage: Storage
  /** Makes sure the tables exist before data routes run (retries until it works). */
  ensureMigrated?: () => Promise<void>
  /** Include the underlying error in 500 responses (development only). */
  exposeErrors?: boolean
  logger?: boolean
  /** Sends account emails; defaults to printing them in the log. */
  mailer?: Mailer
  /** Where the web app lives (links in emails). */
  appUrl?: string
  cookie?: Partial<CookieSettings>
  /** The first account takes over the data of the old pre-login "dev" user. */
  claimDevData?: boolean
  /** Trust X-Forwarded-For (behind a hosting proxy), so rate limits see real addresses. */
  trustProxy?: boolean
}

export async function buildApp(opts: AppOptions) {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 2 * 1024 * 1024,
    trustProxy: opts.trustProxy ?? false,
  })
  registerErrorHandler(app, { exposeErrors: opts.exposeErrors ?? false })

  const allowedOrigins = opts.corsOrigin.split(',').map((origin) => origin.trim())
  await app.register(cookie)
  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })

  // Cookies are sent by browsers on cross-site requests too; refuse state-changing
  // requests from other sites (SameSite cookies are the first line, this the second).
  app.addHook('onRequest', async (request) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return
    const { origin } = request.headers
    if (origin && !allowedOrigins.includes(origin)) {
      throw new HttpError(403, 'forbidden_origin', 'Requests from this site are not allowed')
    }
  })

  const database = opts.database as Database
  const cookieSettings: CookieSettings = {
    secure: opts.cookie?.secure ?? false,
    sameSite: opts.cookie?.sameSite ?? 'lax',
  }
  const mailer = opts.mailer ?? createLogMailer()
  await app.register(
    async (api) => {
      // Public routes
      await api.register(healthRoutes, { isDbHealthy: opts.database.isHealthy })
      await api.register(professionRoutes)
      await api.register(publicUploadRoutes, { database, storage: opts.storage })

      // Routes that need the tables
      await api.register(async (data) => {
        const { ensureMigrated } = opts
        if (ensureMigrated) {
          data.addHook('onRequest', async (request) => {
            try {
              await ensureMigrated()
            } catch (error) {
              request.log.error(error, 'database not ready')
              const cause =
                (error as Error & { cause?: Error }).cause?.message ?? (error as Error).message
              throw databaseUnavailable(opts.exposeErrors ? cause : undefined)
            }
          })
        }
        decorateRequests(data)
        // Public: anyone with a share link
        await data.register(publicShareRoutes, { database })

        // Sign up, sign in, password reset (some of these need a session themselves)
        await data.register(authRoutes, {
          database,
          storage: opts.storage,
          mailer,
          appUrl: opts.appUrl ?? 'http://localhost:5173',
          cookie: cookieSettings,
          claimDevData: opts.claimDevData ?? false,
        })

        // Acting for the signed-in user
        await data.register(async (scope) => {
          scope.addHook('onRequest', requireUser(database))
          await scope.register(cvRoutes, { database })
          await scope.register(shareRoutes, { database })
          await scope.register(jobRoutes, { database })
          await scope.register(coverLetterRoutes, { database })
          await scope.register(uploadRoutes, { database, storage: opts.storage })
        })
      })
    },
    { prefix: '/api' },
  )

  return app
}
