import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

/*
 * End-to-end tests: the production builds of the API and the web app, a real
 * Postgres database (recreated for every run) and the mock AI provider.
 * Ports differ from `pnpm dev`, so both can run at the same time.
 */
const API_PORT = 3101
const WEB_PORT = 4173
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://cv:cv@localhost:5433/cv_generator_e2e'

export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 950 },
        // Use a preinstalled Chromium when the environment provides one.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: [
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
  ],
})
