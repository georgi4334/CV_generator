import { createExampleCv, expect, signUp, test } from './fixtures'

test('a CV is created, edited, saved and shared', async ({ page, browser }) => {
  await signUp(page)
  const id = await createExampleCv(page, 'Portfolio CV')

  // Edit the name in place; autosave stores it.
  const name = page.getByRole('textbox', { name: 'Your Name' })
  await name.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Ada Lovelace')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })
  await page.reload()
  await expect(page.getByRole('document', { name: 'CV' })).toContainText('Ada Lovelace')

  // Share it and open the link signed out.
  await page.getByRole('button', { name: 'Share link' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('switch').click()
  const link = await dialog.getByRole('textbox').inputValue()
  expect(link).toContain('/s/')
  const visitor = await browser.newPage()
  await visitor.goto(link)
  await expect(visitor.getByRole('document', { name: 'CV' })).toContainText('Ada Lovelace')
  await visitor.close()

  // It is listed under Documents.
  await page.goto('/documents/cvs')
  await expect(page.getByText('Portfolio CV')).toBeVisible()
  expect(id).toMatch(/^[0-9a-f-]{36}$/)
})

test('a saved job keeps its description', async ({ page }) => {
  await signUp(page)
  await page.goto('/jobs?add=1')
  await page.getByLabel('Position').fill('Product Designer')
  await page.getByLabel('Company').fill('Acme')
  await page
    .getByLabel('Job description')
    .fill('We need a designer who loves Figma and accessibility.')
  await page
    .getByRole('button', { name: /^(Add job|Save)$/ })
    .last()
    .click()
  await expect(page.getByRole('button', { name: 'Product Designer', exact: true })).toBeVisible()
  const jobs = await (await page.request.get('/api/jobs')).json()
  expect(jobs[0].description).toContain('Figma')
})
