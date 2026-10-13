import cors from '@fastify/cors'
import Fastify from 'fastify'
import type { Database } from './db/client'
import { HttpError, registerErrorHandler } from './lib/errors'
import type { Storage } from './lib/storage'
import { useCurrentUser } from './plugins/currentUser'
import { cvRoutes } from './routes/cvs'
import { healthRoutes } from './routes/health'
import { professionRoutes } from './routes/professions'
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
}

export async function buildApp(opts: AppOptions) {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 2 * 1024 * 1024 })
  registerErrorHandler(app, { exposeErrors: opts.exposeErrors ?? false })

  await app.register(cors, {
    origin: opts.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })

  const database = opts.database as Database
  await app.register(
    async (api) => {
      // Public routes
      await api.register(healthRoutes, { isDbHealthy: opts.database.isHealthy })
      await api.register(professionRoutes)
      await api.register(publicUploadRoutes, { database, storage: opts.storage })

      // Routes acting for the current user
      await api.register(async (scope) => {
        const { ensureMigrated } = opts
        if (ensureMigrated) {
          scope.addHook('onRequest', async (request) => {
            try {
              await ensureMigrated()
            } catch (error) {
              request.log.error(error, 'database not ready')
              const cause =
                (error as Error & { cause?: Error }).cause?.message ?? (error as Error).message
              throw new HttpError(
                503,
                'database_unavailable',
                'Cannot use the database. Is it running (pnpm db:up), and does DATABASE_URL in apps/api/.env match docker-compose.yml?',
                opts.exposeErrors ? { cause } : undefined,
              )
            }
          })
        }
        useCurrentUser(scope, { database })
        await scope.register(cvRoutes, { database })
        await scope.register(uploadRoutes, { database, storage: opts.storage })
      })
    },
    { prefix: '/api' },
  )

  return app
}
