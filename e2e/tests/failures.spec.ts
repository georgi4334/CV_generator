import type { Route } from '@playwright/test'
import { expect, test } from '../fixtures'

const apiError = (route: Route, status: number, code: string, message: string) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code, message } }),
  })

test.use({ cvTitle: 'Failure paths' })

test('the same CV open in two tabs: the second tab can load the other version or keep its own', async ({
  context,
  cvEditor,
}) => {
  const tabB = await cvEditor.inAnotherTab(await context.newPage())

  // Tab A saves first.
  await cvEditor.typeInSummary(' From tab A.')
  await cvEditor.expectSaved()

  // Tab B edits an out-of-date copy: it is told, and nothing is overwritten.
  await tabB.typeInSummary(' From tab B.')
  await expect(tabB.conflictMessage()).toBeVisible({ timeout: 15_000 })
  await tabB.loadOtherVersion()
  await expect(tabB.summary()).toContainText('From tab A.')
  await expect(tabB.summary()).not.toContainText('From tab B.')

  // Edit again in B, change it in A, and keep B's version this time.
  await cvEditor.typeInSummary(' A again.')
  await cvEditor.expectSaved()
  await tabB.typeInSummary(' B wins.')
  await expect(tabB.keepMyVersionButton()).toBeVisible({ timeout: 15_000 })
  await tabB.keepMyVersion()
  await tabB.expectSaved()
  await cvEditor.reload()
  await expect(cvEditor.summary()).toContainText('B wins.')
})

test('saving survives a server error and a lost connection, and nothing is lost', async ({
  page,
  context,
  cvEditor,
  allowConsoleErrors,
}) => {
  // The browser logs each failed request.
  allowConsoleErrors(/status of 500|ERR_INTERNET_DISCONNECTED|Failed to load resource/)

  // The server fails: the editor says so, keeps retrying, and saves when it recovers.
  let failing = true
  await page.route(/\/api\/cvs\/[^/]+$/, (route) =>
    failing && route.request().method() !== 'GET'
      ? apiError(route, 500, 'internal_error', 'Something went wrong on the server.')
      : route.continue(),
  )
  await cvEditor.typeInSummary(' Edit during an outage.')
  await cvEditor.expectNotSaved()
  failing = false
  await cvEditor.expectSaved()

  // The connection drops while typing.
  await context.setOffline(true)
  await cvEditor.typeInSummary(' Edit while offline.')
  await cvEditor.expectNotSaved()
  await context.setOffline(false)
  await cvEditor.expectSaved()

  await cvEditor.reload()
  await expect(cvEditor.summary()).toContainText('Edit during an outage. Edit while offline.')
})

test('when the AI is busy or the daily limit is used up, the panel says so', async ({
  page,
  cvEditor,
  allowConsoleErrors,
}) => {
  allowConsoleErrors(/status of (429|503)/)
  const fix = await cvEditor.openFixMistakes()

  const answerWith = async (status: number, code: string, message: string) => {
    await page.unroute('**/api/ai/**')
    await page.route('**/api/ai/**', (route) =>
      route.request().method() === 'POST'
        ? apiError(route, status, code, message)
        : route.continue(),
    )
  }

  await answerWith(429, 'ai_busy', 'The AI is busy right now. Try again in a minute.')
  await fix.check()
  await expect(
    fix.panel().getByText('The AI is busy right now. Try again in a minute.'),
  ).toBeVisible()

  await answerWith(429, 'ai_limit', 'You have used all 30 AI requests for today.')
  await fix.check()
  await expect(fix.panel().getByText(/used all your AI requests for today/)).toBeVisible()

  await answerWith(503, 'ai_unavailable', 'AI features are not set up on this server.')
  await fix.check()
  await expect(fix.panel().getByText('AI features are not set up on this server.')).toBeVisible()
})

test('a session that ends while editing sends you to sign in', async ({
  context,
  cvEditor,
  loginPage,
  allowConsoleErrors,
}) => {
  allowConsoleErrors(/status of 40[13]/)
  await context.clearCookies()
  await cvEditor.typeInSummary(' Typed after the session ended.')
  await loginPage.expectUrl(/\/(login|welcome)/)
})

test('when the server fails while a document opens, the page explains and "Try again" recovers', async ({
  page,
  cvEditor,
  allowConsoleErrors,
}) => {
  allowConsoleErrors(/status of 500/)
  const url = new RegExp(`/api/cvs/${cvEditor.id}$`)
  await page.route(url, (route) =>
    route.request().method() === 'GET'
      ? apiError(route, 500, 'internal_error', 'Something went wrong on the server.')
      : route.continue(),
  )
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Could not open this document' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText('Something went wrong on the server.')).toBeVisible()
  await expect(cvEditor.document()).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Back to documents' })).toHaveAttribute(
    'href',
    '/documents',
  )

  // The server is back: "Try again" opens the document.
  await page.unroute(url)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(cvEditor.document()).toContainText('Maria Ivanova')
})
