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

  // Entry actions (move, duplicate, delete) are reachable with the keyboard, not only by hovering.
  await page
    .getByRole('document', { name: 'CV' })
    .getByRole('textbox', { name: /^Job title|Title/ })
    .first()
    .focus()
  let reached = false
  for (let i = 0; i < 12 && !reached; i++) {
    await page.keyboard.press('Shift+Tab')
    reached = await page.evaluate(() => document.activeElement?.ariaLabel === 'Duplicate entry')
  }
  expect(reached, 'Duplicate entry reachable by keyboard').toBe(true)
  await page.keyboard.press('Escape')

  // The theme can be changed while editing: the top bar's menu opens over the page.
  for (const [choice, dark] of [
    ['Dark', true],
    ['Light', false],
  ] as const) {
    await page.getByRole('button', { name: /^Theme/ }).click()
    await page.getByRole('menuitemradio', { name: choice }).click()
    await expect(page.locator('html')).toHaveClass(dark ? /dark/ : /^(?!.*dark)/)
  }

  // Share it and open the link signed out.
  await page.getByRole('button', { name: 'Share link' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('switch', { name: 'Share a read-only link' }).click()
  const link = await dialog.getByRole('textbox').inputValue()
  expect(link).toContain('/s/')
  const visitor = await browser.newPage()
  await visitor.goto(link)
  await expect(visitor.getByRole('document', { name: 'CV' })).toContainText('Ada Lovelace')

  // Hiding personal details: the visitor gets stand-ins, never the real name or title.
  await dialog.getByRole('switch', { name: 'Hide my personal details' }).click()
  await expect(dialog.getByRole('switch', { name: 'Hide my personal details' })).toBeChecked()
  const response = visitor.waitForResponse((r) => r.url().includes('/api/shared/'))
  await visitor.reload()
  const body = await (await response).text()
  expect(body).not.toContain('Ada Lovelace')
  expect(body).not.toContain('Portfolio CV')
  await expect(
    visitor.getByText('The owner hid their personal details on this link.'),
  ).toBeVisible()
  await expect(visitor.getByRole('heading', { name: 'Shared CV' })).toBeVisible()
  await expect(visitor.locator('body')).not.toContainText('Ada Lovelace')
  await visitor.close()

  // A resignation letter is created from Documents only, filled in from this CV.
  await page.goto('/')
  await expect(page.getByRole('link', { name: /resignation/i })).toHaveCount(0)
  await page.goto('/documents/all')
  await page.getByRole('button', { name: 'Create new' }).click()
  await page.getByRole('menuitem', { name: 'Resignation letter' }).click()
  await page.getByLabel(/Fill in from a CV/).selectOption({ label: 'Portfolio CV' })
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Ada Lovelace')
  await page.getByRole('textbox', { name: 'Company name' }).fill('Analytical Engines Ltd')
  await page.getByRole('textbox', { name: 'Contact name' }).fill('Charles Babbage')
  await page.getByRole('button', { name: 'Create resignation letter' }).click()
  const letter = page.getByRole('document', { name: 'Resignation letter' })
  await expect(letter).toContainText('Dear Charles Babbage,')
  await expect(letter).toContainText('Analytical Engines Ltd')
  await expect(letter).toContainText('Ada Lovelace')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })
  await page.goto('/documents/resignations')
  await expect(page.getByRole('link', { name: /Analytical Engines Ltd/ })).toBeVisible()

  // It is listed under Documents.
  await page.goto('/documents/cvs')
  await expect(page.getByText('Portfolio CV')).toBeVisible()
  expect(id).toMatch(/^[0-9a-f-]{36}$/)

  // The keyboard works: a skip link first, and a row menu with arrows and Escape.
  await page.goto('/documents/all')
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  const actions = page.getByRole('button', { name: /^Actions for/ }).first()
  await actions.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: 'Open' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(actions).toBeFocused()
  // A dialog opened from the menu gives focus back to the same button.
  await page.keyboard.press('Enter')
  await page.getByRole('menuitem', { name: 'Share link' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(actions).toBeFocused()
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
