// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { Job } from '@cv/shared'
import { describe, expect, it, vi } from 'vitest'
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

  it('shows how far applications get, and the headline numbers', async () => {
    fake.current.seedJob({ position: 'A', company: 'A', status: 'applied' })
    fake.current.seedJob({ position: 'B', company: 'B', status: 'interviewing' })
    fake.current.seedJob({ position: 'C', company: 'C', status: 'rejected' })
    fake.current.seedJob({ position: 'D', company: 'D' })
    renderRoute('/')
    const funnel = await screen.findByRole('region', { name: 'Application funnel' })
    await waitFor(() => expect(within(funnel).getAllByRole('listitem')).toHaveLength(4))
    const [saved, applied, interview, offer] = within(funnel).getAllByRole('listitem')
    expect(saved!.textContent).toContain('Saved4')
    expect(applied!.textContent).toContain('75% of the step before')
    expect(interview!.textContent).toContain('Interview1')
    expect(offer!.textContent).toContain('Offer0')
    expect(funnel.textContent).toContain('Rejected: 1 · No answer: 0')

    const stats = screen.getByRole('region', { name: 'Application numbers' })
    // Active: applied + interviewing; answered: interviewing + rejected of 3 applied.
    expect(stats.textContent).toContain('Active applications2')
    expect(stats.textContent).toContain('Response rate67%')
    expect(stats.textContent).toContain('Interviews1')
  })

  it('invites you to apply before showing a funnel', async () => {
    fake.current.seedJob({ position: 'D', company: 'D' })
    renderRoute('/')
    const funnel = await screen.findByRole('region', { name: 'Application funnel' })
    await waitFor(() => expect(funnel.textContent).toContain('mark them as applied'))
    expect(screen.getByRole('region', { name: 'Application numbers' }).textContent).toContain('—')
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

  it('shows skeletons, not "Nothing to follow up on", while the jobs load', async () => {
    let finish: (jobs: Job[]) => void = () => {}
    vi.spyOn(fake.current.jobsApi, 'list').mockReturnValue(
      new Promise((resolve) => (finish = resolve)),
    )
    renderRoute('/')
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(screen.getAllByText('Loading your jobs…').length).toBeGreaterThan(0)
    expect(screen.queryByText('Nothing to follow up on.')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Job pipeline' })).toBeNull()
    finish([])
    expect(await screen.findByText('Nothing to follow up on.')).toBeDefined()
  })

  it('says so, and can retry, when the jobs cannot be loaded', async () => {
    const list = vi
      .spyOn(fake.current.jobsApi, 'list')
      .mockRejectedValueOnce(new Error('Server down'))
    renderRoute('/')
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Your jobs could not be loaded',
    )
    expect(screen.queryByText('Nothing to follow up on.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Nothing to follow up on.')).toBeDefined()
    expect(list).toHaveBeenCalledTimes(2)
  })
})
