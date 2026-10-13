import { describe, expect, it, vi } from 'vitest'
import { createMigrator } from './migrate'

describe('createMigrator', () => {
  it('runs migrations only once after they succeed', async () => {
    const apply = vi.fn().mockResolvedValue(undefined)
    const ensure = createMigrator(apply)
    await Promise.all([ensure(), ensure()])
    await ensure()
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it('tries again on the next call after a failure', async () => {
    const apply = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue(undefined)
    const ensure = createMigrator(apply)
    await expect(ensure()).rejects.toThrow('ECONNREFUSED')
    await expect(ensure()).resolves.toBeUndefined()
    expect(apply).toHaveBeenCalledTimes(2)
  })
})
