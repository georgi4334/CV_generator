import { expect, test } from '../fixtures'

const POSTING =
  'We are hiring a Senior Frontend Engineer with strong React and TypeScript skills. Experience with Kubernetes, Docker and CI/CD is a must, and you care about accessibility and testing.'

test.use({ cvTitle: 'AI CV' })

test('Fix Mistakes, Check & Tailor and the assistant (mock AI)', async ({ cvEditor }) => {
  // Put a typo into the summary.
  await cvEditor.typeInSummary(' Worked with teh team.')
  await cvEditor.expectSaved()

  const fix = await cvEditor.openFixMistakes()
  await fix.check()
  await fix.accept('teh → the')
  await expect(cvEditor.document()).toContainText('Worked with the team.')

  const tailor = await cvEditor.openCheckTailor()
  await tailor.checkMatch(POSTING)
  await expect(tailor.score()).toBeVisible()
  const before = await tailor.scoreValue()
  await tailor.applyFirstSuggestion()
  await expect.poll(() => tailor.scoreValue()).toBeGreaterThan(before)

  const assistant = await cvEditor.openAssistant()
  await assistant.run()
  await assistant.proposal().waitFor()
  await assistant.accept()
  await expect(assistant.proposal()).toHaveCount(0)
  await expect(assistant.quota()).toContainText('27 of 30')
})

test('a person adds their own Gemini key in the account drawer and can remove it', async ({
  account,
  dashboard,
  page,
  api,
}) => {
  void account
  const KEY = 'AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q'
  await dashboard.open()
  await dashboard.account.open()
  await expect(page.getByRole('button', { name: /^AI key.*Not set/ })).toBeVisible()
  await dashboard.account.openAiKey()
  await dashboard.account.saveAiKey(KEY)
  await expect(page.getByText('Key saved')).toBeVisible()
  await expect(page.getByText(/Your key …5p6Q is saved/)).toBeVisible()

  // The key is never sent back: only its end.
  const status = await api.get('/api/ai/status')
  expect(status).toMatchObject({ keySource: 'own', keyHint: '…5p6Q' })
  expect(JSON.stringify(status)).not.toContain(KEY)

  await page.getByRole('button', { name: 'Remove key' }).click()
  await expect(page.getByText('Key removed')).toBeVisible()
  expect((await api.get('/api/ai/status')).keySource).toBe('server')
})
