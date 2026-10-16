import { z } from 'zod'

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.enum(['up', 'down']),
  timestamp: z.iso.datetime(),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>
