import { HealthResponseSchema } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { buildApp } from './app'

describe('GET /api/health', () => {
  it.each([
    [true, 'up'],
    [false, 'down'],
  ] as const)('reports database %s as %s', async (healthy, expected) => {
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      isDbHealthy: async () => healthy,
    })

    const res = await app.inject({ method: 'GET', url: '/api/health' })

    expect(res.statusCode).toBe(200)
    const body = HealthResponseSchema.parse(res.json())
    expect(body.database).toBe(expected)
    await app.close()
  })
})
