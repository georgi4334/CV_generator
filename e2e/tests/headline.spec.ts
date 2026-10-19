import { readPdf } from '../pdf'
import { expect, test } from '../fixtures'

test('a new headline is autosaved, survives a reload and is printed', async ({
  cvEditor,
  api,
  printing,
}) => {
  const headline = cvEditor.document().getByRole('textbox', {
    name: 'The role you are applying for?',
  })
  await cvEditor.replaceText(headline, 'Staff Product Designer')
  await cvEditor.expectSaved()

  // The server has it...
  const record = await api.get(cvEditor.apiPath)
  expect(record.document.header.headline).toBe('Staff Product Designer')

  // ...and a fresh page load shows it.
  await cvEditor.reload()
  await expect(cvEditor.document()).toContainText('Staff Product Designer')

  // The printed PDF has it too (the creative template styles the headline, so ignore
  // spaces and case).
  await printing.install()
  await cvEditor.downloadPdf()
  const pages = await readPdf(await printing.capture())
  expect(pages[0]!.text.replace(/\s/g, '').toUpperCase()).toContain('STAFFPRODUCTDESIGNER')
})
