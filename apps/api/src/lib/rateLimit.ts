export interface RateLimiter {
  /** Counts one attempt; false once `key` has used up its attempts for the window. */
  hit: (key: string) => boolean
  /** Forgets `key`, e.g. after a successful login. */
  reset: (key: string) => void
}

interface Options {
  max: number
  windowMs: number
  /** For tests. */
  now?: () => number
}

/**
 * A fixed-window limiter in memory. It protects one API instance, which is
 * what the free hosting plans give us; with several instances, move it to
 * the database or a cache.
 */
export function createRateLimiter({ max, windowMs, now = Date.now }: Options): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>()

  const sweep = (time: number) => {
    // Cheap clean-up so the map cannot grow forever.
    if (windows.size < 5000) return
    for (const [key, w] of windows) if (w.resetAt <= time) windows.delete(key)
  }

  return {
    hit(key) {
      const time = now()
      sweep(time)
      const current = windows.get(key)
      if (!current || current.resetAt <= time) {
        windows.set(key, { count: 1, resetAt: time + windowMs })
        return true
      }
      current.count += 1
      return current.count <= max
    },
    reset(key) {
      windows.delete(key)
    },
  }
}
