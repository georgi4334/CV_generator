import { margins, readPdf } from '../pdf'
import { expect, test } from '../fixtures'

const POINTS_PER_MM = 72 / 25.4

test('a CV downloads as one A4 page with its text', async ({ cvEditor, printing }) => {
  await printing.install()
  await cvEditor.downloadPdf()
  const pages = await readPdf(await printing.capture())
  expect(pages).toHaveLength(1)
  expect(Math.round(pages[0]!.width / POINTS_PER_MM)).toBe(210)
  expect(Math.round(pages[0]!.height / POINTS_PER_MM)).toBe(297)
  expect(pages[0]!.text).toContain('Maria Ivanova')
  expect(pages[0]!.text).toContain('Senior Product Designer')
})

test('Cyrillic text comes out in the PDF', async ({ api, cvEditor, printing }) => {
  await api.changeDocument(cvEditor.apiPath, (document) => {
    document.header.name = 'Георги Петров'
    document.header.headline = 'Продуктов дизайнер'
  })
  await cvEditor.reload()
  await expect(cvEditor.document()).toContainText('Георги Петров')
  await printing.install()
  await cvEditor.downloadPdf()
  const pages = await readPdf(await printing.capture())
  expect(pages[0]!.text).toContain('Георги Петров')
  // The job title is spaced out and in capitals in this template, so ignore spaces and case.
  expect(pages[0]!.text.replace(/\s/g, '').toUpperCase()).toContain('ПРОДУКТОВДИЗАЙНЕР')
})

test('a long cover letter keeps its margins on every printed page', async ({
  api,
  cvEditor,
  newLetter,
  printing,
}) => {
  void cvEditor
  const letter = await newLetter.createFromCv()
  const sentence = 'I enjoy turning unclear problems into small, useful and accessible products. '
  await api.changeDocument(letter.apiPath, (document) => {
    document.paragraphs = Array.from({ length: 5 }, () => sentence.repeat(45).trim())
  })
  await letter.reload()
  await expect(letter.document()).toContainText('turning unclear')

  await printing.install()
  await letter.downloadPdf()
  const pages = await readPdf(await printing.capture())
  expect(pages.length).toBeGreaterThanOrEqual(2)
  for (const [index, pdfPage] of pages.entries()) {
    const gap = margins(pdfPage)
    // At least 8 mm of white on every side; page 2 onwards is where it used to be 0 at the top.
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      expect(gap[side] / POINTS_PER_MM, `page ${index + 1}, ${side} margin in mm`).toBeGreaterThan(
        8,
      )
    }
  }
})

test('a long CV flows over several pages and nothing runs off the paper', async ({
  api,
  cvEditor,
  printing,
}) => {
  await api.changeDocument(cvEditor.apiPath, (document) => {
    const experience = document.sections.find((s: { type: string }) => s.type === 'experience')
    const first = experience.items[0]
    for (let i = 0; i < 30; i++) {
      experience.items.push({ ...structuredClone(first), id: crypto.randomUUID() })
    }
  })
  await cvEditor.reload()
  await expect(cvEditor.document()).toHaveAttribute('data-page-count', /^[3-9]$/)
  await printing.install()
  await cvEditor.downloadPdf()
  const pages = await readPdf(await printing.capture())
  expect(pages.length).toBeGreaterThanOrEqual(3)
  for (const [index, pdfPage] of pages.entries()) {
    const gap = margins(pdfPage)
    expect(gap.left, `page ${index + 1} left`).toBeGreaterThan(0)
    expect(gap.right, `page ${index + 1} right`).toBeGreaterThan(0)
    expect(gap.bottom, `page ${index + 1} bottom`).toBeGreaterThan(0)
  }
})
