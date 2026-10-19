import { expect, test } from '../fixtures'

/*
 * The main journeys again, in Safari's engine (WebKit) on a desktop and on an iPhone.
 * Most people send a CV from a phone, and Safari differs from Chrome in fonts, scrolling,
 * dialogs and date handling, so these run on every pull request.
 */

test.use({ cvTitle: 'Safari CV' })

test('a CV is created, edited in place, saved, restyled, printed and shared', async ({
  cvEditor,
  printing,
  visitors,
  isMobile,
}) => {
  // Phones have their own toolbar and menus (see mobile.spec.ts); this is the desktop journey.
  test.skip(isMobile, 'desktop layout')
  await printing.install()
  await cvEditor.expectAccessible()

  // Edit the name in place; autosave stores it.
  await cvEditor.setName('Ada Lovelace')
  await cvEditor.expectSaved()
  await cvEditor.reload()
  await expect(cvEditor.document()).toContainText('Ada Lovelace')

  // Templates change the page.
  const templates = await cvEditor.openTemplates()
  await expect(templates.buttons()).toHaveCount(16)
  await templates.choose('Portfolio')
  await templates.expectSelected('Portfolio')

  // Download PDF asks the browser to print.
  await cvEditor.downloadPdf()
  await printing.printed()

  // Share it and read it signed out, in a fresh browser context.
  const link = await cvEditor.share.shareWith()
  const visitor = await visitors.open(link)
  await expect(visitor.shared.document()).toContainText('Ada Lovelace')
})

test('the dashboard, documents and a letter work, with no sideways scrolling', async ({
  cvEditor,
  dashboard,
  newLetter,
}) => {
  void cvEditor
  for (const path of ['/', '/documents/all', '/jobs', '/cvs/new']) {
    await dashboard.open(path)
    await dashboard.expectNoSideScroll()
  }

  const letter = await newLetter.createFromCv()
  await expect(letter.document()).toContainText('Maria Ivanova')
  await letter.expectNoSideScroll()
})

test('a job is saved with its date and description', async ({ account, jobs, api }) => {
  void account
  await jobs.openAddForm()
  await jobs.addJob({
    position: 'Product Designer',
    company: 'Acme',
    description: 'We need a designer who loves Figma.',
  })
  // A table row on wide screens, a card on phones: look for the text, not a button name.
  await expect(jobs.job('Product Designer')).toBeVisible()
  const saved = await api.get('/api/jobs')
  expect(saved[0].description).toContain('Figma')
  expect(saved[0].dateSaved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})
