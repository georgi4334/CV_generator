import { expect, PASSWORD, test } from '../fixtures'
import { verifyReminder } from '../pages/AuthPages'

test('sign up, sign out and sign in again', async ({
  page,
  loginPage,
  registerPage,
  jobs,
  dashboard,
}) => {
  const email = `e2e-ui-${Date.now()}@example.com`
  await page.goto('/jobs')
  await loginPage.expectUrl(/\/login\?next=%2Fjobs$/)

  await loginPage.goToRegister()
  await registerPage.register({ email, password: PASSWORD })
  await expect(jobs.heading('Saved Jobs')).toBeVisible()
  await expect(verifyReminder(page)).toBeVisible()
  // The reminder is a toast in the corner that can be closed.
  await jobs.notifications().getByRole('button', { name: 'Close' }).click()
  await expect(verifyReminder(page)).toHaveCount(0)

  const cookie = (await page.context().cookies()).find((c) => c.name === 'cv_session')
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' })

  await jobs.accountButton().click()
  await expect(dashboard.account.dialog()).toContainText(email)
  await dashboard.account.signOut()
  await expect(loginPage.heading('Sign in')).toBeVisible()
  expect((await page.request.get('/api/cvs')).status()).toBe(401)

  await loginPage.signIn(email, 'not the password')
  await expect(loginPage.errorMessage()).toHaveText('Wrong email or password')
  await loginPage.passwordField().fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await loginPage.expectSignedIn()
})

test('legal pages are public and linked from sign-up', async ({ registerPage }) => {
  await registerPage.open()
  await registerPage.openPrivacyPolicy()
  await expect(registerPage.heading('Privacy policy')).toBeVisible()
  await registerPage.openTerms()
  await expect(registerPage.heading('Terms of use')).toBeVisible()
})

test('first-time visitors see the welcome page, with ways to log in or register', async ({
  page,
  welcomePage,
  registerPage,
  loginPage,
}) => {
  await page.goto('/')
  await welcomePage.expectUrl(/\/welcome$/)
  await expect(welcomePage.heading()).toContainText('Build a CV')
  await welcomePage.expectAccessible()

  await welcomePage.goToCreateAccount()
  await expect(registerPage.heading('Create your account')).toBeVisible()
  await welcomePage.open()
  await welcomePage.goToLogin()
  await expect(loginPage.heading('Sign in')).toBeVisible()
})
