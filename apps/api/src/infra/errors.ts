import type { ApiError } from '@cv/shared'
import type { FastifyError, FastifyInstance, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

/** An error with an HTTP status and a stable code the frontend can check. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
  }
}

export const notFound = (what: string) => new HttpError(404, 'not_found', `${what} not found`)

/** Connection-level errors from Node and Postgres (server down, restarting, unreachable). */
const DATABASE_DOWN_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'CONNECT_TIMEOUT',
  'CONNECTION_CLOSED',
  'CONNECTION_ENDED',
  'CONNECTION_DESTROYED',
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '08001', // unable to connect
  '08006', // connection failure
])

/** True when the error (or one of its causes) means the database cannot be reached. */
export function isDatabaseUnavailable(error: unknown): boolean {
  for (let current = error, depth = 0; current && depth < 5; depth++) {
    const code = (current as { code?: unknown }).code
    if (typeof code === 'string' && DATABASE_DOWN_CODES.has(code)) return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

export const databaseUnavailable = (cause?: string) =>
  new HttpError(
    503,
    'database_unavailable',
    'Cannot use the database. Is it running (pnpm db:up), and does DATABASE_URL in apps/api/.env match docker-compose.yml?',
    cause ? { cause } : undefined,
  )

const body = (code: string, message: string, details?: unknown): ApiError => ({
  error: { code, message, ...(details === undefined ? {} : { details }) },
})

export function registerErrorHandler(
  app: FastifyInstance,
  opts: {
    exposeErrors: boolean
    /** Reports unexpected server errors (e.g. to Sentry). */
    onServerError?: (error: Error, request: FastifyRequest) => void
  },
) {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.status).send(body(error.code, error.message, error.details))
    }
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send(body('validation_error', 'The request is not valid', error.issues))
    }
    if (isDatabaseUnavailable(error)) {
      request.log.warn({ err: error }, 'database unavailable')
      const cause = (error as Error & { cause?: Error }).cause?.message ?? error.message
      const unavailable = databaseUnavailable(opts.exposeErrors ? cause : undefined)
      return reply
        .status(unavailable.status)
        .send(body(unavailable.code, unavailable.message, unavailable.details))
    }
    const status = 'statusCode' in error && error.statusCode ? error.statusCode : 500
    if (status < 500) {
      return reply.status(status).send(body('bad_request', error.message))
    }
    request.log.error(error)
    opts.onServerError?.(error, request)
    // In development show the cause, so problems can be diagnosed from the browser too.
    const details = opts.exposeErrors ? { cause: error.message } : undefined
    return reply
      .status(500)
      .send(body('internal_error', 'Something went wrong on the server', details))
  })

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(body('not_found', `Route ${request.method} ${request.url} not found`))
  })
}
