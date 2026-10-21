import { describe, expect, it } from 'vitest'
import {
  ChangePasswordInputSchema,
  DeleteAccountInputSchema,
  EmailSchema,
  ForgotPasswordInputSchema,
  LOCALES,
  LocaleSchema,
  LoginInputSchema,
  NAME_MAX_LENGTH,
  NewPasswordSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RegisterInputSchema,
  ResetPasswordInputSchema,
  UpdateProfileInputSchema,
  UserSchema,
  VerifyEmailInputSchema,
  isCommonPassword,
  normalizeEmail,
} from './auth'

const goodPassword = 'a fine long passphrase'
const register = (overrides: Record<string, unknown>) =>
  RegisterInputSchema.safeParse({ email: 'a@example.com', password: goodPassword, ...overrides })

describe('EmailSchema', () => {
  it.each([
    ['simple', 'a@example.com'],
    ['plus tag', 'first.last+tag@sub.example.co.uk'],
    ['digits and dashes', 'x-1@my-host.io'],
    ['surrounding whitespace', '  a@example.com \n'],
  ])('accepts %s', (_label, email) => {
    expect(EmailSchema.safeParse(email).success).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['only whitespace', '   '],
    ['no at sign', 'example.com'],
    ['two at signs', 'a@b@example.com'],
    ['no domain', 'a@'],
    ['no local part', '@example.com'],
    ['space inside', 'a b@example.com'],
    ['no top level domain', 'a@localhost'],
    ['trailing dot', 'a@example.com.'],
    ['double dot', 'a@example..com'],
    ['comma', 'a@example.com,b@example.com'],
    ['angle brackets', 'Name <a@example.com>'],
    ['NUL character', 'a\u0000@example.com'],
    ['newline injection', 'a@example.com\nBcc: evil@example.com'],
    [
      'a 255 character address',
      `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.com`,
    ],
  ])('rejects %s', (_label, email) => {
    expect(EmailSchema.safeParse(email).success).toBe(false)
  })

  it('refuses anything longer than 254 characters before looking at its shape', () => {
    const result = EmailSchema.safeParse(`${'a'.repeat(250)}@example.com`)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Email is too long')
  })

  it('accepts an address of exactly 254 characters when its parts are legal', () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`
    expect(email.length).toBe(254)
    expect(EmailSchema.safeParse(email).success).toBe(true)
  })

  it.each([null, undefined, 42, {}, [], ['a@example.com'], true])(
    'rejects the non-string %j',
    (email) => {
      expect(EmailSchema.safeParse(email).success).toBe(false)
    },
  )

  it('lower-cases the whole address, also non-ASCII letters', () => {
    expect(EmailSchema.parse('USER@EXAMPLE.COM')).toBe('user@example.com')
    expect(normalizeEmail('MÜLLER@Beispiel.DE')).toBe('müller@beispiel.de')
  })

  it('normalizeEmail is idempotent', () => {
    const once = normalizeEmail('  MiXeD@Case.COM ')
    expect(normalizeEmail(once)).toBe(once)
  })
})

describe('NewPasswordSchema', () => {
  it('accepts exactly the minimum and the maximum length', () => {
    expect(NewPasswordSchema.safeParse('x7Yq!k2p'.slice(0, PASSWORD_MIN_LENGTH)).success).toBe(true)
    expect(NewPasswordSchema.safeParse('x'.repeat(PASSWORD_MAX_LENGTH)).success).toBe(true)
  })

  it('rejects one under the minimum and one over the maximum', () => {
    expect(NewPasswordSchema.safeParse('x'.repeat(PASSWORD_MIN_LENGTH - 1)).success).toBe(false)
    expect(NewPasswordSchema.safeParse('x'.repeat(PASSWORD_MAX_LENGTH + 1)).success).toBe(false)
    expect(NewPasswordSchema.safeParse('').success).toBe(false)
  })

  it('does not choke on a megabyte-long password', () => {
    expect(NewPasswordSchema.safeParse('x'.repeat(1_000_000)).success).toBe(false)
  })

  it('counts characters, not UTF-16 units: 128 emoji is at the limit, 129 is over', () => {
    expect(NewPasswordSchema.safeParse('🔑'.repeat(128)).success).toBe(true)
    expect(NewPasswordSchema.safeParse('🔑'.repeat(129)).success).toBe(false)
  })

  it('accepts unicode, RTL and NUL characters (it only checks length and the common list)', () => {
    for (const password of [
      'пароль-пароль',
      'كلمة المرور الطويلة',
      'pass\u0000word1',
      'zero​width​pw',
    ])
      expect(NewPasswordSchema.safeParse(password).success, password).toBe(true)
  })

  it('accepts eight spaces (it does not trim passwords)', () => {
    expect(NewPasswordSchema.safeParse(' '.repeat(8)).success).toBe(true)
  })

  it('does not trim: a common password with a trailing space is accepted', () => {
    expect(NewPasswordSchema.safeParse('password ').success).toBe(true)
  })

  it.each(['PASSWORD', 'Password123', 'QWERTY123', 'Iloveyou', 'P@ssw0rd', '1Q2W3E4R'])(
    'refuses the common password %s in any case',
    (password) => {
      const result = NewPasswordSchema.safeParse(password)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('too common')
    },
  )

  it('reports the length message, not the common one, for a short common password', () => {
    expect(NewPasswordSchema.safeParse('pass').error?.issues[0]?.message).toContain('at least 8')
  })

  it.each([null, undefined, 12345678, ['password'], {}])(
    'rejects the non-string %j',
    (password) => {
      expect(NewPasswordSchema.safeParse(password).success).toBe(false)
    },
  )

  it('isCommonPassword is case-insensitive and exact', () => {
    expect(isCommonPassword('LetMeIn1')).toBe(true)
    expect(isCommonPassword('letmein12')).toBe(false)
    expect(isCommonPassword('')).toBe(false)
  })
})

describe('RegisterInputSchema', () => {
  it('defaults the locale to English and the name to empty', () => {
    expect(register({}).data).toMatchObject({ locale: 'en', name: '' })
  })

  it.each(LOCALES)('accepts the locale %s', (locale) => {
    expect(register({ locale }).data?.locale).toBe(locale)
  })

  it.each(['fr', 'EN', '', null, 'en-US'])('rejects the locale %j', (locale) => {
    expect(register({ locale }).success).toBe(false)
  })

  it('accepts a name of exactly 100 characters and rejects 101', () => {
    expect(register({ name: 'n'.repeat(NAME_MAX_LENGTH) }).success).toBe(true)
    expect(register({ name: 'n'.repeat(NAME_MAX_LENGTH + 1) }).success).toBe(false)
  })

  it('trims the name before measuring it', () => {
    const padded = ` ${'n'.repeat(NAME_MAX_LENGTH)} `
    expect(register({ name: padded }).data?.name).toBe('n'.repeat(NAME_MAX_LENGTH))
  })

  it('turns a whitespace-only name into an empty one', () => {
    expect(register({ name: ' \t\n ' }).data?.name).toBe('')
  })

  it('counts characters, not UTF-16 units: 100 emoji pass, 101 do not', () => {
    expect(register({ name: '😀'.repeat(100) }).success).toBe(true)
    expect(register({ name: '😀'.repeat(101) }).success).toBe(false)
  })

  it.each(['Zoë Çelik', 'محمد', '李小龍', "O'Brien <script>", 'a\u0000b'])(
    'keeps the name %j as typed',
    (name) => {
      expect(register({ name }).data?.name).toBe(name)
    },
  )

  it.each([null, 5, [], {}])('rejects the name %j', (name) => {
    expect(register({ name }).success).toBe(false)
  })

  it('ignores unknown keys such as a self-assigned plan or role', () => {
    const data = register({ plan: 'pro', role: 'admin', emailVerified: true }).data
    expect(data).not.toHaveProperty('plan')
    expect(data).not.toHaveProperty('role')
    expect(data).not.toHaveProperty('emailVerified')
  })

  it.each([null, undefined, 'x', 5, []])('rejects a body that is %j', (body) => {
    expect(RegisterInputSchema.safeParse(body).success).toBe(false)
  })

  it('requires email and password', () => {
    expect(RegisterInputSchema.safeParse({ password: goodPassword }).success).toBe(false)
    expect(RegisterInputSchema.safeParse({ email: 'a@example.com' }).success).toBe(false)
  })
})

describe('LoginInputSchema', () => {
  it('accepts a one-character password and exactly 128 characters, not 129', () => {
    expect(LoginInputSchema.safeParse({ email: 'a@example.com', password: 'x' }).success).toBe(true)
    expect(
      LoginInputSchema.safeParse({ email: 'a@example.com', password: 'x'.repeat(128) }).success,
    ).toBe(true)
    expect(
      LoginInputSchema.safeParse({ email: 'a@example.com', password: 'x'.repeat(129) }).success,
    ).toBe(false)
  })

  it('accepts a common password (the rules may have been stricter later than the account)', () => {
    expect(
      LoginInputSchema.safeParse({ email: 'a@example.com', password: 'password' }).success,
    ).toBe(true)
  })

  it.each([null, undefined, 123, {}, ['x']])('rejects the password %j', (password) => {
    expect(LoginInputSchema.safeParse({ email: 'a@example.com', password }).success).toBe(false)
  })

  it('does not trim the password', () => {
    expect(LoginInputSchema.parse({ email: 'a@example.com', password: ' x ' }).password).toBe(' x ')
  })
})

describe('ForgotPasswordInputSchema', () => {
  it('makes the locale optional but validated', () => {
    expect(ForgotPasswordInputSchema.safeParse({ email: 'a@example.com' }).success).toBe(true)
    expect(
      ForgotPasswordInputSchema.safeParse({ email: 'a@example.com', locale: 'de' }).success,
    ).toBe(true)
    expect(
      ForgotPasswordInputSchema.safeParse({ email: 'a@example.com', locale: 'xx' }).success,
    ).toBe(false)
  })

  it('normalises the email', () => {
    expect(ForgotPasswordInputSchema.parse({ email: ' A@Example.COM ' }).email).toBe(
      'a@example.com',
    )
  })
})

describe('tokens', () => {
  it.each([19, 0])('rejects a reset token of %i characters', (length) => {
    expect(
      ResetPasswordInputSchema.safeParse({ token: 't'.repeat(length), password: goodPassword })
        .success,
    ).toBe(false)
  })

  it.each([20, 43, 200])('accepts a reset token of %i characters', (length) => {
    expect(
      ResetPasswordInputSchema.safeParse({ token: 't'.repeat(length), password: goodPassword })
        .success,
    ).toBe(true)
  })

  it('rejects a reset token of 201 characters', () => {
    expect(
      ResetPasswordInputSchema.safeParse({ token: 't'.repeat(201), password: goodPassword })
        .success,
    ).toBe(false)
  })

  it.each([19, 201])('rejects a verification token of %i characters', (length) => {
    expect(VerifyEmailInputSchema.safeParse({ token: 't'.repeat(length) }).success).toBe(false)
  })

  it('accepts a verification token at both limits', () => {
    expect(VerifyEmailInputSchema.safeParse({ token: 't'.repeat(20) }).success).toBe(true)
    expect(VerifyEmailInputSchema.safeParse({ token: 't'.repeat(200) }).success).toBe(true)
  })

  it.each([null, undefined, 12345, ['t'.repeat(30)]])(
    'rejects the non-string token %j',
    (token) => {
      expect(VerifyEmailInputSchema.safeParse({ token }).success).toBe(false)
    },
  )

  it('does not apply the password rules to a reset when the new password is common', () => {
    expect(
      ResetPasswordInputSchema.safeParse({ token: 't'.repeat(43), password: 'iloveyou' }).success,
    ).toBe(false)
  })
})

describe('ChangePasswordInputSchema', () => {
  it('accepts a short current password but not an empty one', () => {
    expect(
      ChangePasswordInputSchema.safeParse({ currentPassword: 'x', newPassword: goodPassword })
        .success,
    ).toBe(true)
    expect(
      ChangePasswordInputSchema.safeParse({ currentPassword: '', newPassword: goodPassword })
        .success,
    ).toBe(false)
  })

  it('allows the new password to equal the current one (the API decides)', () => {
    expect(
      ChangePasswordInputSchema.safeParse({
        currentPassword: goodPassword,
        newPassword: goodPassword,
      }).success,
    ).toBe(true)
  })

  it('requires both fields', () => {
    expect(ChangePasswordInputSchema.safeParse({ newPassword: goodPassword }).success).toBe(false)
    expect(ChangePasswordInputSchema.safeParse({ currentPassword: 'x' }).success).toBe(false)
  })
})

describe('UpdateProfileInputSchema', () => {
  it.each([{}, { name: undefined }, { locale: undefined }, { other: 1 }])(
    'refuses %j: nothing to update',
    (input) => {
      expect(UpdateProfileInputSchema.safeParse(input).success).toBe(false)
    },
  )

  it('accepts clearing the name with an empty string', () => {
    expect(UpdateProfileInputSchema.safeParse({ name: '' }).success).toBe(true)
    expect(UpdateProfileInputSchema.safeParse({ name: '   ' }).data).toEqual({ name: '' })
  })

  it('accepts either field or both', () => {
    expect(UpdateProfileInputSchema.safeParse({ locale: 'bg' }).success).toBe(true)
    expect(UpdateProfileInputSchema.safeParse({ name: 'A', locale: 'de' }).success).toBe(true)
  })

  it('does not default anything, so an update never overwrites what was not sent', () => {
    expect(UpdateProfileInputSchema.parse({ name: 'A' })).toEqual({ name: 'A' })
  })

  it('refuses a name over 100 characters and a null name', () => {
    expect(UpdateProfileInputSchema.safeParse({ name: 'n'.repeat(101) }).success).toBe(false)
    expect(UpdateProfileInputSchema.safeParse({ name: null }).success).toBe(false)
  })

  it('refuses a null body', () => {
    expect(UpdateProfileInputSchema.safeParse(null).success).toBe(false)
  })
})

describe('DeleteAccountInputSchema', () => {
  it('needs a non-empty password of at most 128 characters', () => {
    expect(DeleteAccountInputSchema.safeParse({ password: 'x' }).success).toBe(true)
    expect(DeleteAccountInputSchema.safeParse({ password: '' }).success).toBe(false)
    expect(DeleteAccountInputSchema.safeParse({ password: 'x'.repeat(129) }).success).toBe(false)
    expect(DeleteAccountInputSchema.safeParse({}).success).toBe(false)
  })
})

describe('UserSchema and LocaleSchema', () => {
  const user = {
    id: 'u1',
    email: 'a@example.com',
    name: '',
    plan: 'free',
    emailVerified: false,
    locale: 'en',
    createdAt: '2026-10-20T10:00:00.000Z',
  }

  it('accepts a user and strips fields that must never reach the browser', () => {
    const parsed = UserSchema.parse({ ...user, passwordHash: '$argon2id$...', role: 'admin' })
    expect(parsed).not.toHaveProperty('passwordHash')
    expect(parsed).not.toHaveProperty('role')
  })

  it.each([
    ['an unknown plan', { plan: 'enterprise' }],
    ['an unknown locale', { locale: 'fr' }],
    ['a date without time', { createdAt: '2026-10-20' }],
    ['a non-boolean emailVerified', { emailVerified: 'false' }],
    ['a missing id', { id: undefined }],
  ])('rejects %s', (_label, change) => {
    expect(UserSchema.safeParse({ ...user, ...change }).success).toBe(false)
  })

  it('knows exactly three locales', () => {
    expect([...LOCALES]).toEqual(['en', 'bg', 'de'])
    expect(LocaleSchema.safeParse('bg').success).toBe(true)
  })
})
