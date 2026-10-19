import { expect, test } from '../fixtures'

test('public pages are accessible and protected by security headers', async ({
  page,
  loginPage,
}) => {
  const response = await page.goto('/login')
  const csp = response!.headers()['content-security-policy']
  expect(csp).toContain("script-src 'self' 'sha256-")
  expect(csp).toContain("frame-ancestors 'none'")
  await loginPage.expectAccessible()
  for (const path of ['/welcome', '/register', '/forgot-password', '/privacy', '/terms']) {
    await loginPage.open(path)
    await loginPage.expectAccessible()
  }
})

test('app pages are accessible', async ({ page, cvEditor, dashboard }) => {
  const editorUrl = page.url()
  await cvEditor.expectAccessible()

  // The date picker (From / To with month and year grids) and the zoom bar.
  await cvEditor.dateButtons().first().click()
  await expect(page.getByRole('tab', { name: /From/ })).toHaveAttribute('aria-selected', 'true')
  await cvEditor.expectAccessible()
  await page.keyboard.press('Escape')
  const zoom = cvEditor.zoomControls()
  await zoom.getByRole('button', { name: 'Zoom out' }).click()
  await expect(zoom).toContainText('90%')
  await zoom.getByRole('button', { name: 'Fit to screen' }).click()
  for (const path of ['/', '/documents/all', '/jobs', '/cvs/new', '/resignations/new']) {
    await dashboard.open(path)
    await dashboard.expectAccessible()
  }

  // The account drawer: its menu and both views (old /account links open account settings).
  await page.goto('/account')
  await expect(dashboard.account.dialog('Account settings')).toBeVisible()
  await dashboard.expectAccessible()
  await dashboard.account.back()
  await dashboard.expectAccessible()
  await dashboard.account.setTheme('Dark')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await dashboard.expectAccessible()

  // In dark mode the editor is dark, but the CV stays white paper.
  await page.goto(editorUrl)
  await expect(cvEditor.firstPage()).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await cvEditor.expectAccessible()
})

test('a missing document shows "not found" instead of a blank screen', async ({
  page,
  account,
  dashboard,
  allowConsoleErrors,
}) => {
  void account
  // The browser logs the expected 404 of the API.
  allowConsoleErrors(/status of 404/)
  await page.goto('/cvs/00000000-0000-4000-8000-000000000000/edit')
  await expect(dashboard.heading('Page not found')).toBeVisible()
  await dashboard.expectAccessible()
  // A broken link always has a way home.
  await page.getByRole('link', { name: 'Go to dashboard' }).click()
  await expect(dashboard.heading('Dashboard')).toBeVisible()
})
