// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { localToday } from '@/shared/lib/format'
import { renderRoute } from '@/test/renderRoute'

describe('dashboard', () => {
  const daysAgo = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return localToday(date)
  }

  it('shows thumbnails of the latest CVs and cover letters, newest first', async () => {
    fake.current.seed('Oldest CV')
    fake.current.seed('Middle CV')
    fake.current.seedLetter('Letter – Acme')
    fake.current.seed('Newest CV')
    fake.current.seed('Fifth CV')
    renderRoute('/')
    const recent = within(
      await screen
        .findByRole('heading', { name: 'Recent documents' })
        .then((h) => h.closest('section')!),
    )
    await waitFor(() => expect(recent.getAllByRole('link')).toHaveLength(5)) // View all + 4 documents
    expect(recent.getAllByRole('link').map((l) => l.textContent)).toEqual([
      'View all',
      expect.stringContaining('Fifth CV'),
      expect.stringContaining('Newest CV'),
      expect.stringContaining('Letter – Acme'),
      expect.stringContaining('Middle CV'),
    ])
    expect(recent.queryByText('Oldest CV')).toBeNull()
    // Each card draws its document's first page.
    await waitFor(() => {
      const cards = recent.getAllByRole('link').slice(1)
      for (const card of cards) {
        expect(card.querySelector('[data-cv-page], [data-letter-page]')).not.toBeNull()
      }
    })
  })

  it('invites you to create the first CV when there are no documents', async () => {
    renderRoute('/')
    const link = await screen.findByRole('link', { name: 'Create your first CV' })
    expect(link.getAttribute('href')).toBe('/cvs/new')
  })

  it('counts jobs per status and opens the filtered list', async () => {
    fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme', status: 'applied' })
    fake.current.seedJob({ position: 'Backend Developer', company: 'Zeta', status: 'applied' })
    fake.current.seedJob({ position: 'Designer', company: 'Mira' })
    const router = renderRoute('/')
    const applied = await screen.findByRole('link', { name: 'Applied: 2' })
    expect(screen.getByRole('link', { name: 'To apply: 1' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Accepted: 0' })).toBeDefined()

    fireEvent.click(applied)
    expect(router.state.location.pathname).toBe('/jobs')
    await screen.findByRole('button', { name: 'Frontend Engineer' })
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toHaveProperty(
      'value',
      'applied',
    )
    expect(screen.queryByRole('button', { name: 'Designer' })).toBeNull()
    expect(router.state.location.search).toBe('')
  })

  it('reminds about stale jobs, longest-waiting first', async () => {
    fake.current.seedJob({
      position: 'Frontend Engineer',
      company: 'Acme',
      status: 'applied',
      dateApplied: daysAgo(20),
      dateSaved: daysAgo(25),
    })
    fake.current.seedJob({ position: 'Designer', company: 'Mira', dateSaved: daysAgo(9) })
    fake.current.seedJob({
      position: 'Fresh Job',
      company: 'New Co',
      status: 'applied',
      dateApplied: daysAgo(3),
    })
    renderRoute('/')
    const reminders = within(
      (await screen.findByRole('heading', { name: /Reminders/ })).closest('section')!,
    )
    await waitFor(() => expect(reminders.getAllByRole('listitem')).toHaveLength(2))
    const [first, second] = reminders.getAllByRole('listitem')
    expect(first!.textContent).toContain('Frontend Engineer at Acme')
    expect(first!.textContent).toContain('Applied 20 days ago and no answer yet.')
    expect(second!.textContent).toContain('Designer at Mira')
    expect(second!.textContent).toContain('Saved 9 days ago and still “To apply”.')
    expect(reminders.queryByText('Fresh Job at New Co')).toBeNull()
  })

  it('marks a job as "No answer" or "Applied" from its reminder', async () => {
    const stale = fake.current.seedJob({
      position: 'Frontend Engineer',
      company: 'Acme',
      status: 'applied',
      dateApplied: daysAgo(20),
    })
    const waiting = fake.current.seedJob({
      position: 'Designer',
      company: 'Mira',
      dateSaved: daysAgo(9),
    })
    renderRoute('/')
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as “No answer”' }))
    await waitFor(() => expect(fake.current.jobs.get(stale.id)!.status).toBe('no_answer'))
    expect(screen.queryByRole('button', { name: 'Mark as “No answer”' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'I applied' }))
    await waitFor(() =>
      expect(fake.current.jobs.get(waiting.id)).toMatchObject({
        status: 'applied',
        dateApplied: localToday(),
      }),
    )
  })

  it('says when there is nothing to follow up on and opens a job from a reminder', async () => {
    renderRoute('/')
    expect(await screen.findByText('Nothing to follow up on.')).toBeDefined()
    cleanup()

    const job = fake.current.seedJob({
      position: 'Designer',
      company: 'Mira',
      dateSaved: daysAgo(10),
    })
    const router = renderRoute('/')
    fireEvent.click(await screen.findByRole('link', { name: 'Designer at Mira' }))
    expect(router.state.location.pathname).toBe('/jobs')
    expect(await screen.findByRole('dialog', { name: 'Designer' })).toBeDefined()
    expect(fake.current.jobs.get(job.id)!.status).toBe('to_apply')
  })
})
