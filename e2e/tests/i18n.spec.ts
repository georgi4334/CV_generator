import { createExampleCv, expect, expectAccessible, signUp, test } from './fixtures'

const languageSelect = (page: import('@playwright/test').Page) =>
  page.getByRole('combobox', {
    name: /Interface language|Език на интерфейса|Sprache der Oberfläche/,
  })

test('switching the language changes the page in place and is remembered', async ({ page }) => {
  await page.goto('/login')
  // A marker that would be lost if the page reloaded.
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 42))

  await languageSelect(page).selectOption('bg')
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Sign in')
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('bg')
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(42)
  await expectAccessible(page)

  await languageSelect(page).selectOption('de')
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('de')
  await page.reload()
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('de')
  await expect(languageSelect(page)).toHaveValue('de')
})

test('the editor keeps unsaved work when the language changes', async ({ page }) => {
  await signUp(page)
  await createExampleCv(page, 'Mehrsprachig')
  const name = page.getByRole('textbox', { name: 'Your Name' })
  await name.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Grace Hopper')

  await languageSelect(page).selectOption('de')
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('de')
  await expect(page.getByRole('document', { name: /CV|Lebenslauf/ })).toContainText('Grace Hopper')
  // The CV itself keeps its own language (English placeholders and section titles).
  await expect(page.getByRole('document', { name: /CV|Lebenslauf/ })).toContainText('Experience')
  await expectAccessible(page)

  await page.goto('/')
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  await expectAccessible(page)
  // The account remembers the language (used for emails and other browsers).
  const me = await (await page.request.get('/api/auth/me')).json()
  expect(me.user.locale).toBe('de')
})
