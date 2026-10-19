import { expect, test, type Page } from '@playwright/test'

/*
 * What the automatic tests cannot check: the real services. Set
 *   SMOKE_URL        the deployed web app, e.g. https://vitae.pages.dev
 *   SMOKE_EMAIL      an account made for this (sign up once by hand and confirm the email)
 *   SMOKE_PASSWORD   its password
 * and optionally SMOKE_AI=1 to call the real AI (uses 1 of the 30 daily requests).
 */
const { SMOKE_URL, SMOKE_EMAIL, SMOKE_PASSWORD, SMOKE_AI } = process.env

// A 1×1 PNG: enough for the upload and download through photo storage.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeAll(() => {
  if (!SMOKE_URL) throw new Error('Set SMOKE_URL to the address of the deployed web app.')
})

async function signIn(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('cv-verify-dismissed', '1'))
  await page.goto('/login')
  await page.getByLabel('Email').fill(SMOKE_EMAIL!)
  await page.getByLabel('Password').fill(SMOKE_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 60_000 })
}

test('the site and its API are up, with security headers', async ({ page, request }) => {
  // The first request may wake a sleeping free API: allow it a minute.
  const ping = await request.get('/api/ping', { timeout: 60_000 })
  expect(ping.status()).toBe(200)
  expect(await ping.json()).toEqual({ ok: true })

  const health = await request.get('/api/health', { timeout: 60_000 })
  expect(health.status(), 'the database should answer').toBe(200)

  // Private data needs a session, and the API only answers through the web app's proxy.
  expect((await request.get('/api/cvs')).status()).toBe(401)

  const response = await page.goto('/login')
  expect(response!.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
})

test.describe('with a real account', () => {
  test.skip(!SMOKE_EMAIL || !SMOKE_PASSWORD, 'Set SMOKE_EMAIL and SMOKE_PASSWORD')

  test('create a CV, edit it, add a photo, and see it all again after a reload', async ({
    page,
  }) => {
    await signIn(page)
    const title = `Smoke test ${new Date().toISOString()}`
    await page.goto('/cvs/new?profession=designer&template=creative')
    await page.getByRole('textbox', { name: 'CV name' }).fill(title)
    await page.getByRole('button', { name: 'Create CV' }).click()
    await page.waitForURL(/\/cvs\/([^/]+)\/edit$/)
    const id = page.url().split('/')[4]!

    try {
      // Database: an edit autosaves and survives a reload.
      const name = page.getByRole('textbox', { name: 'Your Name' })
      await name.click()
      await page.keyboard.press('ControlOrMeta+a')
      await page.keyboard.type('Smoke Tester')
      await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 20_000 })
      await page.reload()
      await expect(page.getByRole('document', { name: 'CV' })).toContainText('Smoke Tester')

      // Photo storage: upload, reload, and the picture loads.
      await page.getByRole('button', { name: 'Design & Font' }).click()
      const chooser = page.waitForEvent('filechooser')
      await page.getByRole('button', { name: 'Upload photo' }).click()
      await (await chooser).setFiles({ name: 'smoke.png', mimeType: 'image/png', buffer: PNG })
      await page.getByRole('button', { name: 'Change photo' }).first().waitFor({ timeout: 30_000 })
      await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 20_000 })
      await page.reload()
      const photo = page.getByRole('document', { name: 'CV' }).locator('img').first()
      await expect(photo).toBeVisible()
      expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

      // A share link opens signed out.
      await page.getByRole('button', { name: 'Share link' }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('switch', { name: 'Share a read-only link' }).click()
      const link = await dialog.getByRole('textbox').inputValue()
      const visitor = await page.context().browser()!.newPage()
      await visitor.goto(link)
      await expect(visitor.getByRole('document', { name: 'CV' })).toContainText('Smoke Tester')
      await visitor.close()
    } finally {
      // Leave nothing behind (this also removes the uploaded photo's record with the CV).
      await page.request.delete(`/api/cvs/${id}`)
    }
  })

  test('the real AI answers', async ({ page }) => {
    test.skip(!SMOKE_AI, 'Set SMOKE_AI=1 to call the real AI (uses one daily request)')
    await signIn(page)
    await page.goto('/cvs/new?profession=designer&template=creative')
    await page.getByRole('textbox', { name: 'CV name' }).fill('Smoke test AI')
    await page.getByRole('button', { name: 'Create CV' }).click()
    await page.waitForURL(/\/cvs\/([^/]+)\/edit$/)
    const id = page.url().split('/')[4]!
    try {
      const summary = page
        .getByRole('document', { name: 'CV' })
        .getByText(/^Product designer focused/)
      await summary.click()
      await page.keyboard.press('ControlOrMeta+End')
      await page.keyboard.type(' I worked with teh team and recieved good feedback.')
      await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 20_000 })
      await page.getByRole('button', { name: 'Fix Mistakes' }).click()
      const fix = page.getByRole('complementary', { name: 'Fix Mistakes' })
      await fix.getByRole('button', { name: 'Check spelling & grammar' }).click()
      // Real answers vary: wait for suggestions, and make sure no error is shown.
      await expect(fix.getByRole('listitem').first()).toBeVisible({ timeout: 60_000 })
      await expect(fix.getByRole('alert')).toHaveCount(0)
    } finally {
      await page.request.delete(`/api/cvs/${id}`)
    }
  })

  test('the password-reset email is accepted for sending (check the inbox yourself)', async ({
    page,
  }) => {
    await page.goto('/forgot-password')
    await page.getByLabel('Email').fill(SMOKE_EMAIL!)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText(/a reset link is on its way/)).toBeVisible({ timeout: 60_000 })
    console.log(`A reset email was requested for ${SMOKE_EMAIL}: it should arrive within a minute.`)
  })
})
