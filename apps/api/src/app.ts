import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import Fastify, { type FastifyRequest } from 'fastify'
import { timingSafeEqual } from 'node:crypto'
import type { CookieSettings } from './modules/auth/sessions'
import type { Database } from './db/client'
import { databaseUnavailable, HttpError, registerErrorHandler } from './infra/errors'
import { createLogMailer, type Mailer } from './infra/mailer'
import type { Storage } from './infra/storage/index'
import { decorateRequests, requireUser } from './modules/auth/requireUser'
import type { AiProvider } from './modules/ai/provider'
import { aiRoutes } from './modules/ai/routes'
import { authRoutes } from './modules/auth/routes'
import { coverLetterRoutes } from './modules/cover-letters/routes'
import { resignationRoutes } from './modules/resignations/routes'
import { cvRoutes } from './modules/cvs/routes'
import { healthRoutes } from './modules/health/routes'
import { jobRoutes } from './modules/jobs/routes'
import { professionRoutes } from './modules/professions/routes'
import { publicShareRoutes, shareRoutes } from './modules/share/routes'
import { publicUploadRoutes, uploadRoutes } from './modules/uploads/routes'

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
  /** Multiplies the sign-in and sign-up rate limits (browser tests only). */
  authLimitScale?: number
  /** Trust X-Forwarded-For (behind a hosting proxy), so rate limits see real addresses. */
  trustProxy?: boolean
  /** The AI service; absent or null turns the AI features off. */
  ai?: { provider: AiProvider | null; maxPerMinute?: number }
  /**
   * Set when the API sits behind the web app's proxy (Cloudflare Pages Function):
   * requests must carry it, and the client address comes from the proxy.
   */
  proxySecret?: string
  /** Reports unexpected server errors (e.g. to Sentry). */
  onServerError?: (error: Error, request: FastifyRequest) => void
}

export async function buildApp(opts: AppOptions) {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 2 * 1024 * 1024,
    trustProxy: opts.trustProxy ?? false,
  })
  registerErrorHandler(app, {
    exposeErrors: opts.exposeErrors ?? false,
    onServerError: opts.onServerError,
  })

  // Requests that skip the web app's proxy are refused; health checks and the
  // keep-warm ping stay open so the host can reach them directly.
  const secret = opts.proxySecret ? Buffer.from(opts.proxySecret) : null
  const OPEN_PATHS = new Set(['/api/health', '/api/ping'])
  app.decorateRequest('clientIp', '')
  app.addHook('onRequest', async (request) => {
    request.clientIp = request.ip
    if (!secret) return
    const path = request.url.split('?')[0]!
    if (OPEN_PATHS.has(path)) return
    const given = Buffer.from(String(request.headers['x-proxy-secret'] ?? ''))
    if (given.length !== secret.length || !timingSafeEqual(given, secret)) {
      throw new HttpError(403, 'forbidden', 'Use the web app to reach this API')
    }
    const forwarded = request.headers['x-client-ip']
    if (typeof forwarded === 'string' && forwarded.length > 0 && forwarded.length <= 100) {
      request.clientIp = forwarded
    }
  })

  // Basic hardening headers; the API only serves JSON and uploaded images.
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('Referrer-Policy', 'no-referrer')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Cross-Origin-Resource-Policy', 'same-site')
  })

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
      await api.register(healthRoutes, {
        isDbHealthy: opts.database.isHealthy,
        emailDelivers: mailer.delivers,
      })
      // For keep-warm services: answers without touching the database, so the
      // database can still sleep when nobody uses the app.
      api.get('/ping', async () => ({ ok: true }))
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
          limitScale: opts.authLimitScale,
        })

        // Acting for the signed-in user
        await data.register(async (scope) => {
          scope.addHook('onRequest', requireUser(database))
          await scope.register(cvRoutes, { database })
          await scope.register(shareRoutes, { database })
          await scope.register(jobRoutes, { database })
          await scope.register(coverLetterRoutes, { database })
          await scope.register(resignationRoutes, { database })
          await scope.register(uploadRoutes, { database, storage: opts.storage })
          await scope.register(aiRoutes, {
            database,
            provider: opts.ai?.provider ?? null,
            maxPerMinute: opts.ai?.maxPerMinute ?? 10,
          })
        })
      })
    },
    { prefix: '/api' },
  )

  return app
}
