import cors from '@fastify/cors'
import Fastify from 'fastify'
import type { Database } from './db/client'
import { registerErrorHandler } from './lib/errors'
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
  logger?: boolean
}

export async function buildApp(opts: AppOptions) {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 2 * 1024 * 1024 })
  registerErrorHandler(app)

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
        useCurrentUser(scope, { database })
        await scope.register(cvRoutes, { database })
        await scope.register(uploadRoutes, { database, storage: opts.storage })
      })
    },
    { prefix: '/api' },
  )

  return app
}
