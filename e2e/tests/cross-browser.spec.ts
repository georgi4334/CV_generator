import { createExampleCv, expect, expectAccessible, interceptPrint, signUp, test } from './fixtures'

/*
 * The main journeys again, in Safari's engine (WebKit) on a desktop and on an iPhone.
 * Most people send a CV from a phone, and Safari differs from Chrome in fonts, scrolling,
 * dialogs and date handling, so these run on every pull request.
 */

test('a CV is created, edited in place, saved, restyled, printed and shared', async ({
  page,
  browser,
  isMobile,
}) => {
  // Phones have their own toolbar and menus (see mobile.spec.ts); this is the desktop journey.
  test.skip(isMobile, 'desktop layout')
  await signUp(page)
  const print = await interceptPrint(page)
  await createExampleCv(page, 'Safari CV')
  await expectAccessible(page)

  // Edit the name in place; autosave stores it.
  const name = page.getByRole('textbox', { name: 'Your Name' })
  await name.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Ada Lovelace')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })
  await page.reload()
  await expect(page.getByRole('document', { name: 'CV' })).toContainText('Ada Lovelace')

  // Templates and the theme change the page.
  await page.getByRole('button', { name: 'Templates' }).first().click()
  const templates = page.getByRole('group', { name: 'Templates' })
  await expect(templates.getByRole('button')).toHaveCount(16)
  await templates.getByRole('button', { name: 'Portfolio' }).click()
  await expect(templates.getByRole('button', { name: 'Portfolio' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // Download PDF asks the browser to print.
  await page.getByRole('button', { name: 'Download PDF' }).click()
  await print.printed()

  // Share it and read it signed out, in a fresh browser context.
  await page.getByRole('button', { name: 'Share link' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('switch', { name: 'Share a read-only link' }).click()
  const link = await dialog.getByRole('textbox').inputValue()
  const visitor = await browser.newPage()
  await visitor.goto(link)
  await expect(visitor.getByRole('document', { name: 'CV' })).toContainText('Ada Lovelace')
  await visitor.close()
})

test('the dashboard, documents and a letter work, with no sideways scrolling', async ({ page }) => {
  await signUp(page)
  await createExampleCv(page, 'Safari CV')
  const noSideScroll = async () => {
    const { scroll, viewport } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }))
    expect(scroll, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(viewport)
  }
  for (const path of ['/', '/documents/all', '/jobs', '/cvs/new']) {
    await page.goto(path)
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    await noSideScroll()
  }

  await page.goto('/cover-letters/new')
  await page.getByRole('button', { name: 'Create cover letter' }).click()
  await page.waitForURL(/\/cover-letters\/[^/]+\/edit$/)
  await expect(page.getByRole('document', { name: 'Cover letter' })).toContainText('Maria Ivanova')
  await noSideScroll()
})

test('a job is saved with its date and description', async ({ page }) => {
  await signUp(page)
  await page.goto('/jobs?add=1')
  await page.getByLabel('Position').fill('Product Designer')
  await page.getByLabel('Company').fill('Acme')
  await page.getByLabel('Job description').fill('We need a designer who loves Figma.')
  await page
    .getByRole('button', { name: /^(Add job|Save)$/ })
    .last()
    .click()
  await expect(page.getByRole('button', { name: 'Product Designer', exact: true })).toBeVisible()
  const jobs = await (await page.request.get('/api/jobs')).json()
  expect(jobs[0].description).toContain('Figma')
  expect(jobs[0].dateSaved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})
