import { test, expect } from './fixtures'

/* The same site on a phone (the `phone` project): nothing spills sideways, the editor has its toolbar. */
test.skip(({ smoke }) => !smoke.email, 'Set SMOKE_EMAIL and SMOKE_PASSWORD')

test('the main pages fit a phone screen', async ({ dashboard, documents, jobs }) => {
  for (const screen of [dashboard, documents, jobs]) {
    await screen.open()
    await screen.expectNoSideScroll()
  }
})

test('the editor has its bottom toolbar and fits the screen', async ({ newCv, cleanup }) => {
  const editor = await newCv.createExample({ title: `Smoke phone ${Date.now()}` })
  cleanup.push(editor.apiPath)
  await expect(editor.editorTools()).toBeVisible()
  await editor.expectNoSideScroll()
})
