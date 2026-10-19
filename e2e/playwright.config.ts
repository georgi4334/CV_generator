import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { MAIL_FILE } from './paths'

/*
 * End-to-end tests: the production builds of the API and the web app, a real
 * Postgres database (recreated for every run) and the mock AI provider.
 * Ports differ from `pnpm dev`, so both can run at the same time.
 */
const API_PORT = 3101
const WEB_PORT = 4173
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://cv:cv@localhost:5433/cv_generator_e2e'

// Use a preinstalled Chromium when the environment provides one.
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {}

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
  // Screenshots of the CV templates: the same file name on every machine.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  projects: [
    {
      name: 'chromium',
      // The Safari journeys can be tried in Chromium too (E2E_CROSS_ON_CHROMIUM=1), to debug them.
      testIgnore: process.env.E2E_CROSS_ON_CHROMIUM
        ? /mobile\.spec\.ts/
        : /mobile\.spec\.ts|cross-browser\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 950 },
        launchOptions,
      },
    },
    {
      // A phone: the bottom navigation, the compact editor and no sideways scrolling.
      name: 'mobile',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['Pixel 7'], launchOptions },
    },
    // Safari's engine, on a desktop and on an iPhone: the main journeys only. These need
    // `playwright install webkit`, so they run in CI and when E2E_WEBKIT=1 is set.
    ...(process.env.CI || process.env.E2E_WEBKIT
      ? [
          {
            name: 'webkit',
            testMatch: /cross-browser\.spec\.ts/,
            use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 950 } },
          },
          {
            name: 'webkit-iphone',
            testMatch: /cross-browser\.spec\.ts/,
            use: { ...devices['iPhone 14'] },
          },
        ]
      : []),
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
  ],
})
