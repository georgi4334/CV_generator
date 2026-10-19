import { describe, expect, it } from 'vitest'
import { createSecretBox } from '../../src/infra/secrets'

describe('secret box', () => {
  const box = createSecretBox('a secret that is long enough for the tests')

  it('round-trips text and never repeats itself', () => {
    const a = box.encrypt('AIza-my-key')
    const b = box.encrypt('AIza-my-key')
    expect(a).not.toBe(b)
    expect(a).not.toContain('AIza-my-key')
    expect(box.decrypt(a)).toBe('AIza-my-key')
    expect(box.decrypt(b)).toBe('AIza-my-key')
  })

  it('returns null for another key, tampered or malformed text', () => {
    const sealed = box.encrypt('AIza-my-key')
    expect(createSecretBox('another secret entirely, also long enough').decrypt(sealed)).toBeNull()
    expect(box.decrypt(`${sealed.slice(0, -2)}AA`)).toBeNull()
    expect(box.decrypt('nonsense')).toBeNull()
    expect(box.decrypt('')).toBeNull()
  })
})
