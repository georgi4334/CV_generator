import { existsSync } from 'node:fs'
import { z } from 'zod'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.url().default('postgres://cv:cv@localhost:5432/cv_generator'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
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
