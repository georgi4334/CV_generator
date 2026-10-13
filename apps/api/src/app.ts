import cors from '@fastify/cors'
import Fastify from 'fastify'
import { healthRoutes } from './routes/health'

export interface AppOptions {
  corsOrigin: string
  isDbHealthy: () => Promise<boolean>
  logger?: boolean
}

export async function buildApp(opts: AppOptions) {
  const app = Fastify({ logger: opts.logger ?? false })

  await app.register(cors, {
    origin: opts.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  })

  await app.register(
    async (api) => {
      await api.register(healthRoutes, { isDbHealthy: opts.isDbHealthy })
    },
    { prefix: '/api' },
  )

  return app
}
