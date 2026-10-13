import type { HealthResponse } from '@cv/shared'
import type { FastifyInstance } from 'fastify'

export async function healthRoutes(
  app: FastifyInstance,
  opts: { isDbHealthy: () => Promise<boolean> },
) {
  app.get('/health', async (): Promise<HealthResponse> => {
    const dbUp = await opts.isDbHealthy()
    return {
      status: 'ok',
      database: dbUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    }
  })
}
