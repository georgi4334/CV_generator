import { defineConfig, devices } from '@playwright/test'
import { WEB_URL, webServer } from './stack'

/*
 * A short check of the LIVE site (not part of `pnpm e2e`): `pnpm smoke`, with SMOKE_URL set to the
 * address of the deployed web app. It uses the real API, database, photo storage and, if you ask,
 * the real AI, so run it by hand after a deploy. See docs/DEPLOY.md.
 *
 * `SMOKE_LOCAL=1 pnpm smoke` runs the same tests against the local stack (see ./stack.ts) with a
 * fresh account, so the smoke code itself is checked in CI without any live service.
 */
const local = Boolean(process.env.SMOKE_LOCAL)
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {}

export default defineConfig({
  testDir: 'smoke',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 90_000,
  use: {
    baseURL: local ? WEB_URL : process.env.SMOKE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /phone\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 950 }, launchOptions },
    },
    { name: 'phone', testMatch: /phone\.spec\.ts/, use: { ...devices['Pixel 7'], launchOptions } },
  ],
  webServer: local ? webServer : undefined,
})
