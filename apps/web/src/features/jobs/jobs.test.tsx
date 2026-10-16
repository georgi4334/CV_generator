// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { localToday } from '@/shared/lib/format'
import { renderRoute } from '@/test/renderRoute'

describe('saved jobs', () => {
  const job = (position: string) =>
    within(screen.getByRole('button', { name: position }).closest('tr')!)
  const positions = () =>
    screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('button')[0]!.textContent)

  it('adds the first job from the empty state with all details', async () => {
    renderRoute('/jobs')
    fireEvent.click(await screen.findByRole('button', { name: 'Add your first job' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Add job' }))
    fireEvent.change(drawer.getByRole('textbox', { name: 'Position *' }), {
      target: { value: 'Frontend Engineer' },
    })
    fireEvent.change(drawer.getByRole('textbox', { name: 'Company *' }), {
      target: { value: 'Acme' },
    })
    fireEvent.change(drawer.getByRole('combobox', { name: 'Type' }), {
      target: { value: 'remote' },
    })
    fireEvent.change(drawer.getByRole('textbox', { name: 'Location' }), {
      target: { value: 'Sofia' },
    })
    fireEvent.change(drawer.getByRole('textbox', { name: 'Salary' }), {
      target: { value: '4000 EUR' },
    })
    fireEvent.change(drawer.getByRole('textbox', { name: 'Contact person' }), {
      target: { value: 'Maria, HR' },
    })
    fireEvent.click(drawer.getByRole('button', { name: 'Add job' }))

    expect(await screen.findByRole('button', { name: 'Frontend Engineer' })).toBeDefined()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect([...fake.current.jobs.values()][0]).toMatchObject({
      position: 'Frontend Engineer',
      company: 'Acme',
      status: 'to_apply',
      type: 'remote',
      location: 'Sofia',
      salary: '4000 EUR',
      contact: 'Maria, HR',
      dateSaved: localToday(),
      dateApplied: null,
    })
  })

  it('opens the Add job form from the Dashboard', async () => {
    renderRoute('/')
    fireEvent.click(screen.getByRole('link', { name: 'Add job' }))
    expect(await screen.findByRole('dialog', { name: 'Add job' })).toBeDefined()
  })

  it('fills in "Date applied" when the status changes in the table', async () => {
    const saved = fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme' })
    renderRoute('/jobs')
    await screen.findByRole('button', { name: 'Frontend Engineer' })
    fireEvent.change(
      job('Frontend Engineer').getByRole('combobox', { name: 'Status for Frontend Engineer' }),
      {
        target: { value: 'applied' },
      },
    )
    await waitFor(() =>
      expect(fake.current.jobs.get(saved.id)).toMatchObject({
        status: 'applied',
        dateApplied: localToday(),
      }),
    )
    expect(
      (
        job('Frontend Engineer').getByLabelText(
          'Date applied for Frontend Engineer',
        ) as HTMLInputElement
      ).value,
    ).toBe(localToday())
  })

  it('edits type, date, notes and the linked CV in place', async () => {
    const cv = fake.current.seed('Frontend CV')
    const saved = fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme' })
    renderRoute('/jobs')
    await screen.findByRole('button', { name: 'Frontend Engineer' })
    const row = job('Frontend Engineer')
    fireEvent.change(row.getByRole('combobox', { name: 'Type for Frontend Engineer' }), {
      target: { value: 'hybrid' },
    })
    fireEvent.change(row.getByLabelText('Date applied for Frontend Engineer'), {
      target: { value: '2026-10-02' },
    })
    const notes = row.getByRole('textbox', { name: 'Notes for Frontend Engineer' })
    fireEvent.change(notes, { target: { value: 'Call on Monday' } })
    fireEvent.blur(notes)
    await waitFor(() => expect(row.getByRole('option', { name: 'Frontend CV' })).toBeDefined())
    fireEvent.change(row.getByRole('combobox', { name: 'Resume for Frontend Engineer' }), {
      target: { value: cv.id },
    })
    await waitFor(() =>
      expect(fake.current.jobs.get(saved.id)).toMatchObject({
        type: 'hybrid',
        dateApplied: '2026-10-02',
        notes: 'Call on Monday',
        cvId: cv.id,
      }),
    )
    expect(row.getByRole('link', { name: 'Open Frontend CV' }).getAttribute('href')).toBe(
      `/cvs/${cv.id}/edit`,
    )
  })

  it('searches, filters and sorts', async () => {
    fake.current.seedJob({
      position: 'Frontend Engineer',
      company: 'Zeta',
      type: 'remote',
      dateSaved: '2026-10-03',
    })
    fake.current.seedJob({
      position: 'Backend Developer',
      company: 'Acme',
      status: 'applied',
      type: 'onsite',
      location: 'Plovdiv',
      dateSaved: '2026-10-02',
    })
    fake.current.seedJob({
      position: 'Designer',
      company: 'Mira',
      type: 'remote',
      dateSaved: '2026-10-01',
    })
    renderRoute('/jobs')
    await screen.findByRole('button', { name: 'Designer' })
    expect(positions()).toEqual(['Frontend Engineer', 'Backend Developer', 'Designer'])

    fireEvent.click(screen.getByRole('button', { name: 'Company' }))
    expect(positions()).toEqual(['Backend Developer', 'Designer', 'Frontend Engineer'])
    expect(screen.getByRole('columnheader', { name: 'Company' }).getAttribute('aria-sort')).toBe(
      'ascending',
    )

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search jobs' }), {
      target: { value: 'plovdiv' },
    })
    expect(positions()).toEqual(['Backend Developer'])
    expect(screen.getByText('1 of 3 jobs')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by type' }), {
      target: { value: 'remote' },
    })
    expect(positions()).toEqual(['Designer', 'Frontend Engineer'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), {
      target: { value: 'applied' },
    })
    expect(screen.getByText('No jobs match these filters.')).toBeDefined()
  })

  it('edits all details in the drawer, sending only what changed', async () => {
    const saved = fake.current.seedJob({
      position: 'Frontend Engineer',
      company: 'Acme',
      notes: 'Old',
    })
    const update = vi.spyOn(fake.current.jobsApi, 'update')
    renderRoute('/jobs')
    fireEvent.click(await screen.findByRole('button', { name: 'Frontend Engineer' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Frontend Engineer' }))
    fireEvent.change(drawer.getByRole('textbox', { name: 'Salary' }), {
      target: { value: '5000 EUR' },
    })
    fireEvent.change(drawer.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'interviewing' },
    })
    fireEvent.click(drawer.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(update).toHaveBeenCalledWith(saved.id, {
      salary: '5000 EUR',
      status: 'interviewing',
      dateApplied: localToday(),
    })
    expect(fake.current.jobs.get(saved.id)!.notes).toBe('Old')
  })

  it('creates a tailored copy of the linked CV for the job', async () => {
    const cv = fake.current.seed('Frontend CV')
    const saved = fake.current.seedJob({
      position: 'Frontend Engineer',
      company: 'Acme',
      cvId: cv.id,
    })
    renderRoute('/jobs')
    fireEvent.click(await screen.findByRole('button', { name: 'Frontend Engineer' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Frontend Engineer' }))
    await waitFor(() =>
      expect(drawer.getByRole('button', { name: 'Create tailored copy' })).toHaveProperty(
        'disabled',
        false,
      ),
    )
    fireEvent.click(drawer.getByRole('button', { name: 'Create tailored copy' }))
    expect((await drawer.findByRole('status')).textContent).toContain('Frontend CV – Acme')
    const copy = [...fake.current.cvs.values()].find((c) => c.title === 'Frontend CV – Acme')!
    expect(copy.jobId).toBe(saved.id)
    expect(fake.current.jobs.get(saved.id)!.cvId).toBe(copy.id)
    expect((drawer.getByRole('combobox', { name: 'Resume' }) as HTMLSelectElement).value).toBe(
      copy.id,
    )
  })

  it('opens the details from the edit icon', async () => {
    fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme' })
    renderRoute('/jobs')
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Frontend Engineer at Acme' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Frontend Engineer' }))
    expect(drawer.getByRole('textbox', { name: 'Company *' })).toHaveProperty('value', 'Acme')
  })

  it('deletes a job after confirming', async () => {
    fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme' })
    renderRoute('/jobs')
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Frontend Engineer at Acme' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText(/No saved jobs yet/)).toBeDefined()
    expect(fake.current.jobs.size).toBe(0)
  })

  it('shows the job on tailored CVs in Documents', async () => {
    const saved = fake.current.seedJob({
      position: 'Frontend Engineer',
      company: 'Acme',
      status: 'applied',
    })
    const cv = fake.current.seed('Frontend CV')
    await fake.current.api.duplicate(cv.id, saved.id)
    renderRoute('/documents/cvs')
    expect(await screen.findByText('For Frontend Engineer at Acme')).toBeDefined()
  })
})
