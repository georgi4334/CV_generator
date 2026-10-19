import { test, expect } from './fixtures'

test.describe('signed out', () => {
  test.use({ storageState: undefined })

  test('a wrong password is refused, the right one signs in, and the cookie is safe', async ({
    context,
    loginPage,
    smoke,
  }) => {
    test.skip(!smoke.email, 'Set SMOKE_EMAIL and SMOKE_PASSWORD')
    await loginPage.open()
    await loginPage.signIn(smoke.email!, `${smoke.password}-wrong`)
    await expect(loginPage.errorMessage()).toBeVisible({ timeout: 60_000 })

    await loginPage.signIn(smoke.email!, smoke.password!)
    await expect(loginPage.heading('Dashboard')).toBeVisible()

    const session = (await context.cookies()).find((c) => c.httpOnly)
    expect(session, 'a session cookie JavaScript cannot read').toBeDefined()
    expect(session!.sameSite).toBe('Lax')
    if (smoke.url.startsWith('https://')) expect(session!.secure).toBe(true)
  })

  test('asking for a password reset is accepted (check the inbox yourself)', async ({
    forgotPasswordPage,
    smoke,
  }) => {
    test.skip(!smoke.email, 'Set SMOKE_EMAIL and SMOKE_PASSWORD')
    await forgotPasswordPage.open()
    await forgotPasswordPage.requestLink(smoke.email!)
    await expect(forgotPasswordPage.sentMessage()).toBeVisible({ timeout: 60_000 })
    console.log(`A reset email was requested for ${smoke.email}: it should arrive within a minute.`)
  })
})

test.describe('signed in', () => {
  test.skip(({ smoke }) => !smoke.email, 'Set SMOKE_EMAIL and SMOKE_PASSWORD')

  // Signing out ends the session on the server, so this test signs in on its own: the session
  // the other tests share must stay valid.
  test('the session survives a reload and signing out ends it', async ({
    page,
    dashboard,
    loginPage,
    smoke,
  }) => {
    await page.context().clearCookies()
    await loginPage.open()
    await loginPage.signIn(smoke.email!, smoke.password!)
    await expect(dashboard.heading('Dashboard')).toBeVisible({ timeout: 60_000 })
    await page.reload()
    await expect(dashboard.heading('Dashboard')).toBeVisible()
    await dashboard.account.open()
    await dashboard.account.signOut()
    await expect(loginPage.heading()).toBeVisible()
    expect((await page.request.get('/api/cvs')).status()).toBe(401)
  })

  test('the language and theme choices are kept', async ({ page, dashboard }) => {
    await dashboard.open()
    await dashboard.selectLanguage('de')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await dashboard.selectLanguage('en')
    await dashboard.account.open()
    await dashboard.account.setTheme('Dark')
    await dashboard.account.close()
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await dashboard.account.open()
    await dashboard.account.setTheme('System')
  })
})
