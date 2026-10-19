import type { Page } from '@playwright/test'
import { changeDocument, createExampleCv, expect, signUp, test } from './fixtures'

const setSummary = (page: Page, id: string, text: string, name?: string) =>
  changeDocument(page, `/api/cvs/${id}`, (document) => {
    document.sections.find((s: { type: string }) => s.type === 'summary').text = text
    if (name) document.header.name = name
  })

test('Cyrillic and emoji survive saving, reloading and sharing, and a hidden link hides the Cyrillic name', async ({
  page,
  browser,
}) => {
  await signUp(page, 'Георги Петров 🚀')
  const id = await createExampleCv(page, 'Мое CV 🚀')
  await setSummary(
    page,
    id,
    'Георги работи с Петрова и вярва, че Петров е добър дизайнер 🎨. Пише на кирилица.',
    'Георги Петров',
  )
  await page.reload()
  const cv = page.getByRole('document', { name: 'CV' })
  await expect(cv).toContainText('Георги Петров')
  await expect(cv).toContainText('Петров е добър дизайнер 🎨')

  // The title with an emoji is kept in the Documents list.
  await page.goto('/documents/cvs')
  await expect(page.getByText('Мое CV 🚀')).toBeVisible()

  // Typing emoji and Cyrillic in the page saves too.
  await page.goBack()
  await cv.getByText(/^Георги работи/).click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' Още текст ✅')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })
  await page.reload()
  await expect(cv).toContainText('Още текст ✅')

  // Share it with the personal details hidden.
  await page.getByRole('button', { name: 'Share link' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('switch', { name: 'Share a read-only link' }).click()
  const link = await dialog.getByRole('textbox').inputValue()
  await dialog.getByRole('switch', { name: 'Hide my personal details' }).click()
  await expect(dialog.getByRole('switch', { name: 'Hide my personal details' })).toBeChecked()
  const visitor = await browser.newPage()
  const answer = visitor.waitForResponse((r) => r.url().includes('/api/shared/'))
  await visitor.goto(link)
  const body = await (await answer).text()
  // Words are matched whole: "Георги" and "Петров" go, "Петрова" is another word and stays.
  expect(body).not.toMatch(/Георги|Петров(?!а)/)
  expect(body).toContain('Петрова')
  expect(body).toContain('🎨')
  await visitor.close()
})

test('markup in a CV is shown as text and never runs', async ({ page, browser }) => {
  await signUp(page)
  const id = await createExampleCv(page, 'Markup')
  const attack =
    '<img src=x onerror="window.__xss=1"> <script>window.__xss=2</script> "quotes" & <b>bold</b>'
  await setSummary(page, id, attack)
  await page.reload()
  const cv = page.getByRole('document', { name: 'CV' })
  await expect(cv).toContainText('<script>window.__xss=2</script>')
  await expect(cv).toContainText('<b>bold</b>')
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
  await expect(cv.locator('b')).toHaveCount(0)

  // The same on a shared page.
  await page.getByRole('button', { name: 'Share link' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('switch', { name: 'Share a read-only link' }).click()
  const link = await dialog.getByRole('textbox').inputValue()
  const visitor = await browser.newPage()
  await visitor.goto(link)
  await expect(visitor.getByRole('document', { name: 'CV' })).toContainText('<b>bold</b>')
  expect(
    await visitor.evaluate(() => (window as unknown as { __xss?: number }).__xss),
  ).toBeUndefined()
  await visitor.close()
})

test('one very long word wraps inside the page instead of running off it', async ({ page }) => {
  await signUp(page)
  const id = await createExampleCv(page, 'Long word')
  await setSummary(page, id, `https://example.com/${'a-very-long-path-'.repeat(25)}end`)
  await page.reload()
  await expect(page.getByRole('document', { name: 'CV' })).toContainText('a-very-long-path-')
  const overflow = await page.evaluate(() => {
    const paper = document.querySelector('[data-cv-page]') as HTMLElement
    return paper.scrollWidth - paper.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(0)
})

test('a nearly empty CV still opens and previews', async ({ page }) => {
  await signUp(page)
  const res = await page.request.post('/api/cvs', { data: { title: 'Nearly empty' } })
  expect(res.status()).toBe(201)
  const id = (await res.json()).id as string
  await page.goto(`/cvs/${id}/edit`)
  await expect(page.getByRole('document', { name: 'CV' })).toBeVisible()
  await page.goto(`/cvs/${id}/preview`)
  await expect(page.getByRole('document', { name: 'CV' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible()
})
