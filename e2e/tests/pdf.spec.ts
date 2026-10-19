import type { Page } from '@playwright/test'
import { readPdf, margins } from '../pdf'
import { changeDocument, createExampleCv, expect, interceptPrint, signUp, test } from './fixtures'

/** A PDF of what the app would print: the app builds its print layout, the test saves it as PDF. */
async function savePdf(page: Page) {
  const print = await interceptPrint(page)
  await page.getByRole('button', { name: 'Download PDF' }).click()
  await print.printed()
  return page.pdf({ preferCSSPageSize: true, printBackground: true })
}

const POINTS_PER_MM = 72 / 25.4

test('a CV downloads as one A4 page with its text', async ({ page }) => {
  await signUp(page)
  await createExampleCv(page, 'PDF CV')
  const pages = await readPdf(await savePdf(page))
  expect(pages).toHaveLength(1)
  expect(Math.round(pages[0]!.width / POINTS_PER_MM)).toBe(210)
  expect(Math.round(pages[0]!.height / POINTS_PER_MM)).toBe(297)
  expect(pages[0]!.text).toContain('Maria Ivanova')
  expect(pages[0]!.text).toContain('Senior Product Designer')
})

test('Cyrillic text comes out in the PDF', async ({ page }) => {
  await signUp(page)
  const id = await createExampleCv(page, 'Кирилица')
  await changeDocument(page, `/api/cvs/${id}`, (document) => {
    document.header.name = 'Георги Петров'
    document.header.headline = 'Продуктов дизайнер'
  })
  await page.reload()
  await expect(page.getByRole('document', { name: 'CV' })).toContainText('Георги Петров')
  const pages = await readPdf(await savePdf(page))
  expect(pages[0]!.text).toContain('Георги Петров')
  // The job title is spaced out and in capitals in this template, so ignore spaces and case.
  expect(pages[0]!.text.replace(/\s/g, '').toUpperCase()).toContain('ПРОДУКТОВДИЗАЙНЕР')
})

test('a long cover letter keeps its margins on every printed page', async ({ page }) => {
  await signUp(page)
  await createExampleCv(page, 'Main CV')
  await page.goto('/cover-letters/new')
  await page.getByRole('button', { name: 'Create cover letter' }).click()
  await page.waitForURL(/\/cover-letters\/([^/]+)\/edit$/)
  const id = page.url().split('/')[4]!
  const sentence = 'I enjoy turning unclear problems into small, useful and accessible products. '
  await changeDocument(page, `/api/cover-letters/${id}`, (document) => {
    document.paragraphs = Array.from({ length: 5 }, () => sentence.repeat(45).trim())
  })
  await page.reload()
  await expect(page.getByRole('document', { name: 'Cover letter' })).toContainText(
    'turning unclear',
  )

  const pages = await readPdf(await savePdf(page))
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

test('a long CV flows over several pages and nothing runs off the paper', async ({ page }) => {
  await signUp(page)
  const id = await createExampleCv(page, 'Long CV')
  await changeDocument(page, `/api/cvs/${id}`, (document) => {
    const experience = document.sections.find((s: { type: string }) => s.type === 'experience')
    const first = experience.items[0]
    for (let i = 0; i < 30; i++) {
      experience.items.push({ ...structuredClone(first), id: crypto.randomUUID() })
    }
  })
  await page.reload()
  await expect(page.getByRole('document', { name: 'CV' })).toHaveAttribute(
    'data-page-count',
    /^[3-9]$/,
  )
  const pages = await readPdf(await savePdf(page))
  expect(pages.length).toBeGreaterThanOrEqual(3)
  for (const [index, pdfPage] of pages.entries()) {
    const gap = margins(pdfPage)
    expect(gap.left, `page ${index + 1} left`).toBeGreaterThan(0)
    expect(gap.right, `page ${index + 1} right`).toBeGreaterThan(0)
    expect(gap.bottom, `page ${index + 1} bottom`).toBeGreaterThan(0)
  }
})
