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
