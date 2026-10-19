import { createExampleCv, expect, signUp, test } from './fixtures'

const POSTING =
  'We are hiring a Senior Frontend Engineer with strong React and TypeScript skills. Experience with Kubernetes, Docker and CI/CD is a must, and you care about accessibility and testing.'

test('Fix Mistakes, Check & Tailor and the assistant (mock AI)', async ({ page }) => {
  await signUp(page)
  await createExampleCv(page, 'AI CV')

  // Put a typo into the summary.
  const summary = page.getByRole('document', { name: 'CV' }).getByText(/^Product designer focused/)
  await summary.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' Worked with teh team.')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Fix Mistakes' }).click()
  const fix = page.getByRole('complementary', { name: 'Fix Mistakes' })
  await fix.getByRole('button', { name: 'Check spelling & grammar' }).click()
  await fix
    .getByRole('listitem', { name: 'teh → the' })
    .getByRole('button', { name: 'Accept' })
    .click()
  await expect(page.getByRole('document', { name: 'CV' })).toContainText('Worked with the team.')

  await page.getByRole('button', { name: 'Check & Tailor' }).click()
  const tailor = page.getByRole('complementary', { name: 'Check & Tailor' })
  await tailor.getByPlaceholder('Paste the full job description…').fill(POSTING)
  await tailor.getByRole('button', { name: 'Check match' }).click()
  const score = tailor.getByLabel(/^Match score \d+%$/)
  await expect(score).toBeVisible()
  const before = Number((await score.getAttribute('aria-label'))!.match(/\d+/)![0])
  await tailor.getByRole('button', { name: 'Apply', exact: true }).first().click()
  await expect
    .poll(async () => Number((await score.getAttribute('aria-label'))!.match(/\d+/)![0]))
    .toBeGreaterThan(before)

  await page.getByRole('button', { name: 'AI Assistant' }).first().click()
  const assistant = page.getByRole('complementary', { name: 'AI Assistant' })
  await assistant.getByRole('button', { name: /^(Improve|Write)$/ }).click()
  await assistant.getByRole('region', { name: 'Proposal' }).waitFor()
  await assistant.getByRole('button', { name: /^(Replace|Insert)$/ }).click()
  await expect(assistant.getByRole('region', { name: 'Proposal' })).toHaveCount(0)
  await expect(assistant.getByText(/AI requests left today/)).toContainText('27 of 30')
})
