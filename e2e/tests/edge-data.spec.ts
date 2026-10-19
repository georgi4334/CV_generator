import { expect, test } from '../fixtures'
import { CvEditorPage } from '../pages/editor/CvEditorPage'

/** Replaces the summary text (and optionally the name) of a saved CV through the API. */
const setSummary = (
  api: import('../fixtures/helpers').ApiClient,
  path: string,
  text: string,
  name?: string,
) =>
  api.changeDocument(path, (document) => {
    document.sections.find((s: { type: string }) => s.type === 'summary').text = text
    if (name) document.header.name = name
  })

test.describe('Cyrillic and emoji', () => {
  test.use({ accountName: 'Георги Петров 🚀', cvTitle: 'Мое CV 🚀' })

  test('survive saving, reloading and sharing, and a hidden link hides the Cyrillic name', async ({
    api,
    cvEditor,
    documents,
    visitors,
  }) => {
    await setSummary(
      api,
      cvEditor.apiPath,
      'Георги работи с Петрова и вярва, че Петров е добър дизайнер 🎨. Пише на кирилица.',
      'Георги Петров',
    )
    await cvEditor.reload()
    await expect(cvEditor.document()).toContainText('Георги Петров')
    await expect(cvEditor.document()).toContainText('Петров е добър дизайнер 🎨')

    // The title with an emoji is kept in the Documents list.
    await documents.openTab('cvs')
    await documents.expectListed('Мое CV 🚀')

    // Typing emoji and Cyrillic in the page saves too.
    await cvEditor.page.goBack()
    await cvEditor.typeAtEnd(cvEditor.document().getByText(/^Георги работи/), ' Още текст ✅')
    await cvEditor.expectSaved()
    await cvEditor.reload()
    await expect(cvEditor.document()).toContainText('Още текст ✅')

    // Share it with the personal details hidden.
    const link = await cvEditor.share.shareWith({ hidePersonal: true })
    const { body } = await visitors.open(link)
    // Words are matched whole: "Георги" and "Петров" go, "Петрова" is another word and stays.
    expect(body).not.toMatch(/Георги|Петров(?!а)/)
    expect(body).toContain('Петрова')
    expect(body).toContain('🎨')
  })
})

test('markup in a CV is shown as text and never runs', async ({ api, cvEditor, visitors }) => {
  const attack =
    '<img src=x onerror="window.__xss=1"> <script>window.__xss=2</script> "quotes" & <b>bold</b>'
  await setSummary(api, cvEditor.apiPath, attack)
  await cvEditor.reload()
  await expect(cvEditor.document()).toContainText('<script>window.__xss=2</script>')
  await expect(cvEditor.document()).toContainText('<b>bold</b>')
  const xss = () => (window as unknown as { __xss?: number }).__xss
  expect(await cvEditor.page.evaluate(xss)).toBeUndefined()
  await expect(cvEditor.document().locator('b')).toHaveCount(0)

  // The same on a shared page.
  const link = await cvEditor.share.shareWith()
  const visitor = await visitors.open(link)
  await expect(visitor.shared.document()).toContainText('<b>bold</b>')
  expect(await visitor.page.evaluate(xss)).toBeUndefined()
})

test('one very long word wraps inside the page instead of running off it', async ({
  api,
  cvEditor,
}) => {
  await setSummary(
    api,
    cvEditor.apiPath,
    `https://example.com/${'a-very-long-path-'.repeat(25)}end`,
  )
  await cvEditor.reload()
  await expect(cvEditor.document()).toContainText('a-very-long-path-')
  const overflow = await cvEditor.page.evaluate(() => {
    const paper = document.querySelector('[data-cv-page]') as HTMLElement
    return paper.scrollWidth - paper.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(0)
})

test('a nearly empty CV still opens and previews', async ({ account, api, page }) => {
  void account
  const { id } = await api.post('/api/cvs', { title: 'Nearly empty' })
  const editor = await new CvEditorPage(page).openDocument(id)
  await expect(editor.document()).toBeVisible()
  await editor.openPreview()
  await expect(editor.document()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible()
})
