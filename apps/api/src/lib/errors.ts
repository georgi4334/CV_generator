import type { ApiError } from '@cv/shared'
import type { FastifyError, FastifyInstance } from 'fastify'
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

const body = (code: string, message: string, details?: unknown): ApiError => ({
  error: { code, message, ...(details === undefined ? {} : { details }) },
})

export function registerErrorHandler(app: FastifyInstance, opts: { exposeErrors: boolean }) {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.status).send(body(error.code, error.message, error.details))
    }
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send(body('validation_error', 'The request is not valid', error.issues))
    }
    const status = 'statusCode' in error && error.statusCode ? error.statusCode : 500
    if (status < 500) {
      return reply.status(status).send(body('bad_request', error.message))
    }
    request.log.error(error)
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
