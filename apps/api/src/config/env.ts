import { existsSync } from 'node:fs'
import { APP_NAME } from '@cv/shared'
import { z } from 'zod'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.url().default('postgres://cv:cv@localhost:5433/cv_generator'),
  /** Web app origins allowed to call the API (comma separated). */
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  /** Where the web app lives; links in emails point here. */
  APP_URL: z.url().default('http://localhost:5173'),
  /** Defaults to true in production (cookies then need HTTPS). */
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  /** "none" is for a web app and API on different sites; it requires COOKIE_SECURE. */
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  /** Set to true behind a hosting proxy so the client address is read from X-Forwarded-For. */
  /** gemini (needs GEMINI_API_KEY), mock (fake answers for development), off. Default: gemini when a key is set. */
  AI_PROVIDER: z.enum(['gemini', 'mock', 'off']).optional(),
  GEMINI_API_KEY: z.string().default(''),
  /** "gemini-flash-latest" always points at Google's current Flash model. */
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  /** AI requests per minute for the whole API (the provider's free quota is per minute too). */
  AI_MAX_PER_MINUTE: z.coerce.number().int().positive().default(10),
  /** Where uploaded images go: local disk (development) or Cloudflare R2. */
  STORAGE: z.enum(['local', 'r2']).default('local'),
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET: z.string().default(''),
  /** Brevo API key; without it emails are printed in the log. */
  BREVO_API_KEY: z.string().default(''),
  /** Sender of account emails; must be verified in Brevo. */
  MAIL_FROM: z.string().default(''),
  MAIL_FROM_NAME: z.string().default(APP_NAME),
  /** Error reporting (sentry.io); off when empty. */
  SENTRY_DSN: z.string().default(''),
  /** Shared with the web app's proxy; when set, requests must come through it. */
  PROXY_SECRET: z.string().default(''),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  /** Apply pending database migrations when the API starts. */
  MIGRATE_ON_START: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  /** Folder for uploaded images in development. */
  UPLOAD_DIR: z.string().default('uploads'),
  /** Browser tests only: emails are appended to this file (JSON lines) so a test can read the links. */
  E2E_MAIL_FILE: z.string().default(''),
  /** Browser tests only: multiplies the sign-in and sign-up rate limits (1 in real use). */
  AUTH_LIMIT_SCALE: z.coerce.number().int().min(1).max(1000).default(1),
})

export const env = EnvSchema.parse(process.env)
export type Env = typeof env
