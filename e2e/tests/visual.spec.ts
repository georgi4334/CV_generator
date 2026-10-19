import { expect, test } from '../fixtures'

/*
 * Screenshots of the CV templates. The text and data are the example CV's, which never change,
 * so a difference means the layout changed: a header that moved, a sidebar that shrank, a title
 * style that broke. Pixels differ a little between computers, so the pictures are made by CI:
 * after a change you meant to make, add the label "update-screenshots" to the pull request
 * (.github/workflows/update-screenshots.yml), then look at the new pictures in the commit it adds.
 * Locally this runs only with E2E_VISUAL=1, against pictures made on the same computer.
 */
test.describe('CV templates', () => {
  test.beforeEach(async ({ account }) => {
    void account
  })

  test('every template looks as it did (thumbnails from the template step)', async ({
    page,
    newCv,
  }) => {
    await newCv.openWizard('designer')
    // Fonts decide line breaks: wait for them before taking pictures.
    await page.evaluate(() => document.fonts.ready)
    const buttons = newCv.templateButtons()
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
    test(`the ${id} template, full size`, async ({ page, newCv }) => {
      const editor = await newCv.createExample({ template: id })
      await editor.openPreview()
      const paper = editor.firstPage()
      await expect(paper).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await expect(paper).toHaveScreenshot(`page-${id}.png`)
    })
  }
})
