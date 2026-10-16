import { existsSync } from 'node:fs'
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
})

export const env = EnvSchema.parse(process.env)
export type Env = typeof env
