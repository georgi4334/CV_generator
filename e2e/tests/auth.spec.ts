import { expect, PASSWORD, test } from './fixtures'

test('sign up, sign out and sign in again', async ({ page }) => {
  const email = `e2e-ui-${Date.now()}@example.com`
  await page.goto('/jobs')
  await expect(page).toHaveURL(/\/login\?next=%2Fjobs$/)

  await page.getByRole('link', { name: 'Create one' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Saved Jobs' })).toBeVisible()
  await expect(page.getByText('Please confirm your email address')).toBeVisible()
  // The reminder is a toast in the corner that can be closed.
  const notifications = page.getByRole('region', { name: 'Notifications' })
  await notifications.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByText('Please confirm your email address')).toHaveCount(0)

  const cookie = (await page.context().cookies()).find((c) => c.name === 'cv_session')
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' })

  await page.getByRole('button', { name: /^Account: / }).click()
  await expect(page.getByRole('dialog')).toContainText(email)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  expect((await page.request.get('/api/cvs')).status()).toBe(401)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^Password/).fill('not the password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toHaveText('Wrong email or password')
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('legal pages are public and linked from sign-up', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('link', { name: 'Privacy policy' }).click()
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible()
  await page.getByRole('link', { name: 'Terms' }).click()
  await expect(page.getByRole('heading', { name: 'Terms of use' })).toBeVisible()
})
