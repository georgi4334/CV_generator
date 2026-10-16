import * as Sentry from '@sentry/node'
import { createGeminiProvider } from './ai/gemini'
import { createMockProvider } from './ai/mock'
import { buildApp } from './app'
import { createDb } from './db/client'
import { createMigrator, runMigrations } from './db/migrate'
import { productionProblems, productionWarnings } from './config'
import { env } from './env'
import { createBrevoMailer, createLogMailer } from './lib/mailer'
import { createR2Storage } from './lib/r2Storage'
import { createLocalStorage } from './lib/storage'

const problems = productionProblems(env)
if (problems.length) {
  console.error(
    `The API is not configured for production:\n- ${problems.join('\n- ')}\nSee docs/DEPLOY.md.`,
  )
  process.exit(1)
}
for (const warning of productionWarnings(env)) console.warn(`Warning: ${warning}`)

if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: 0 })
}

const database = createDb(env.DATABASE_URL)

const ensureMigrated = env.MIGRATE_ON_START
  ? createMigrator(() => runMigrations(database))
  : undefined

if (ensureMigrated) {
  try {
    await ensureMigrated()
  } catch (error) {
    // Start anyway: /api/health reports the database as down, and the first
    // data request tries the migrations again once the database is up.
    console.error(
      'Database migrations failed; is the database running? Will retry on the next request.',
      error,
    )
  }
}

const cookieSecure = env.COOKIE_SECURE
  ? env.COOKIE_SECURE === 'true'
  : env.NODE_ENV === 'production'
if (env.COOKIE_SAME_SITE === 'none' && !cookieSecure) {
  throw new Error('COOKIE_SAME_SITE=none requires COOKIE_SECURE=true')
}

const aiProvider = env.AI_PROVIDER ?? (env.GEMINI_API_KEY ? 'gemini' : 'off')
if (aiProvider === 'gemini' && !env.GEMINI_API_KEY) {
  throw new Error('AI_PROVIDER=gemini requires GEMINI_API_KEY')
}
if (aiProvider === 'mock' && env.NODE_ENV === 'production') {
  throw new Error('AI_PROVIDER=mock is for development only')
}

const app = await buildApp({
  corsOrigin: env.CORS_ORIGIN,
  database,
  storage:
    env.STORAGE === 'r2'
      ? createR2Storage({
          accountId: env.R2_ACCOUNT_ID,
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          bucket: env.R2_BUCKET,
        })
      : createLocalStorage(env.UPLOAD_DIR),
  mailer: env.BREVO_API_KEY
    ? createBrevoMailer({
        apiKey: env.BREVO_API_KEY,
        from: { email: env.MAIL_FROM, name: env.MAIL_FROM_NAME },
      })
    : createLogMailer(),
  proxySecret: env.PROXY_SECRET || undefined,
  onServerError: env.SENTRY_DSN
    ? (error, request) =>
        Sentry.withScope((scope) => {
          // Only the route and the user id; never request bodies (CVs are personal data).
          scope.setTag('route', request.routeOptions.url ?? 'unknown')
          if (request.user) scope.setUser({ id: request.user.id })
          Sentry.captureException(error)
        })
    : undefined,
  ensureMigrated,
  exposeErrors: env.NODE_ENV !== 'production',
  logger: true,
  appUrl: env.APP_URL,
  cookie: {
    secure: cookieSecure,
    sameSite: env.COOKIE_SAME_SITE,
  },
  // Never hand a production database's first account someone else's data.
  claimDevData: env.NODE_ENV !== 'production',
  trustProxy: env.TRUST_PROXY,
  ai: {
    provider:
      aiProvider === 'gemini'
        ? createGeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL })
        : aiProvider === 'mock'
          ? createMockProvider()
          : null,
    maxPerMinute: env.AI_MAX_PER_MINUTE,
  },
})

const shutdown = async () => {
  await app.close()
  await Sentry.close(2000)
  await database.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await app.listen({ port: env.PORT, host: '0.0.0.0' })
