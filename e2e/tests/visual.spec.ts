import { expect, signUp, test } from './fixtures'

/*
 * Screenshots of the CV templates. The text and data are the example CV's, which never change,
 * so a difference means the layout changed: a header that moved, a sidebar that shrank, a title
 * style that broke. After a change you meant to make, refresh them with `pnpm e2e:update` and
 * look at the new pictures before committing them.
 */
test.describe('CV templates', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page)
  })

  test('every template looks as it did (thumbnails from the template step)', async ({ page }) => {
    await page.goto('/cvs/new?profession=designer')
    // Fonts decide line breaks: wait for them before taking pictures.
    await page.evaluate(() => document.fonts.ready)
    const buttons = page.locator('.grid-templates button')
    await expect(buttons).toHaveCount(16)
    for (let i = 0; i < 16; i++) {
      const button = buttons.nth(i)
      const label = (await button.locator(':scope > span').innerText())
        .replace(/\s*Recommended\s*$/, '')
        .trim()
      await button.scrollIntoViewIfNeeded()
      await expect(button, label).toHaveScreenshot(
        `thumbnail-${label.toLowerCase().replace(/\s+/g, '-')}.png`,
      )
    }
  })

  // Full-size first pages of one template per kind of header and sidebar.
  for (const id of ['polished', 'portfolio', 'vivid', 'bold', 'elegant', 'monogram'] as const) {
    test(`the ${id} template, full size`, async ({ page }) => {
      await page.goto(`/cvs/new?profession=designer&template=${id}`)
      await page.getByRole('button', { name: 'Create CV' }).click()
      await page.waitForURL(/\/cvs\/([^/]+)\/edit$/)
      await page.goto(page.url().replace(/edit$/, 'preview'))
      const paper = page.locator('[data-cv-page]').first()
      await expect(paper).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await expect(paper).toHaveScreenshot(`page-${id}.png`)
    })
  }
})
