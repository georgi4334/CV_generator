import { ApiErrorSchema } from '@cv/shared'
import axios, { AxiosError } from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15_000,
})

/**
 * Every failed request becomes an ApiRequestError with a stable `code`:
 * the API's own code (e.g. "conflict", "plan_limit"), or "network_error"
 * when the server could not be reached.
 */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number | null,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }

  /** The server was not reached or failed; trying again later may work. */
  get retryable(): boolean {
    return this.status === null || this.status >= 500
  }
}

export function toApiRequestError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null
    const body = ApiErrorSchema.safeParse(error.response?.data)
    if (body.success) {
      const { code, message, details } = body.data.error
      return new ApiRequestError(status, code, message, details)
    }
    if (status === null) {
      return new ApiRequestError(
        null,
        'network_error',
        'Cannot reach the server. Check your connection.',
      )
    }
    return new ApiRequestError(status, 'http_error', `The server answered with status ${status}`)
  }
  return new ApiRequestError(
    null,
    'unknown_error',
    error instanceof Error ? error.message : String(error),
  )
}

api.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(toApiRequestError(error)),
)

/**
 * Image URLs saved in a CV are relative to the API ("/api/uploads/…"). When
 * the API lives on another origin (production), point them there.
 */
export function assetUrl(url: string | null): string | undefined {
  if (!url) return undefined
  if (!url.startsWith('/api/') || !/^https?:\/\//.test(baseURL)) return url
  return new URL(url, baseURL).toString()
}
