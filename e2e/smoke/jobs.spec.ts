import { test, expect } from './fixtures'

test.skip(({ smoke }) => !smoke.email, 'Set SMOKE_EMAIL and SMOKE_PASSWORD')

test('a job is saved, kept in the database and removed again', async ({ jobs, api, cleanup }) => {
  const position = `Smoke Designer ${Date.now()}`
  await jobs.openAddForm()
  await jobs.addJob({ position, company: 'Smoke Ltd', description: 'Figma and accessibility.' })
  await expect(jobs.job(position)).toBeVisible()

  const saved = (await api.get('/api/jobs')).find(
    (j: { position: string }) => j.position === position,
  )
  expect(saved.description).toContain('Figma')
  cleanup.push(`/api/jobs/${saved.id}`)

  await jobs.open()
  await expect(jobs.job(position)).toBeVisible()
})
