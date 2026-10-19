import { DEV_SECRETS_KEY, type Env } from './env'

/**
 * What a production deployment must have. Checked when the API starts, so a
 * missing setting fails the deploy loudly instead of losing data quietly
 * (Render's disk is wiped on every deploy, so local uploads would vanish).
 */
export function productionProblems(env: Env): string[] {
  if (env.NODE_ENV !== 'production') return []
  const problems: string[] = []
  const missing = (names: (keyof Env)[]) => names.filter((name) => !env[name])

  if (env.STORAGE !== 'r2') problems.push('STORAGE must be r2 (the server disk is not kept)')
  else {
    const r2 = missing(['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'])
    if (r2.length) problems.push(`R2 storage needs ${r2.join(', ')}`)
  }
  if (env.E2E_MAIL_FILE) problems.push('E2E_MAIL_FILE is for browser tests only')
  if (env.AUTH_LIMIT_SCALE > 1) problems.push('AUTH_LIMIT_SCALE is for browser tests only')
  const mail = missing(['BREVO_API_KEY', 'MAIL_FROM'])
  if (mail.length) problems.push(`Emails need ${mail.join(', ')}`)
  if (env.APP_URL.startsWith('http://localhost'))
    problems.push('APP_URL must be the public web address')
  if (env.CORS_ORIGIN.includes('localhost'))
    problems.push('CORS_ORIGIN must be the public web address')
  if (env.PROXY_SECRET.length > 0 && env.PROXY_SECRET.length < 32) {
    problems.push('PROXY_SECRET must be at least 32 characters')
  }
  if (env.SECRETS_KEY === DEV_SECRETS_KEY || env.SECRETS_KEY.length < 32) {
    problems.push('SECRETS_KEY must be a random value of at least 32 characters')
  }
  return problems
}

/** Settings that are optional but worth knowing about. */
export function productionWarnings(env: Env): string[] {
  if (env.NODE_ENV !== 'production') return []
  const warnings: string[] = []
  if (!env.PROXY_SECRET)
    warnings.push('PROXY_SECRET is not set: the API accepts requests that skip the web app proxy')
  if (!env.SENTRY_DSN) warnings.push('SENTRY_DSN is not set: server errors are only in the log')
  if (!env.GEMINI_API_KEY)
    warnings.push('GEMINI_API_KEY is not set: AI works only for people who add their own key')
  return warnings
}
