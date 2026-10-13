import { buildApp } from './app'
import { createDb } from './db/client'
import { runMigrations } from './db/migrate'
import { env } from './env'
import { createLocalStorage } from './lib/storage'

const database = createDb(env.DATABASE_URL)

if (env.MIGRATE_ON_START) {
  try {
    await runMigrations(database)
  } catch (error) {
    // Start anyway so /api/health can report the database as down.
    console.error('Database migrations failed; is the database running?', error)
  }
}

const app = await buildApp({
  corsOrigin: env.CORS_ORIGIN,
  database,
  storage: createLocalStorage(env.UPLOAD_DIR),
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
