import type { LoginInput, RegisterInput, ResetPasswordInput, User } from '@cv/shared'
import { ApiRequestError } from '../lib/api'
import type { AuthApi } from '../lib/authApi'

export const TEST_USER: User = {
  id: '00000000-0000-4000-8000-0000000000aa',
  email: 'ann@example.com',
  name: 'Ann',
  plan: 'free',
  emailVerified: true,
  locale: 'en',
  createdAt: '2026-10-14T09:00:00.000Z',
}

/** In-memory stand-in for the account API; signed in as TEST_USER unless told otherwise. */
export function createFakeAuthApi() {
  let user: User | null = TEST_USER
  const calls: string[] = []
  const password = { current: 'correct horse' }
  const wrong = () => new ApiRequestError(401, 'invalid_credentials', 'Wrong email or password')
  const signedIn = () => {
    if (!user) throw new ApiRequestError(401, 'unauthorized', 'Sign in to continue')
    return user
  }

  const api: AuthApi = {
    async me() {
      calls.push('me')
      return user
    },
    async register(input: RegisterInput) {
      calls.push('register')
      if (input.email === 'taken@example.com')
        throw new ApiRequestError(409, 'email_taken', 'An account with this email already exists')
      user = { ...TEST_USER, email: input.email, name: input.name ?? '', emailVerified: false }
      return user
    },
    async login(input: LoginInput) {
      calls.push('login')
      if (input.password !== password.current) throw wrong()
      user = { ...TEST_USER, email: input.email }
      return user
    },
    async logout() {
      calls.push('logout')
      user = null
    },
    async forgotPassword(email: string) {
      calls.push(`forgot:${email}`)
    },
    async resetPassword(input: ResetPasswordInput) {
      calls.push(`reset:${input.token}`)
      if (input.token === 'expired-token-expired-token')
        throw new ApiRequestError(400, 'invalid_token', 'This link is invalid or has expired')
      user = null
    },
    async verifyEmail(token: string) {
      calls.push(`verify:${token}`)
      if (token === 'expired-token-expired-token')
        throw new ApiRequestError(400, 'invalid_token', 'This link is invalid or has expired')
      if (user) user = { ...user, emailVerified: true }
    },
    async resendVerification() {
      calls.push('resend')
      signedIn()
    },
    async setLocale(locale) {
      calls.push(`locale:${locale}`)
      user = { ...signedIn(), locale }
      return user
    },
    async updateProfile(name: string) {
      calls.push('profile')
      user = { ...signedIn(), name }
      return user
    },
    async changePassword(input) {
      calls.push('change-password')
      signedIn()
      if (input.currentPassword !== password.current)
        throw new ApiRequestError(403, 'wrong_password', 'The current password is not correct')
      password.current = input.newPassword
    },
    async deleteAccount(given: string) {
      calls.push('delete-account')
      signedIn()
      if (given !== password.current)
        throw new ApiRequestError(403, 'wrong_password', 'The password is not correct')
      user = null
    },
  }

  return {
    api,
    calls,
    reset(signedInUser: User | null = TEST_USER) {
      user = signedInUser
      calls.length = 0
      password.current = 'correct horse'
    },
  }
}
export type FakeAuthApi = ReturnType<typeof createFakeAuthApi>
