import { test, expect } from './fixtures'

/*
 * Is the site up, and is it set up the way the deploy guide says? Nobody is signed in here.
 * The first request may wake a sleeping free API, so the first call has a long timeout.
 */
test.use({ storageState: undefined })

test.describe('the API', () => {
  test('answers, and its database and email service are up', async ({ request, smoke }) => {
    const ping = await request.get('/api/ping', { timeout: 60_000 })
    expect(ping.status()).toBe(200)
    expect(await ping.json()).toEqual({ ok: true })

    const health = await request.get('/api/health')
    expect(health.status(), 'the database should answer').toBe(200)
    const body = await health.json()
    expect(body.database).toBe('up')
    // "service" = emails are really sent (Brevo/SMTP); "log" would only print them.
    if (!smoke.local) expect(body.email, 'EMAIL_PROVIDER should send real emails').toBe('service')
  })

  test('keeps private data private and answers unknown routes in JSON', async ({ request }) => {
    for (const path of ['/api/cvs', '/api/cover-letters', '/api/resignations', '/api/jobs']) {
      expect((await request.get(path)).status(), path).toBe(401)
    }
    const unknown = await request.get('/api/does-not-exist')
    expect(unknown.status()).toBe(404)
    expect(unknown.headers()['content-type']).toContain('application/json')
  })

  test('refuses requests that skip the web app (needs SMOKE_API_URL)', async ({
    request,
    smoke,
  }) => {
    test.skip(!smoke.apiOrigin, 'Set SMOKE_API_URL to the API address (e.g. the Render URL)')
    // The API only trusts the Pages proxy, which adds a secret header.
    const ping = await request.get(`${smoke.apiOrigin}/api/ping`, { timeout: 60_000 })
    expect(ping.status()).toBe(200)
    expect((await request.get(`${smoke.apiOrigin}/api/cvs`)).status()).toBe(403)
  })

  test('answers quickly once awake', async ({ request }) => {
    await request.get('/api/ping', { timeout: 60_000 })
    const started = Date.now()
    await request.get('/api/ping')
    expect(Date.now() - started, 'a warm /api/ping (ms)').toBeLessThan(2_000)
  })
})

test.describe('the web app', () => {
  for (const path of [
    '/login',
    '/register',
    '/forgot-password',
    '/privacy',
    '/terms',
    '/welcome',
  ]) {
    test(`${path} loads without errors`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response!.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    })
  }

  test('sends signed-out visitors from a private page to sign in and back', async ({
    page,
    loginPage,
  }) => {
    await page.goto('/documents/all')
    await expect(page).toHaveURL(/\/login\?next=/)
    await expect(loginPage.heading()).toBeVisible()
  })

  test('shows a friendly page for unknown addresses and share links', async ({
    page,
    allowConsoleErrors,
  }) => {
    await page.goto('/no/such/page')
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    // The browser logs the API's 404 for the unknown link; the page explains it.
    allowConsoleErrors(/status of 404/)
    await page.goto('/s/not-a-real-link')
    await expect(page.getByRole('heading', { name: 'This link does not work' })).toBeVisible()
  })

  test('sends the security headers (Cloudflare Pages only)', async ({ page, smoke }) => {
    test.skip(
      smoke.local,
      'The headers come from Cloudflare Pages (_headers), not the preview server',
    )
    const response = (await page.goto('/login'))!
    const headers = response.headers()
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(headers['content-security-policy']).toContain("object-src 'none'")
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    if (smoke.url.startsWith('https://')) {
      expect(headers['strict-transport-security']).toContain('max-age=')
    }

    // Hashed files may be cached forever.
    const asset = await page.evaluate(
      () => document.querySelector<HTMLScriptElement>('script[src^="/assets/"]')?.src ?? '',
    )
    expect(asset, 'a hashed script').not.toBe('')
    const file = await page.request.get(asset)
    expect(file.headers()['cache-control']).toContain('immutable')
  })
})
