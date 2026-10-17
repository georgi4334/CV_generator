import type { HealthResponse } from '@cv/shared'
import type { FastifyInstance } from 'fastify'

export async function healthRoutes(
  app: FastifyInstance,
  opts: { isDbHealthy: () => Promise<boolean>; emailDelivers: boolean },
) {
  app.get('/health', async (): Promise<HealthResponse> => {
    const dbUp = await opts.isDbHealthy()
    return {
      status: 'ok',
      database: dbUp ? 'up' : 'down',
      email: opts.emailDelivers ? 'service' : 'log',
      timestamp: new Date().toISOString(),
    }
  })
}
