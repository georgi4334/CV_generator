import { expect, PASSWORD, test } from '../fixtures'
import { verifyReminder } from '../pages/AuthPages'

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

test('sign up by hand, confirm the email, and the reminder goes away', async ({
  page,
  registerPage,
  dashboard,
  verifyEmailPage,
  mailbox,
  allowConsoleErrors,
}) => {
  // Using the link a second time is refused with a 400.
  allowConsoleErrors(/status of 400/)
  const email = `confirm-${stamp()}@example.com`
  await registerPage.open()
  await registerPage.register({ email, password: PASSWORD, name: 'Maria Ivanova' })

  // Signed in at once, with a reminder to confirm the address.
  await expect(dashboard.heading('Dashboard')).toBeVisible()
  await expect(verifyReminder(page)).toBeVisible()

  const link = await mailbox.confirmationLink(email)
  await verifyEmailPage.openLink(link)
  await expect(verifyEmailPage.confirmedMessage()).toBeVisible()
  await verifyEmailPage.goToApp()
  await expect(dashboard.heading('Dashboard')).toBeVisible()
  await expect(verifyReminder(page)).toHaveCount(0)

  // The same link cannot be used twice.
  await verifyEmailPage.openLink(link)
  await expect(verifyEmailPage.confirmedMessage()).toHaveCount(0)
})

test('"Send it again" sends a second confirmation email', async ({
  page,
  registerPage,
  mailbox,
}) => {
  const email = `resend-${stamp()}@example.com`
  await registerPage.open()
  await registerPage.register({ email, password: PASSWORD })
  await expect(verifyReminder(page)).toBeVisible()
  await mailbox.confirmationLink(email)

  await page.getByRole('button', { name: 'Send it again' }).click()
  await expect(page.getByText('A new link is on its way.')).toBeVisible()
  await expect.poll(async () => (await mailbox.sent(email)).length).toBe(2)
})

test('a forgotten password is reset from the emailed link', async ({
  api,
  loginPage,
  forgotPasswordPage,
  resetPasswordPage,
  mailbox,
  allowConsoleErrors,
}) => {
  // A reset link works once: the second try is refused with a 400.
  allowConsoleErrors(/status of 400/)
  const email = `forgot-${stamp()}@example.com`
  await api.register(email, PASSWORD)

  await forgotPasswordPage.open()
  await forgotPasswordPage.requestLink(email)
  await expect(forgotPasswordPage.sentMessage()).toBeVisible()

  const link = await mailbox.resetLink(email)
  await resetPasswordPage.openLink(link)
  await resetPasswordPage.changePassword('a brand new password')
  await expect(resetPasswordPage.doneMessage()).toBeVisible()

  // The old password no longer works; the new one does.
  await loginPage.open()
  await loginPage.signIn(email, PASSWORD)
  await expect(loginPage.errorMessage()).toHaveText('Wrong email or password')
  await loginPage.passwordField().fill('a brand new password')
  await loginPage.page.getByRole('button', { name: 'Sign in' }).click()
  await loginPage.expectSignedIn()

  // A reset link works once.
  await resetPasswordPage.openLink(link)
  await resetPasswordPage.changePassword('yet another password')
  await expect(resetPasswordPage.errorMessage()).toBeVisible()
})

test('asking for a reset for an unknown address reveals nothing and sends nothing', async ({
  page,
  forgotPasswordPage,
  mailbox,
}) => {
  const email = `nobody-${stamp()}@example.com`
  await forgotPasswordPage.open()
  await forgotPasswordPage.requestLink(email)
  await expect(forgotPasswordPage.sentMessage()).toBeVisible()
  await page.waitForTimeout(500)
  expect(await mailbox.sent(email)).toEqual([])
})

test('deleting the account removes it and its data', async ({ page, registerPage, dashboard }) => {
  const email = `delete-${stamp()}@example.com`
  await registerPage.open()
  await registerPage.register({ email, password: PASSWORD })
  await expect(dashboard.heading('Dashboard')).toBeVisible()

  await page.goto('/account')
  await dashboard.account.deleteAccount(PASSWORD)
  await dashboard.expectUrl(/\/(welcome|login|register)/)

  const again = await page.request.post('/api/auth/login', { data: { email, password: PASSWORD } })
  expect(again.status()).toBe(401)
})
