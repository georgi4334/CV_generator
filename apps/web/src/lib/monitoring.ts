type SentryModule = typeof import('@sentry/react')

let sentry: Promise<SentryModule> | null = null

/**
 * Starts browser error reporting when VITE_SENTRY_DSN is set. Sentry is
 * downloaded only then, so it costs nothing otherwise.
 */
export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  sentry = import('@sentry/react').then((Sentry) => {
    Sentry.init({ dsn, environment: import.meta.env.MODE, tracesSampleRate: 0 })
    return Sentry
  })
}

/** Reports an error that the app caught itself (e.g. a page that failed to render). */
export function reportError(error: unknown) {
  void sentry?.then((Sentry) => Sentry.captureException(error))
}
