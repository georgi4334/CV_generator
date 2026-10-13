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

const app = await buildApp({
  corsOrigin: env.CORS_ORIGIN,
  database,
  storage: createLocalStorage(env.UPLOAD_DIR),
  ensureMigrated,
  exposeErrors: env.NODE_ENV !== 'production',
  logger: true,
})

const shutdown = async () => {
  await app.close()
  await database.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await app.listen({ port: env.PORT, host: '0.0.0.0' })
