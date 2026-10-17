import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type Page } from '@playwright/test'

let counter = 0
export const PASSWORD = 'correct horse battery'

/** A fresh account, signed in through the API (the cookie lands in the browser context). */
export async function signUp(page: Page, name = 'Test User') {
  const email = `e2e-${Date.now()}-${++counter}@example.com`
  const res = await page.request.post('/api/auth/register', {
    data: { email, password: PASSWORD, name },
  })
  expect(res.status(), await res.text()).toBe(201)
  // People can close the "confirm your email" toast; these tests start with it closed so it
  // does not cover buttons in the corner (auth.spec checks the reminder itself).
  await page.addInitScript(() => sessionStorage.setItem('cv-verify-dismissed', '1'))
  return { email }
}

/** Creates a CV from the wizard's example for a profession and opens it in the editor. */
export async function createExampleCv(page: Page, title = 'Designer CV') {
  await page.goto('/cvs/new?profession=designer&template=creative')
  await page.getByRole('textbox', { name: 'CV name' }).fill(title)
  await page.getByRole('button', { name: 'Create CV' }).click()
  await page.waitForURL(/\/cvs\/[^/]+\/edit$/)
  await page.getByRole('document', { name: 'CV' }).waitFor()
  return page.url().split('/')[4]!
}

/** Fails a test when the page logs errors, e.g. a blocked script (CSP) or a crash. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => {
        // A 401 is how the app learns nobody is signed in.
        if (m.type() === 'error' && !/status of 401/.test(m.text())) errors.push(m.text())
      })
      await use(errors)
      expect(errors, 'browser errors').toEqual([])
    },
    { auto: true },
  ],
})

/** Accessibility check: no serious or critical WCAG 2.1 AA violations. */
export async function expectAccessible(page: Page) {
  // Colours are only final once fades and slides have finished.
  // (Endless ones, like the loading shimmer, are skipped; cancelled ones count as done.)
  await page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
        .map((a) => a.finished),
    ),
  )
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => {
      const where = v.nodes
        .slice(0, 3)
        .map(
          (n) =>
            `\n    ${n.html.slice(0, 140)} → ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`,
        )
      return `${v.id}: ${v.help}${where.join('')}`
    })
  expect(serious, `accessibility on ${page.url()}`).toEqual([])
}

export { expect }
