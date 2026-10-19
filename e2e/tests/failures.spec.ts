import type { Page, Route } from '@playwright/test'
import { createExampleCv, expect, expectErrors, signUp, test } from './fixtures'

const summaryOf = (page: Page) =>
  page.getByRole('document', { name: 'CV' }).getByText(/^Product designer focused/)

/** Types at the end of the CV's summary. */
async function typeInSummary(page: Page, text: string) {
  await summaryOf(page).click()
  await page.keyboard.press('End')
  await page.keyboard.type(text)
}

const saved = (page: Page) =>
  expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 })

const apiError = (route: Route, status: number, code: string, message: string) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code, message } }),
  })

test('the same CV open in two tabs: the second tab can load the other version or keep its own', async ({
  page,
  context,
}) => {
  await signUp(page)
  await createExampleCv(page, 'Two tabs')
  const tabB = await context.newPage()
  await tabB.addInitScript(() => sessionStorage.setItem('cv-verify-dismissed', '1'))
  await tabB.goto(page.url())
  await tabB.getByRole('document', { name: 'CV' }).waitFor()

  // Tab A saves first.
  await typeInSummary(page, ' From tab A.')
  await saved(page)

  // Tab B edits an out-of-date copy: it is told, and nothing is overwritten.
  await typeInSummary(tabB, ' From tab B.')
  await expect(
    tabB.getByText(
      'This CV was changed in another tab or window. Your latest edits are not saved yet.',
    ),
  ).toBeVisible({ timeout: 15_000 })
  await tabB.getByRole('button', { name: 'Load the other version' }).click()
  await expect(summaryOf(tabB)).toContainText('From tab A.')
  await expect(summaryOf(tabB)).not.toContainText('From tab B.')

  // Edit again in B, change it in A, and keep B's version this time.
  await typeInSummary(page, ' A again.')
  await saved(page)
  await typeInSummary(tabB, ' B wins.')
  await expect(tabB.getByRole('button', { name: 'Keep my version' })).toBeVisible({
    timeout: 15_000,
  })
  await tabB.getByRole('button', { name: 'Keep my version' }).click()
  await saved(tabB)
  await page.reload()
  await expect(summaryOf(page)).toContainText('B wins.')
})

test('saving survives a server error and a lost connection, and nothing is lost', async ({
  page,
  context,
  consoleErrors,
}) => {
  await signUp(page)
  await createExampleCv(page, 'Flaky network')

  // The server fails: the editor says so, keeps retrying, and saves when it recovers.
  let failing = true
  await page.route(/\/api\/cvs\/[^/]+$/, (route) =>
    failing && route.request().method() !== 'GET'
      ? apiError(route, 500, 'internal_error', 'Something went wrong on the server.')
      : route.continue(),
  )
  await typeInSummary(page, ' Edit during an outage.')
  await expect(page.getByText(/^Not saved/)).toBeVisible({ timeout: 15_000 })
  failing = false
  await saved(page)

  // The connection drops while typing.
  await context.setOffline(true)
  await typeInSummary(page, ' Edit while offline.')
  await expect(page.getByText(/^Not saved/)).toBeVisible({ timeout: 15_000 })
  await context.setOffline(false)
  await saved(page)

  await page.reload()
  await expect(summaryOf(page)).toContainText('Edit during an outage. Edit while offline.')
  // The browser logs each failed request.
  expectErrors(consoleErrors, /status of 500|ERR_INTERNET_DISCONNECTED|Failed to load resource/)
})

test('when the AI is busy or the daily limit is used up, the panel says so', async ({
  page,
  consoleErrors,
}) => {
  await signUp(page)
  await createExampleCv(page, 'AI limits')
  await page.getByRole('button', { name: 'Fix Mistakes' }).click()
  const fix = page.getByRole('complementary', { name: 'Fix Mistakes' })

  await page.route('**/api/ai/**', (route) =>
    route.request().method() === 'POST'
      ? apiError(route, 429, 'ai_busy', 'The AI is busy right now. Try again in a minute.')
      : route.continue(),
  )
  await fix.getByRole('button', { name: 'Check spelling & grammar' }).click()
  await expect(fix.getByText('The AI is busy right now. Try again in a minute.')).toBeVisible()

  await page.unroute('**/api/ai/**')
  await page.route('**/api/ai/**', (route) =>
    route.request().method() === 'POST'
      ? apiError(route, 429, 'ai_limit', 'You have used all 30 AI requests for today.')
      : route.continue(),
  )
  await fix.getByRole('button', { name: 'Check spelling & grammar' }).click()
  await expect(fix.getByText(/used all your AI requests for today/)).toBeVisible()

  await page.unroute('**/api/ai/**')
  await page.route('**/api/ai/**', (route) =>
    route.request().method() === 'POST'
      ? apiError(route, 503, 'ai_unavailable', 'AI features are not set up on this server.')
      : route.continue(),
  )
  await fix.getByRole('button', { name: 'Check spelling & grammar' }).click()
  await expect(fix.getByText('AI features are not set up on this server.')).toBeVisible()
  expectErrors(consoleErrors, /status of (429|503)/)
})

test('a session that ends while editing sends you to sign in instead of losing work silently', async ({
  page,
  context,
  consoleErrors,
}) => {
  await signUp(page)
  await createExampleCv(page, 'Session ends')
  await context.clearCookies()
  await typeInSummary(page, ' Typed after the session ended.')
  await expect(page).toHaveURL(/\/(login|welcome)/, { timeout: 20_000 })
  expectErrors(consoleErrors, /status of 40[13]/)
})

test('when the server fails while a document opens, the page offers a way out', async ({
  page,
  consoleErrors,
}) => {
  await signUp(page)
  const id = await createExampleCv(page, 'Server down')
  await page.route(new RegExp(`/api/cvs/${id}$`), (route) =>
    route.request().method() === 'GET'
      ? apiError(route, 500, 'internal_error', 'Something went wrong on the server.')
      : route.continue(),
  )
  await page.reload()
  await expect(page.getByRole('document', { name: 'CV' })).toHaveCount(0)
  await expect(page.getByText(/Something went wrong/).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'Go to dashboard' })).toBeVisible()
  expectErrors(consoleErrors, /status of 500/)
})
