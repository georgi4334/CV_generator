import type { Page } from '@playwright/test'
import { createExampleCv, expect, expectAccessible, signUp, test } from './fixtures'

/** The page is no wider than the phone: nothing sticks out and scrolls sideways. */
async function expectNoSideScroll(page: Page) {
  const { scroll, viewport } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(scroll, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(viewport)
}

test('app pages fit a phone screen and use the bottom navigation', async ({ page }) => {
  await signUp(page)
  for (const path of ['/', '/documents/all', '/jobs', '/cvs/new']) {
    await page.goto(path)
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    await expectNoSideScroll(page)
    await expectAccessible(page)
  }

  // The account drawer fits the phone, opens its views and closes again.
  await page.getByRole('button', { name: /^Account:/ }).click()
  await page.getByRole('button', { name: /^Account settings/ }).click()
  await expect(page.getByRole('dialog', { name: 'Account settings' })).toBeVisible()
  await expectNoSideScroll(page)
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // One main navigation, at the bottom of the screen.
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav).toHaveCount(1)
  await nav.getByRole('link', { name: 'Saved Jobs' }).click()
  await expect(page).toHaveURL(/\/jobs$/)
})

test('the editor uses a bottom toolbar and opens tools as a sheet', async ({ page }) => {
  await signUp(page)
  await createExampleCv(page)
  await expectNoSideScroll(page)

  const tools = page.getByRole('navigation', { name: 'Editor tools' })
  await tools.getByRole('button', { name: 'Design & Font' }).click()
  const sheet = page.getByRole('complementary', { name: 'Design & Font' })
  await expect(sheet).toBeVisible()
  await expectNoSideScroll(page)
  await expectAccessible(page)

  await sheet.getByRole('button', { name: /^Close/ }).click()
  await expect(sheet).toHaveCount(0)

  await page.getByRole('button', { name: 'More' }).click()
  await expect(page.getByRole('menuitem', { name: /Download PDF/ })).toBeVisible()
  // The menu opens over the page and holds the theme.
  await page.getByRole('button', { name: /^Theme/ }).click()
  await page.getByRole('menuitemradio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
})
