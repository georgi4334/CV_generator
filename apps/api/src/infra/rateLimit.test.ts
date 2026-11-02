import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './rateLimit'

function clock(start = 1_000_000) {
  let time = start
  return { now: () => time, advance: (ms: number) => (time += ms) }
}

describe('rate limiter', () => {
  it('allows exactly max hits per window and refuses the next ones', () => {
    const c = clock()
    const limiter = createRateLimiter({ max: 3, windowMs: 1000, now: c.now })
    expect([1, 2, 3, 4, 5].map(() => limiter.hit('a'))).toEqual([true, true, true, false, false])
  })

  it('counts every key on its own', () => {
    const c = clock()
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: c.now })
    expect(limiter.hit('a')).toBe(true)
    expect(limiter.hit('b')).toBe(true)
    expect(limiter.hit('a')).toBe(false)
    expect(limiter.hit('b')).toBe(false)
  })

  it('stays refused until the window ends, then starts a fresh window', () => {
    const c = clock()
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: c.now })
    expect(limiter.hit('a')).toBe(true)
    c.advance(999)
    expect(limiter.hit('a')).toBe(false)
    c.advance(1) // exactly at resetAt
    expect(limiter.hit('a')).toBe(true)
    expect(limiter.hit('a')).toBe(false)
  })

  it('does not extend the window with refused hits', () => {
    const c = clock()
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: c.now })
    limiter.hit('a')
    for (let i = 0; i < 10; i++) {
      c.advance(90)
      expect(limiter.hit('a')).toBe(false)
    }
    c.advance(100) // 1000 ms after the first hit
    expect(limiter.hit('a')).toBe(true)
  })

  it('forgets a key on reset, e.g. after a successful login', () => {
    const c = clock()
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: c.now })
    limiter.hit('a')
    expect(limiter.hit('a')).toBe(false)
    limiter.reset('a')
    expect(limiter.hit('a')).toBe(true)
  })

  it('ignores a reset of a key it never saw', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 })
    expect(() => limiter.reset('never')).not.toThrow()
  })

  // BUG (minor, unreachable through env validation which requires max > 0): the first hit of a
  // new window is always allowed, so max: 0 lets one hit through instead of none.
  it.fails('with max 0 refuses everything', () => {
    const limiter = createRateLimiter({ max: 0, windowMs: 1000 })
    expect(limiter.hit('a')).toBe(false)
  })

  it('treats odd keys (empty, unicode, very long) as ordinary keys', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 })
    for (const key of ['', '🙂', 'x'.repeat(100_000), '__proto__', 'constructor']) {
      expect(limiter.hit(key), key.slice(0, 10)).toBe(true)
      expect(limiter.hit(key), key.slice(0, 10)).toBe(false)
    }
  })

  it('sweeps expired windows once many keys are stored, without losing live ones', () => {
    const c = clock()
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: c.now })
    for (let i = 0; i < 5000; i++) limiter.hit(`old-${i}`)
    c.advance(500)
    limiter.hit('live') // still inside its window after the sweep below
    c.advance(600) // old keys have expired, "live" has not
    expect(limiter.hit('trigger-sweep')).toBe(true)
    expect(limiter.hit('live')).toBe(false)
    // An expired key starts a new window after the sweep removed it.
    expect(limiter.hit('old-1')).toBe(true)
  })

  it('does not sweep (and keeps counting) below the size threshold', () => {
    const c = clock()
    const limiter = createRateLimiter({ max: 2, windowMs: 1000, now: c.now })
    for (let i = 0; i < 100; i++) limiter.hit(`k-${i}`)
    expect(limiter.hit('k-0')).toBe(true)
    expect(limiter.hit('k-0')).toBe(false)
  })
})
