import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PlaywrightTestConfig } from '@playwright/test'
import { MAIL_FILE } from './paths'

/*
 * The local stack the tests run against: the production builds of the API and the web app, a
 * real Postgres database (recreated for every run) and the mock AI provider. Ports differ from
 * `pnpm dev`, so both can run at the same time. Shared by the e2e and the smoke configs.
 */
export const API_PORT = 3101
export const WEB_PORT = 4173
export const WEB_URL = `http://localhost:${WEB_PORT}`
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://cv:cv@localhost:5433/cv_generator_e2e'

export const webServer: PlaywrightTestConfig['webServer'] = [
  {
    command:
      'node e2e/scripts/reset-db.mjs && pnpm --filter @cv/api build && pnpm --filter @cv/api start',
    cwd: '..',
    url: `http://localhost:${API_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
      PORT: String(API_PORT),
      DATABASE_URL,
      AI_PROVIDER: 'mock',
      // Emails go to a file the tests read; sign-up and sign-in limits are raised.
      E2E_MAIL_FILE: MAIL_FILE,
      AUTH_LIMIT_SCALE: '100',
      APP_URL: `http://localhost:${WEB_PORT}`,
      CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
      UPLOAD_DIR: mkdtempSync(join(tmpdir(), 'cv-e2e-uploads-')),
    },
  },
  {
    command:
      'pnpm --filter @cv/web build && pnpm --filter @cv/web exec vite preview --port 4173 --strictPort',
    cwd: '..',
    url: `http://localhost:${WEB_PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
  },
]
