/* eslint-disable no-empty-pattern -- Playwright reads a fixture's dependencies from its first argument */
import { randomUUID } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LoginPage } from '../pages/AuthPages'
import { expect, PASSWORD, test as base } from '../fixtures/base'
import { WEB_URL } from '../stack'

/** What the smoke run was told about the site it checks. */
export interface SmokeEnv {
  /** Running against the local stack (`SMOKE_LOCAL=1`) instead of a deployed site. */
  local: boolean
  /** The web app's address. */
  url: string
  /** The API's own address, when it should be checked directly (Render, without the proxy). */
  apiOrigin?: string
  /** The account to sign in with. Local runs make a fresh one. */
  email?: string
  password?: string
  /** Call the real AI (uses the daily free quota). */
  ai: boolean
}

const local = Boolean(process.env.SMOKE_LOCAL)
const env: SmokeEnv = {
  local,
  url: local ? WEB_URL : (process.env.SMOKE_URL ?? ''),
  apiOrigin: process.env.SMOKE_API_URL,
  email: local ? `smoke-${randomUUID()}@example.com` : process.env.SMOKE_EMAIL,
  password: local ? PASSWORD : process.env.SMOKE_PASSWORD,
  // The local AI is the mock: always on there.
  ai: local || Boolean(process.env.SMOKE_AI),
}

interface Fixtures {
  /** Documents made by a test, deleted afterwards: `cleanup.push('/api/cvs/<id>')`. */
  cleanup: string[]
}

interface WorkerFixtures {
  smoke: SmokeEnv
  /** A browser session signed in once for the whole run (as a storage state file). */
  session: string
  accountReady: void
}

/**
 * The `test` of the live smoke suite: the page objects and helpers of the e2e suite, plus the
 * environment (`smoke`), a signed-in session shared by the run, and cleanup of what a test made.
 * Tests that must start signed out use `test.use({ storageState: undefined })`.
 */
export const test = base.extend<Fixtures, WorkerFixtures>({
  smoke: [async ({}, use) => use(env), { scope: 'worker' }],

  // A local run makes its account first, whichever test runs first (tests that start signed out
  // do not use `session`). A worker that restarts after a failure finds it already made.
  accountReady: [
    async ({ playwright, smoke }, use) => {
      if (smoke.local) {
        const request = await playwright.request.newContext({ baseURL: smoke.url })
        const res = await request.post('/api/auth/register', {
          data: { email: smoke.email, password: smoke.password, name: 'Smoke Tester' },
        })
        expect([201, 409], await res.text()).toContain(res.status())
        await request.dispose()
      }
      await use()
    },
    { scope: 'worker', auto: true },
  ],

  session: [
    async ({ browser, smoke, accountReady }, use) => {
      void accountReady
      if (!smoke.url) throw new Error('Set SMOKE_URL to the address of the deployed web app.')
      const context = await browser.newContext({ baseURL: smoke.url })
      const page = await context.newPage()
      if (smoke.email && smoke.password) {
        // The first request may wake a sleeping free API: allow it a minute.
        const login = new LoginPage(page)
        await login.open()
        await login.signIn(smoke.email, smoke.password)
        await expect(login.heading('Dashboard')).toBeVisible({ timeout: 60_000 })
      }
      const file = join(mkdtempSync(join(tmpdir(), 'cv-smoke-')), 'session.json')
      await context.storageState({ path: file })
      await context.close()
      await use(file)
    },
    { scope: 'worker', timeout: 120_000 },
  ],

  // Every test starts signed in; sign-in tests opt out.
  storageState: async ({ session, smoke }, use) => use(smoke.email ? session : undefined),

  context: async ({ context }, use) => {
    // The "confirm your email" toast would cover buttons in the corner.
    await context.addInitScript(() => sessionStorage.setItem('cv-verify-dismissed', '1'))
    await use(context)
  },

  cleanup: async ({ api }, use) => {
    const paths: string[] = []
    await use(paths)
    for (const path of paths.reverse()) await api.delete(path)
  },
})

export { expect, PASSWORD }
