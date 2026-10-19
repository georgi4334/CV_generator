import { expect, test } from '../fixtures'

test('switching the language changes the page in place and is remembered', async ({
  page,
  loginPage,
}) => {
  await loginPage.open()
  // A marker that would be lost if the page reloaded.
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 42))

  await loginPage.selectLanguage('bg')
  await expect(loginPage.heading()).not.toHaveText('Sign in')
  await expect(page.locator('html')).toHaveAttribute('lang', 'bg')
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(42)
  await loginPage.expectAccessible()

  await loginPage.selectLanguage('de')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(loginPage.languageSelect()).toHaveValue('de')
})

test.use({ cvTitle: 'Mehrsprachig' })

test('the editor keeps unsaved work when the language changes', async ({
  page,
  api,
  cvEditor,
  dashboard,
}) => {
  await cvEditor.setName('Grace Hopper')

  await cvEditor.selectLanguage('de')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(cvEditor.documentInAnyLanguage()).toContainText('Grace Hopper')
  // The CV itself keeps its own language (English placeholders and section titles).
  await expect(cvEditor.documentInAnyLanguage()).toContainText('Experience')
  await cvEditor.expectAccessible()

  await dashboard.open()
  await dashboard.expectAccessible()
  // The account remembers the language (used for emails and other browsers).
  const me = await api.get('/api/auth/me')
  expect(me.user.locale).toBe('de')
})
