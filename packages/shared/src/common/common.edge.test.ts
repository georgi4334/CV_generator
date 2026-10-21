import { describe, expect, it } from 'vitest'
import { APP_NAME } from './brand'
import { HealthResponseSchema } from './health'
import { createId } from './id'
import { TEXT_MAX, withinTextLimit } from './textLimit'

describe('createId', () => {
  it('produces a lower-case v4 uuid', () => {
    expect(createId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('does not repeat itself over thousands of calls', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => createId()))
    expect(ids.size).toBe(5000)
  })
})

describe('APP_NAME', () => {
  it('is a non-empty name without surrounding whitespace', () => {
    expect(APP_NAME).toBe(APP_NAME.trim())
    expect(APP_NAME.length).toBeGreaterThan(0)
  })
})

describe('HealthResponseSchema edge cases', () => {
  const ok = { status: 'ok', database: 'up', email: 'log', timestamp: '2026-10-20T10:00:00.000Z' }

  it('accepts both email modes and both database states', () => {
    for (const email of ['service', 'log'])
      for (const database of ['up', 'down'])
        expect(HealthResponseSchema.safeParse({ ...ok, email, database }).success).toBe(true)
  })

  it.each([
    ['a missing email mode', { ...ok, email: undefined }],
    ['an unknown status', { ...ok, status: 'degraded' }],
    ['a date without time', { ...ok, timestamp: '2026-10-20' }],
    ['a numeric timestamp', { ...ok, timestamp: 1_760_000_000_000 }],
    ['a null body field', { ...ok, database: null }],
  ])('rejects %s', (_name, body) => {
    expect(HealthResponseSchema.safeParse(body).success).toBe(false)
  })

  it.each([null, undefined, 'ok', 42, []])('rejects a body that is %j', (body) => {
    expect(HealthResponseSchema.safeParse(body).success).toBe(false)
  })

  it('strips unknown keys instead of passing them on', () => {
    const parsed = HealthResponseSchema.parse({ ...ok, secret: 'db-password' })
    expect(parsed).not.toHaveProperty('secret')
  })
})

describe('withinTextLimit edge cases', () => {
  it('counts UTF-16 code units, so an emoji is two', () => {
    expect(withinTextLimit('😀'.repeat(TEXT_MAX / 2))).toBe(true)
    expect(withinTextLimit('😀'.repeat(TEXT_MAX / 2 + 1))).toBe(false)
  })

  it('accepts an empty string and values that hold no text', () => {
    expect(withinTextLimit('')).toBe(true)
    expect(withinTextLimit(null)).toBe(true)
    expect(withinTextLimit(undefined)).toBe(true)
    expect(withinTextLimit(42)).toBe(true)
    expect(withinTextLimit([])).toBe(true)
    expect(withinTextLimit({})).toBe(true)
  })

  it('finds one long text among thousands of short ones', () => {
    const list = Array.from({ length: 20_000 }, () => 'ok')
    expect(withinTextLimit(list)).toBe(true)
    expect(withinTextLimit([...list, 'x'.repeat(TEXT_MAX + 1)])).toBe(false)
  })

  it('looks at a long text hidden deep inside nested arrays', () => {
    let value: unknown = 'x'.repeat(TEXT_MAX + 1)
    for (let i = 0; i < 200; i++) value = [{ next: value }]
    expect(withinTextLimit(value)).toBe(false)
  })

  it('honours a custom max of 0', () => {
    expect(withinTextLimit('', 0)).toBe(true)
    expect(withinTextLimit('a', 0)).toBe(false)
  })

  it('looks at object keys that are values, not at the key names themselves', () => {
    expect(withinTextLimit({ ['k'.repeat(TEXT_MAX + 1)]: 'short' })).toBe(true)
  })
})
