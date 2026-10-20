import { defineConfig, devices } from '@playwright/test'
import { WEB_URL, webServer } from './stack'

/* End-to-end tests against the local stack described in ./stack.ts. */
// Use a preinstalled Chromium when the environment provides one.
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {}

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  workers: Number(process.env.E2E_WORKERS ?? 1),
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
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
        ? /mobile\.spec\.ts|visual\.spec\.ts/
        : /mobile\.spec\.ts|cross-browser\.spec\.ts|visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 950 },
        launchOptions,
      },
    },
    {
      // A phone: the bottom navigation, the compact editor and no sideways scrolling.
      name: 'mobile',
      // (E2E_CROSS_ON_CHROMIUM=1 also tries the Safari journeys here, on a Pixel 7.)
      testMatch: process.env.E2E_CROSS_ON_CHROMIUM
        ? /mobile\.spec\.ts|cross-browser\.spec\.ts/
        : /mobile\.spec\.ts/,
      use: { ...devices['Pixel 7'], launchOptions },
    },
    // Screenshots of the templates. Pixels differ a little between computers, so the pictures
    // are made by CI (see .github/workflows/update-screenshots.yml) and compared there; this
    // project runs in CI, and locally only with E2E_VISUAL=1.
    ...(process.env.CI || process.env.E2E_VISUAL
      ? [
          {
            name: 'visual',
            testMatch: /visual\.spec\.ts/,
            use: {
              ...devices['Desktop Chrome'],
              viewport: { width: 1440, height: 950 },
              launchOptions,
            },
          },
        ]
      : []),
    // Safari's engine, on a desktop and on an iPhone: the main journeys only. These need
    // `playwright install webkit`, so they run in CI and when E2E_WEBKIT=1 is set.
    ...(process.env.CI || process.env.E2E_WEBKIT
      ? [
          {
            name: 'webkit',
            // Safari is slower, especially on a CI machine.
            timeout: 90_000,
            testMatch: /cross-browser\.spec\.ts/,
            use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 950 } },
          },
          {
            name: 'webkit-iphone',
            timeout: 90_000,
            testMatch: /cross-browser\.spec\.ts/,
            use: { ...devices['iPhone 14'] },
          },
        ]
      : []),
  ],
  webServer,
})
