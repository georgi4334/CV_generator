import { expect, test } from '../fixtures'

test.use({ cvTitle: 'Portfolio CV' })

test('a CV is created, edited, saved and shared', async ({
  page,
  cvEditor,
  dashboard,
  documents,
  newResignation,
  visitors,
}) => {
  const id = cvEditor.id

  // Edit the name in place; autosave stores it.
  await cvEditor.setName('Ada Lovelace')
  await cvEditor.expectSaved()
  await cvEditor.reload()
  await expect(cvEditor.document()).toContainText('Ada Lovelace')

  // Entry actions (move, duplicate, delete) are reachable with the keyboard, not only by hovering.
  await cvEditor.firstEntryTitle().focus()
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
    await cvEditor.setTheme(choice)
    await expect(page.locator('html')).toHaveClass(dark ? /dark/ : /^(?!.*dark)/)
  }

  // Share it and open the link signed out.
  await cvEditor.share.open()
  const link = await cvEditor.share.enable()
  const visitor = await visitors.open(link)
  await expect(visitor.shared.document()).toContainText('Ada Lovelace')

  // Hiding personal details: the visitor gets stand-ins, never the real name or title.
  await cvEditor.share.hidePersonalDetails()
  const hidden = await visitor.shared.openLink(link)
  expect(hidden).not.toContain('Ada Lovelace')
  expect(hidden).not.toContain('Portfolio CV')
  await expect(visitor.shared.hiddenNotice()).toBeVisible()
  await expect(visitor.shared.heading('Shared CV')).toBeVisible()
  await expect(visitor.page.locator('body')).not.toContainText('Ada Lovelace')

  // A resignation letter is created from Documents only, filled in from this CV.
  await dashboard.open()
  await expect(page.getByRole('link', { name: /resignation/i })).toHaveCount(0)
  await documents.open()
  await documents.createViaMenu('Resignation letter')
  await newResignation.fill({ fromCv: 'Portfolio CV' })
  await expect(newResignation.senderName()).toHaveValue('Ada Lovelace')
  await newResignation.fill({ company: 'Analytical Engines Ltd', contact: 'Charles Babbage' })
  const letter = await newResignation.submit()
  await expect(letter.document()).toContainText('Dear Charles Babbage,')
  await expect(letter.document()).toContainText('Analytical Engines Ltd')
  await expect(letter.document()).toContainText('Ada Lovelace')
  await letter.expectSaved()
  await documents.openTab('resignations')
  await expect(documents.link(/Analytical Engines Ltd/)).toBeVisible()

  // It is listed under Documents.
  await documents.openTab('cvs')
  await documents.expectListed('Portfolio CV')
  expect(id).toMatch(/^[0-9a-f-]{36}$/)

  // The keyboard works: a skip link first, and a row menu with arrows and Escape.
  await documents.open()
  await page.keyboard.press('Tab')
  await expect(documents.skipLink()).toBeFocused()
  const actions = documents.rowActions()
  await actions.focus()
  await page.keyboard.press('Enter')
  await expect(documents.menuItem('Open')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(documents.menuItem('Rename')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(actions).toBeFocused()
  // A dialog opened from the menu gives focus back to the same button.
  await page.keyboard.press('Enter')
  await documents.menuItem('Share link').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(actions).toBeFocused()
})

test('a saved job keeps its description', async ({ account, jobs, api }) => {
  void account
  await jobs.openAddForm()
  await jobs.addJob({
    position: 'Product Designer',
    company: 'Acme',
    description: 'We need a designer who loves Figma and accessibility.',
  })
  await expect(jobs.job('Product Designer')).toBeVisible()
  const saved = await api.get('/api/jobs')
  expect(saved[0].description).toContain('Figma')
})
