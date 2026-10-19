import { defineConfig, devices } from '@playwright/test'

/*
 * A short check of the LIVE site (not part of `pnpm e2e`): `pnpm smoke`, with SMOKE_URL set to the
 * address of the deployed web app. It uses the real API, database, photo storage and, if you ask,
 * the real AI, so run it by hand after a deploy. See docs/DEPLOY.md.
 */
export default defineConfig({
  testDir: 'smoke',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 90_000,
  use: {
    baseURL: process.env.SMOKE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 950 },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
})
