import { PROFESSIONS } from '@cv/shared'
import type { FastifyInstance } from 'fastify'

export async function professionRoutes(app: FastifyInstance) {
  app.get('/professions', async () => Object.values(PROFESSIONS))
}
