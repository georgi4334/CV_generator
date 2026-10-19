import { expect, expectErrors, linkFromMail, PASSWORD, sentMails, test } from './fixtures'

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

test('sign up by hand, confirm the email, and the reminder goes away', async ({
  page,
  consoleErrors,
}) => {
  const email = `confirm-${stamp()}@example.com`
  await page.goto('/register')
  await page.getByLabel('Name (optional)').fill('Maria Ivanova')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()

  // Signed in at once, with a reminder to confirm the address.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText(/Please confirm your email address/)).toBeVisible()

  const link = await linkFromMail(email, /https?:\/\/\S+\/verify-email\?token=\S+/)
  await page.goto(link)
  await expect(page.getByText('Your email address is confirmed. Thank you!')).toBeVisible()
  await page.getByRole('link', { name: 'Go to the app' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText(/Please confirm your email address/)).toHaveCount(0)

  // The same link cannot be used twice.
  await page.goto(link)
  await expect(page.getByText('Your email address is confirmed. Thank you!')).toHaveCount(0)
  expectErrors(consoleErrors, /status of 400/)
})

test('"Send it again" sends a second confirmation email', async ({ page }) => {
  const email = `resend-${stamp()}@example.com`
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText(/Please confirm your email address/)).toBeVisible()
  await linkFromMail(email, /verify-email\?token=\S+/)

  await page.getByRole('button', { name: 'Send it again' }).click()
  await expect(page.getByText('A new link is on its way.')).toBeVisible()
  await expect.poll(async () => (await sentMails(email)).length).toBe(2)
})

test('a forgotten password is reset from the emailed link', async ({
  page,
  request,
  consoleErrors,
}) => {
  const email = `forgot-${stamp()}@example.com`
  const created = await request.post('/api/auth/register', { data: { email, password: PASSWORD } })
  expect(created.status()).toBe(201)

  await page.goto('/forgot-password')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText(/a reset link is on its way/)).toBeVisible()

  const link = await linkFromMail(email, /https?:\/\/\S+\/reset-password\?token=\S+/)
  await page.goto(link)
  await page.getByLabel('New password').fill('a brand new password')
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Your password was changed. Sign in with the new one.')).toBeVisible()

  // The old password no longer works; the new one does.
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toHaveText('Wrong email or password')
  await page.getByLabel('Password').fill('a brand new password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  // A reset link works once.
  await page.goto(link)
  await page.getByLabel('New password').fill('yet another password')
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expectErrors(consoleErrors, /status of 400/)
})

test('asking for a reset for an unknown address reveals nothing and sends nothing', async ({
  page,
}) => {
  const email = `nobody-${stamp()}@example.com`
  await page.goto('/forgot-password')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText(/a reset link is on its way/)).toBeVisible()
  await page.waitForTimeout(500)
  expect(await sentMails(email)).toEqual([])
})

test('deleting the account removes it and its data', async ({ page, request }) => {
  const email = `delete-${stamp()}@example.com`
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.goto('/account')
  const drawer = page.getByRole('dialog', { name: 'Account settings' })
  await drawer.getByRole('button', { name: 'Delete account…' }).click()
  await drawer.getByLabel('Password').last().fill(PASSWORD)
  await drawer.getByRole('button', { name: 'Delete my account' }).click()
  await expect(page).toHaveURL(/\/(welcome|login|register)/)

  const again = await request.post('/api/auth/login', { data: { email, password: PASSWORD } })
  expect(again.status()).toBe(401)
})
