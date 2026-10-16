import { createGeminiProvider } from './ai/gemini'
import { createMockProvider } from './ai/mock'
import { buildApp } from './app'
import { createDb } from './db/client'
import { createMigrator, runMigrations } from './db/migrate'
import { env } from './env'
import { createLocalStorage } from './lib/storage'

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
  storage: createLocalStorage(env.UPLOAD_DIR),
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
  await database.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await app.listen({ port: env.PORT, host: '0.0.0.0' })
