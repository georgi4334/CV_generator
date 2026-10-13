import { buildApp } from './app'
import { createDb } from './db/client'
import { env } from './env'

const database = createDb(env.DATABASE_URL)
const app = await buildApp({
  corsOrigin: env.CORS_ORIGIN,
  isDbHealthy: database.isHealthy,
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
