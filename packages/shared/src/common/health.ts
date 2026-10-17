import { z } from 'zod'

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.enum(['up', 'down']),
  /** "log": emails are only printed in the API log (no email service set up). */
  email: z.enum(['service', 'log']),
  timestamp: z.iso.datetime(),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>
