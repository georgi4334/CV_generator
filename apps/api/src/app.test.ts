import { HealthResponseSchema } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { createLocalStorage } from './lib/storage'

const appWithDb = (healthy: boolean) =>
  buildApp({
    corsOrigin: 'http://localhost:5173',
    database: { db: undefined as never, isHealthy: async () => healthy },
    storage: createLocalStorage('/tmp/unused'),
  })

describe('GET /api/health', () => {
  it.each([
    [true, 'up'],
    [false, 'down'],
  ] as const)('reports database %s as %s', async (healthy, expected) => {
    const app = await appWithDb(healthy)
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(HealthResponseSchema.parse(res.json()).database).toBe(expected)
    await app.close()
  })
})

describe('errors', () => {
  it('answers unknown routes with a JSON 404', async () => {
    const app = await appWithDb(true)
    const res = await app.inject({ method: 'GET', url: '/api/nope' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: { code: 'not_found' } })
    await app.close()
  })
})
