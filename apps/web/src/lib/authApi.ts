import {
  UserSchema,
  type ChangePasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type User,
} from '@cv/shared'
import { z } from 'zod'
import { api, ApiRequestError } from './api'

const UserResponse = z.object({ user: UserSchema })

/** Typed calls to the account endpoints. */
export const authApi = {
  /** The signed-in user, or null when nobody is signed in. */
  async me(): Promise<User | null> {
    try {
      const { data } = await api.get('/auth/me')
      return UserResponse.parse(data).user
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) return null
      throw error
    }
  },
  async register(input: RegisterInput) {
    const { data } = await api.post('/auth/register', input)
    return UserResponse.parse(data).user
  },
  async login(input: LoginInput) {
    const { data } = await api.post('/auth/login', input)
    return UserResponse.parse(data).user
  },
  async logout() {
    await api.post('/auth/logout')
  },
  async forgotPassword(email: string) {
    await api.post('/auth/forgot-password', { email })
  },
  async resetPassword(input: ResetPasswordInput) {
    await api.post('/auth/reset-password', input)
  },
  async verifyEmail(token: string) {
    await api.post('/auth/verify-email', { token })
  },
  async resendVerification() {
    await api.post('/auth/resend-verification')
  },
  async updateProfile(name: string) {
    const { data } = await api.patch('/auth/me', { name })
    return UserResponse.parse(data).user
  },
  async changePassword(input: ChangePasswordInput) {
    await api.post('/auth/change-password', input)
  },
  async deleteAccount(password: string) {
    await api.post('/auth/delete-account', { password })
  },
}

export type AuthApi = typeof authApi
