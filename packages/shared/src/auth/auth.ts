import { z } from 'zod'
import { PLANS } from '../api/api'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const NAME_MAX_LENGTH = 100

/** Emails are compared case-insensitively, so they are stored in lower case. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const EmailSchema = z
  .string()
  .trim()
  .max(254, 'Email is too long')
  .pipe(z.email('Enter a valid email address'))
  .transform(normalizeEmail)

/** The passwords attackers try first; rejected when choosing a password. */
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '11111111',
  '00000000',
  '87654321',
  'password',
  'password1',
  'password12',
  'password123',
  'passw0rd',
  'p@ssw0rd',
  'qwertyui',
  'qwerty123',
  'qwertyuiop',
  'abc12345',
  'abcd1234',
  'iloveyou',
  'letmein1',
  'welcome1',
  'admin123',
  'changeme',
  'trustno1',
  'monkey123',
  'dragon12',
  'football',
  'baseball',
  'sunshine',
  'princess',
  'superman',
  'starwars',
  'zaq12wsx',
  'asdfghjk',
  '1q2w3e4r',
  '1qaz2wsx',
])

export const isCommonPassword = (password: string) => COMMON_PASSWORDS.has(password.toLowerCase())

/** A new password: long enough, not absurdly long (hashing cost), not a well-known one. */
export const NewPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`)
  .refine((password) => !isCommonPassword(password), 'That password is too common. Choose another')

/** An existing password is only checked, never judged: the rules may have changed since. */
const ExistingPasswordSchema = z.string().min(1, 'Enter your password').max(PASSWORD_MAX_LENGTH)

const NameSchema = z.string().trim().max(NAME_MAX_LENGTH)

/** Languages of the interface and of account emails. */
export const LOCALES = ['en', 'bg', 'de'] as const
export const LocaleSchema = z.enum(LOCALES)
export type Locale = z.infer<typeof LocaleSchema>

/** What the browser may know about the signed-in user. */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  plan: z.enum(PLANS),
  /** The user opened the link in the verification email (or reset their password with one). */
  emailVerified: z.boolean(),
  /** Interface language; account emails are written in it. */
  locale: LocaleSchema,
  createdAt: z.iso.datetime(),
})
export type User = z.infer<typeof UserSchema>

export const RegisterInputSchema = z.object({
  email: EmailSchema,
  password: NewPasswordSchema,
  name: NameSchema.default(''),
  /** The interface language when signing up; the confirmation email uses it. */
  locale: LocaleSchema.default('en'),
})
export type RegisterInput = z.input<typeof RegisterInputSchema>

export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: ExistingPasswordSchema,
})
export type LoginInput = z.input<typeof LoginInputSchema>

export const ForgotPasswordInputSchema = z.object({
  email: EmailSchema,
  /** Language of the reset email (the interface language at the time). */
  locale: LocaleSchema.optional(),
})
export type ForgotPasswordInput = z.input<typeof ForgotPasswordInputSchema>

/** Links in emails carry a 43-character token; anything else cannot be one. */
const TokenSchema = z.string().min(20).max(200)

export const ResetPasswordInputSchema = z.object({
  token: TokenSchema,
  password: NewPasswordSchema,
})
export type ResetPasswordInput = z.input<typeof ResetPasswordInputSchema>

export const VerifyEmailInputSchema = z.object({ token: TokenSchema })

export const ChangePasswordInputSchema = z.object({
  currentPassword: ExistingPasswordSchema,
  newPassword: NewPasswordSchema,
})
export type ChangePasswordInput = z.input<typeof ChangePasswordInputSchema>

export const UpdateProfileInputSchema = z
  .object({ name: NameSchema.optional(), locale: LocaleSchema.optional() })
  .refine((input) => input.name !== undefined || input.locale !== undefined, 'Nothing to update')
export type UpdateProfileInput = z.input<typeof UpdateProfileInputSchema>

export const DeleteAccountInputSchema = z.object({ password: ExistingPasswordSchema })
export type DeleteAccountInput = z.input<typeof DeleteAccountInputSchema>
