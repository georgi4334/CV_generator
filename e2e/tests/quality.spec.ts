import { createExampleCv, expect, expectAccessible, signUp, test } from './fixtures'

test('public pages are accessible and protected by security headers', async ({ page }) => {
  const response = await page.goto('/login')
  const csp = response!.headers()['content-security-policy']
  expect(csp).toContain("script-src 'self' 'sha256-")
  expect(csp).toContain("frame-ancestors 'none'")
  await expectAccessible(page)
  for (const path of ['/register', '/forgot-password', '/privacy', '/terms']) {
    await page.goto(path)
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    await expectAccessible(page)
  }
})

test('app pages are accessible', async ({ page }) => {
  await signUp(page)
  await createExampleCv(page)
  const editor = page.url()
  await expectAccessible(page)
  for (const path of ['/', '/documents/all', '/jobs', '/cvs/new']) {
    await page.goto(path)
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    await expectAccessible(page)
  }

  // The account drawer: its menu and both views (old /account links open account settings).
  await page.goto('/account')
  await expect(page.getByRole('dialog', { name: 'Account settings' })).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Back' }).click()
  await expectAccessible(page)
  await page.getByRole('button', { name: /^Theme/ }).click()
  await page.getByText('Dark', { exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expectAccessible(page)

  // In dark mode the editor is dark, but the CV stays white paper.
  await page.goto(editor)
  const paper = page.locator('[data-cv-page]').first()
  await expect(paper).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expectAccessible(page)
})

test('a missing document shows "not found" instead of a blank screen', async ({
  page,
  consoleErrors,
}) => {
  await signUp(page)
  await page.goto('/cvs/00000000-0000-4000-8000-000000000000/edit')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await expectAccessible(page)
  // A broken link always has a way home.
  await page.getByRole('link', { name: 'Go to dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  // The browser logs the expected 404 of the API.
  consoleErrors.splice(
    0,
    consoleErrors.length,
    ...consoleErrors.filter((e) => !/status of 404/.test(e)),
  )
})
