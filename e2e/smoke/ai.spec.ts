import { test, expect } from './fixtures'

/*
 * The AI features, with the real model (uses the free daily quota, so only with SMOKE_AI=1).
 * Real answers vary: these wait for an answer and check that no error is shown, not what it says.
 */
test.skip(({ smoke }) => !smoke.email, 'Set SMOKE_EMAIL and SMOKE_PASSWORD')
test.skip(({ smoke }) => !smoke.ai, 'Set SMOKE_AI=1 to call the real AI (uses daily requests)')

test('Fix Mistakes finds the typos', async ({ newCv, cleanup }) => {
  const editor = await newCv.createExample({ title: 'Smoke AI' })
  cleanup.push(editor.apiPath)
  await editor.typeAtEnd(editor.summary(), ' I worked with teh team and recieved good feedback.')
  await editor.expectSaved(20_000)
  const fix = await editor.openFixMistakes()
  await fix.check()
  await expect(fix.suggestions().first()).toBeVisible({ timeout: 60_000 })
  await expect(fix.alert()).toHaveCount(0)
})

test('Check & Tailor scores a CV against a job description', async ({ newCv, cleanup }) => {
  const editor = await newCv.createExample({ title: 'Smoke AI' })
  cleanup.push(editor.apiPath)
  const tailor = await editor.openCheckTailor()
  await tailor.checkMatch(
    'We are hiring a product designer with Figma, prototyping and user research experience.',
  )
  await expect(tailor.score()).toBeVisible({ timeout: 60_000 })
  expect(await tailor.scoreValue()).toBeGreaterThanOrEqual(0)
})

test('the AI Assistant proposes a text', async ({ newCv, cleanup }) => {
  const editor = await newCv.createExample({ title: 'Smoke AI' })
  cleanup.push(editor.apiPath)
  await editor.summary().click()
  const assistant = await editor.openAssistant()
  await assistant.run()
  await expect(assistant.proposal()).toBeVisible({ timeout: 60_000 })
  await expect(assistant.quota()).toBeVisible()
})
