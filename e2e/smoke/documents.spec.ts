import { test, expect } from './fixtures'

test.skip(({ smoke }) => !smoke.email, 'Set SMOKE_EMAIL and SMOKE_PASSWORD')

// A 1×1 PNG: enough for the upload and download through photo storage.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const stamp = () => `Smoke ${new Date().toISOString()}`

test('a CV: create, edit, add a photo, change the template, and see it all after a reload', async ({
  newCv,
  documents,
  cleanup,
}) => {
  const title = stamp()
  const editor = await newCv.createExample({ title })
  cleanup.push(editor.apiPath)

  // Database: an edit autosaves and survives a reload.
  await editor.setName('Smoke Tester')
  await editor.expectSaved(20_000)
  await editor.reload()
  await expect(editor.document()).toContainText('Smoke Tester')

  // Photo storage: upload, reload, and the picture loads.
  const design = await editor.openDesignFont()
  await design.uploadPhoto({ name: 'smoke.png', mimeType: 'image/png', buffer: PNG })
  await editor.expectSaved(20_000)
  await editor.reload()
  const photo = editor.document().locator('img').first()
  await expect(photo).toBeVisible()
  expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

  // The template is part of the saved document.
  const templates = await editor.openTemplates()
  await templates.choose('Elegant')
  await editor.expectSaved(20_000)
  await editor.reload()
  await editor.openTemplates()
  await templates.expectSelected('Elegant')

  // It is listed under Documents.
  await documents.openTab('cvs')
  await documents.expectListed(title)
})

test('a CV is shared with a link that works signed out, and personal details can be hidden', async ({
  newCv,
  visitors,
  cleanup,
}) => {
  const editor = await newCv.createExample({ title: stamp() })
  cleanup.push(editor.apiPath)
  await editor.setName('Smoke Tester')
  await editor.expectSaved(20_000)

  await editor.share.open()
  const link = await editor.share.enable()
  const visitor = await visitors.open(link)
  await expect(visitor.shared.document()).toContainText('Smoke Tester')

  await editor.share.hidePersonalDetails()
  const hidden = await visitor.shared.openLink(link)
  expect(hidden).not.toContain('Smoke Tester')
  await expect(visitor.shared.hiddenNotice()).toBeVisible()

  // Turning the link off ends it.
  await editor.share.disable()
  const slug = link.split('/s/')[1]!
  expect((await editor.page.request.get(`/api/shared/${slug}`)).status()).toBe(404)
})

test('a cover letter and a resignation letter are made from a CV', async ({
  newCv,
  newLetter,
  newResignation,
  cleanup,
}) => {
  const title = stamp()
  const cv = await newCv.createExample({ title })
  cleanup.push(cv.apiPath)

  const letter = await newLetter.createFromCv()
  cleanup.push(letter.apiPath)
  await letter.expectSaved(20_000)

  const resignation = await newResignation.create({ fromCv: title, company: 'Smoke Ltd' })
  cleanup.push(resignation.apiPath)
  await expect(resignation.document()).toContainText('Smoke Ltd')
  await resignation.expectSaved(20_000)
})

test('Download PDF builds the print layout', async ({ newCv, printing, cleanup }) => {
  const editor = await newCv.createExample({ title: stamp() })
  cleanup.push(editor.apiPath)
  await printing.install()
  await editor.downloadPdf()
  await printing.printed()
})
