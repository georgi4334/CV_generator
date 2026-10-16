import { describe, expect, it } from 'vitest'
import {
  ChangePasswordInputSchema,
  LoginInputSchema,
  normalizeEmail,
  RegisterInputSchema,
  ResetPasswordInputSchema,
} from './auth'

const valid = { email: 'Maria@Example.com ', password: 'correct horse battery' }

describe('auth schemas', () => {
  it('stores emails trimmed and in lower case', () => {
    expect(RegisterInputSchema.parse(valid).email).toBe('maria@example.com')
    expect(normalizeEmail('  A@B.CO ')).toBe('a@b.co')
    expect(LoginInputSchema.parse({ email: 'MARIA@EXAMPLE.COM', password: 'x' }).email).toBe(
      'maria@example.com',
    )
  })

  it('rejects things that are not emails', () => {
    for (const email of ['', 'maria', 'maria@', '@example.com', 'maria@localhost', 'a b@c.de']) {
      expect(RegisterInputSchema.safeParse({ ...valid, email }).success, email).toBe(false)
    }
  })

  it('requires 8 to 128 characters and refuses common passwords', () => {
    const register = (password: string) => RegisterInputSchema.safeParse({ ...valid, password })
    expect(register('short').success).toBe(false)
    expect(register('a'.repeat(129)).success).toBe(false)
    expect(register('a'.repeat(128)).success).toBe(true)
    expect(register('Password123').success).toBe(false)
    expect(register('12345678').success).toBe(false)
    expect(register('my own long phrase').success).toBe(true)
  })

  it('does not apply the new-password rules when logging in', () => {
    expect(LoginInputSchema.safeParse({ email: 'maria@example.com', password: 'x' }).success).toBe(
      true,
    )
    expect(LoginInputSchema.safeParse({ email: 'maria@example.com', password: '' }).success).toBe(
      false,
    )
  })

  it('applies them when choosing a password by reset or change', () => {
    const token = 't'.repeat(43)
    expect(ResetPasswordInputSchema.safeParse({ token, password: 'password' }).success).toBe(false)
    expect(
      ResetPasswordInputSchema.safeParse({ token: 'short', password: 'fine password' }).success,
    ).toBe(false)
    expect(
      ChangePasswordInputSchema.safeParse({ currentPassword: 'old', newPassword: 'fine password' })
        .success,
    ).toBe(true)
    expect(
      ChangePasswordInputSchema.safeParse({ currentPassword: 'old', newPassword: 'qwerty123' })
        .success,
    ).toBe(false)
  })

  it('trims the name and defaults it to empty', () => {
    expect(RegisterInputSchema.parse(valid).name).toBe('')
    expect(RegisterInputSchema.parse({ ...valid, name: '  Maria  ' }).name).toBe('Maria')
    expect(RegisterInputSchema.safeParse({ ...valid, name: 'x'.repeat(101) }).success).toBe(false)
  })
})
