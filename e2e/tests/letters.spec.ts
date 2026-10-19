import type { Page } from '@playwright/test'
import { createExampleCv, expect, interceptPrint, signUp, test } from './fixtures'

/** Opens the share dialog, turns the link on and returns it; optionally hides personal details. */
async function shareLink(page: Page, { hidePersonal = false } = {}) {
  await page.getByRole('button', { name: 'Share link' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('switch', { name: 'Share a read-only link' }).click()
  const link = await dialog.getByRole('textbox').inputValue()
  expect(link).toContain('/s/')
  if (hidePersonal) {
    await dialog.getByRole('switch', { name: 'Hide my personal details' }).click()
    await expect(dialog.getByRole('switch', { name: 'Hide my personal details' })).toBeChecked()
  }
  await page.keyboard.press('Escape')
  return link
}

/** Turns "Hide my personal details" on for a link that is already shared. */
async function hideDetails(page: Page) {
  await page.getByRole('button', { name: 'Share link' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('switch', { name: 'Hide my personal details' }).click()
  await expect(dialog.getByRole('switch', { name: 'Hide my personal details' })).toBeChecked()
  await page.keyboard.press('Escape')
}

/** What a visitor's browser receives for a shared link, and what it shows. */
async function visit(page: Page, link: string) {
  const answer = page.waitForResponse((r) => r.url().includes('/api/shared/'))
  await page.goto(link)
  return (await answer).text()
}

test('a cover letter is written, saved, restyled, printed and shared with details hidden', async ({
  page,
  browser,
}) => {
  await signUp(page)
  await createExampleCv(page, 'Main CV')
  const print = await interceptPrint(page)

  await page.goto('/cover-letters/new')
  const create = page.getByRole('button', { name: 'Create cover letter' })
  await expect(create).toBeEnabled()
  await create.click()
  await page.waitForURL(/\/cover-letters\/[^/]+\/edit$/)
  const letter = page.getByRole('document', { name: 'Cover letter' })
  await expect(letter).toContainText('Maria Ivanova')

  // Write it: the recipient, the greeting and an opening that names people and places.
  await letter.getByRole('textbox', { name: "Hiring manager's name" }).fill('Dana Whitfield')
  await letter.getByRole('textbox', { name: 'Company Name' }).fill('Northwind Labs')
  const greeting = letter.getByRole('textbox', { name: 'Dear Hiring Manager,' })
  await greeting.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Dear Dana,')
  const opening = letter.getByRole('textbox', { name: /^Opening/ })
  await opening.click()
  await page.keyboard.type('Thank you for reading, Dana. I am Maria and Northwind Labs is great.')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })

  await page.reload()
  await expect(letter).toContainText('Dear Dana,')
  await expect(letter).toContainText('Northwind Labs is great.')

  // Letters offer the original templates only; the CV-only ones are not listed.
  await page.getByRole('button', { name: 'Templates' }).click()
  const templates = page.getByRole('group', { name: 'Templates' })
  await expect(templates.getByRole('button')).toHaveCount(8)
  await expect(templates.getByRole('button', { name: 'Portfolio' })).toHaveCount(0)
  await templates.getByRole('button', { name: 'Stylish' }).click()
  await expect(templates.getByRole('button', { name: 'Stylish' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })

  // Download PDF asks the browser to print the letter.
  await page.getByRole('button', { name: 'Download PDF' }).click()
  await print.printed()

  // Shared as it is, a visitor reads it; with details hidden, the real names never arrive.
  const link = await shareLink(page)
  const visitor = await browser.newPage()
  const open = await visit(visitor, link)
  expect(open).toContain('Maria Ivanova')
  await expect(visitor.getByRole('document', { name: 'Cover letter' })).toContainText('Dana')

  await hideDetails(page)
  const hidden = await visit(visitor, link)
  // The recipient's name and company, and their first name inside the text, are swapped.
  expect(hidden).not.toMatch(/Maria|Ivanova|Dana|Whitfield|Northwind/)
  await expect(
    visitor.getByText('The owner hid their personal details on this link.'),
  ).toBeVisible()
  await visitor.close()
})

test('a resignation letter is edited, saved, shared with details hidden and deleted', async ({
  page,
  browser,
}) => {
  await signUp(page)
  await createExampleCv(page, 'Main CV')

  await page.goto('/resignations/new')
  await page.getByLabel(/Fill in from a CV/).selectOption({ label: 'Main CV' })
  await page.getByRole('textbox', { name: 'Company name' }).fill('Analytical Engines Ltd')
  await page.getByRole('textbox', { name: 'Contact name' }).fill('Charles Babbage')
  await page.getByRole('button', { name: 'Create resignation letter' }).click()
  await page.waitForURL(/\/resignations\/[^/]+\/edit$/)
  const letter = page.getByRole('document', { name: 'Resignation letter' })
  await expect(letter).toContainText('Dear Charles Babbage,')

  // Change the opening paragraph; it autosaves and survives a reload.
  const opening = letter.getByRole('textbox', { name: /^Opening/ })
  await opening.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Please accept my resignation from Analytical Engines Ltd, Charles.')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })
  await page.reload()
  await expect(letter).toContainText('Please accept my resignation')

  // Hiding personal details also hides the employer and swaps names inside the text.
  const link = await shareLink(page, { hidePersonal: true })
  const visitor = await browser.newPage()
  const hidden = await visit(visitor, link)
  expect(hidden).not.toMatch(/Maria|Ivanova|Charles|Babbage|Analytical/)
  await visitor.close()

  // Delete it from Documents.
  await page.goto('/documents/resignations')
  await page
    .getByRole('button', { name: /^Actions for/ })
    .first()
    .click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('link', { name: /Create new resignation letter/ })).toBeVisible()
})
