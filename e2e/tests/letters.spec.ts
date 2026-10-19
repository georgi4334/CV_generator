import { expect, test } from '../fixtures'

test.use({ cvTitle: 'Main CV' })

test('a cover letter is written, saved, restyled, printed and shared with details hidden', async ({
  cvEditor,
  newLetter,
  printing,
  visitors,
}) => {
  await printing.install()
  const letter = await newLetter.createFromCv()
  await expect(letter.document()).toContainText('Maria Ivanova')

  // Write it: the recipient, the greeting and an opening that names people and places.
  await letter.recipientName().fill('Dana Whitfield')
  await letter.recipientCompany().fill('Northwind Labs')
  await letter.replaceText(letter.greeting(), 'Dear Dana,')
  await letter.opening().click()
  await letter.page.keyboard.type(
    'Thank you for reading, Dana. I am Maria and Northwind Labs is great.',
  )
  await letter.expectSaved()

  await letter.reload()
  await expect(letter.document()).toContainText('Dear Dana,')
  await expect(letter.document()).toContainText('Northwind Labs is great.')

  // Letters offer the original templates only; the CV-only ones are not listed.
  const templates = await letter.openTemplates()
  await expect(templates.buttons()).toHaveCount(8)
  await expect(templates.template('Portfolio')).toHaveCount(0)
  await templates.choose('Stylish')
  await templates.expectSelected('Stylish')
  await letter.expectSaved()

  // Download PDF asks the browser to print the letter.
  await letter.downloadPdf()
  await printing.printed()

  // Shared as it is, a visitor reads it; with details hidden, the real names never arrive.
  const link = await letter.share.shareWith()
  const visitor = await visitors.open(link)
  expect(visitor.body).toContain('Maria Ivanova')
  await expect(visitor.shared.document('Cover letter')).toContainText('Dana')

  await letter.share.hideDetailsOfSharedLink()
  const hidden = await visitor.shared.openLink(link)
  // The recipient's name and company, and their first name inside the text, are swapped.
  expect(hidden).not.toMatch(/Maria|Ivanova|Dana|Whitfield|Northwind/)
  await expect(visitor.shared.hiddenNotice()).toBeVisible()
  void cvEditor
})

test('a resignation letter is edited, saved, shared with details hidden and deleted', async ({
  cvEditor,
  newResignation,
  documents,
  visitors,
}) => {
  void cvEditor
  const letter = await newResignation.create({
    fromCv: 'Main CV',
    company: 'Analytical Engines Ltd',
    contact: 'Charles Babbage',
  })
  await expect(letter.document()).toContainText('Dear Charles Babbage,')

  // Change the opening paragraph; it autosaves and survives a reload.
  await letter.replaceText(
    letter.opening(),
    'Please accept my resignation from Analytical Engines Ltd, Charles.',
  )
  await letter.expectSaved()
  await letter.reload()
  await expect(letter.document()).toContainText('Please accept my resignation')

  // Hiding personal details also hides the employer and swaps names inside the text.
  const link = await letter.share.shareWith({ hidePersonal: true })
  const hidden = (await visitors.open(link)).body
  expect(hidden).not.toMatch(/Maria|Ivanova|Charles|Babbage|Analytical/)

  // Delete it from Documents.
  await documents.openTab('resignations')
  await documents.deleteFirst()
  await expect(documents.link(/Create new resignation letter/)).toBeVisible()
})
