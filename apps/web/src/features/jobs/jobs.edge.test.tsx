// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { JOB_NOTES_MAX, JOB_SALARY_MAX, JOB_TEXT_MAX } from '@cv/shared'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/shared/api/client'
import { localToday } from '@/shared/lib/format'
import { fake } from '@/test/fakeHolders'
import { renderRoute } from '@/test/renderRoute'

let originals: Pick<typeof fake.current.jobsApi, 'create' | 'update' | 'remove'>
beforeEach(() => {
  originals ??= {
    create: fake.current.jobsApi.create,
    update: fake.current.jobsApi.update,
    remove: fake.current.jobsApi.remove,
  }
  Object.assign(fake.current.jobsApi, originals)
})
afterEach(() => vi.restoreAllMocks())

async function openAddForm() {
  renderRoute('/jobs')
  fireEvent.click(await screen.findByRole('button', { name: 'Add your first job' }))
  return within(screen.getByRole('dialog', { name: 'Add job' }))
}
const fill = (drawer: ReturnType<typeof within>, label: string, value: string) =>
  fireEvent.change(drawer.getByRole('textbox', { name: label }), { target: { value } })
const submit = (drawer: ReturnType<typeof within>) =>
  fireEvent.click(drawer.getByRole('button', { name: 'Add job' }))

describe('adding a job: bad input', () => {
  it.each([
    ['only spaces', '   '],
    ['only tabs and newlines', '\t\n '],
  ])('refuses a position of %s and keeps the form open with an error', async (_, position) => {
    const drawer = await openAddForm()
    fill(drawer, 'Position *', position)
    fill(drawer, 'Company *', 'Acme')
    submit(drawer)
    expect((await screen.findByRole('alert')).textContent).toBeTruthy()
    expect(fake.current.jobs.size).toBe(0)
    expect(screen.getByRole('dialog', { name: 'Add job' })).toBeDefined()
  })

  it('refuses a company of only spaces', async () => {
    const drawer = await openAddForm()
    fill(drawer, 'Position *', 'Dev')
    fill(drawer, 'Company *', '     ')
    submit(drawer)
    await screen.findByRole('alert')
    expect(fake.current.jobs.size).toBe(0)
  })

  it('trims spaces around the position and company', async () => {
    const drawer = await openAddForm()
    fill(drawer, 'Position *', '  Frontend Engineer  ')
    fill(drawer, 'Company *', '\tAcme ')
    submit(drawer)
    await waitFor(() => expect(fake.current.jobs.size).toBe(1))
    expect([...fake.current.jobs.values()][0]).toMatchObject({
      position: 'Frontend Engineer',
      company: 'Acme',
    })
  })

  it('limits the length of every text field in the form', async () => {
    const drawer = await openAddForm()
    const max = (label: string) =>
      drawer.getByRole('textbox', { name: label }).getAttribute('maxlength')
    expect(max('Position *')).toBe(String(JOB_TEXT_MAX))
    expect(max('Company *')).toBe(String(JOB_TEXT_MAX))
    expect(max('Location')).toBe(String(JOB_TEXT_MAX))
    expect(max('Contact person')).toBe(String(JOB_TEXT_MAX))
    expect(max('Salary')).toBe(String(JOB_SALARY_MAX))
    expect(max('Notes')).toBe(String(JOB_NOTES_MAX))
  })

  it('shows the server error and keeps everything that was typed, then succeeds on retry', async () => {
    const drawer = await openAddForm()
    fill(drawer, 'Position *', 'Dev')
    fill(drawer, 'Company *', 'Acme')
    fill(drawer, 'Notes', 'Remember to ask about remote work')
    const good = fake.current.jobsApi.create
    fake.current.jobsApi.create = async () => {
      throw new ApiRequestError(null, 'network_error', 'offline')
    }
    submit(drawer)
    expect((await screen.findByRole('alert')).textContent).toBeTruthy()
    expect((drawer.getByRole('textbox', { name: 'Notes' }) as HTMLTextAreaElement).value).toBe(
      'Remember to ask about remote work',
    )
    fake.current.jobsApi.create = good
    submit(drawer)
    await waitFor(() => expect(fake.current.jobs.size).toBe(1))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('creates one job, not two, when the button is clicked again while saving', async () => {
    const drawer = await openAddForm()
    fill(drawer, 'Position *', 'Dev')
    fill(drawer, 'Company *', 'Acme')
    let finish!: () => void
    const good = fake.current.jobsApi.create
    const create = vi.fn(
      (input: Parameters<typeof good>[0]) =>
        new Promise<Awaited<ReturnType<typeof good>>>(
          (resolve) => (finish = () => resolve(good(input))),
        ),
    )
    fake.current.jobsApi.create = create
    submit(drawer)
    const saving = await drawer.findByRole('button', { name: 'Saving…' })
    fireEvent.click(saving)
    fireEvent.click(saving)
    expect((saving as HTMLButtonElement).disabled).toBe(true)
    expect(create).toHaveBeenCalledTimes(1)
    finish()
    await waitFor(() => expect(fake.current.jobs.size).toBe(1))
  })

  it('accepts emoji, right-to-left text and very long (but allowed) values', async () => {
    const drawer = await openAddForm()
    fill(drawer, 'Position *', '👩🏽‍💻 مطور')
    fill(drawer, 'Company *', 'Ä'.repeat(JOB_TEXT_MAX))
    submit(drawer)
    await waitFor(() => expect(fake.current.jobs.size).toBe(1))
    const [job] = [...fake.current.jobs.values()]
    expect(job!.position).toBe('👩🏽‍💻 مطور')
    expect(job!.company).toHaveLength(JOB_TEXT_MAX)
  })

  it('a company longer than the allowed length is refused by the server and shown as an error', async () => {
    const drawer = await openAddForm()
    fill(drawer, 'Position *', 'Dev')
    // fireEvent bypasses the maxLength attribute, like a paste in a browser that ignores it.
    fill(drawer, 'Company *', 'x'.repeat(JOB_TEXT_MAX + 1))
    submit(drawer)
    await screen.findByRole('alert')
    expect(fake.current.jobs.size).toBe(0)
  })

  it('does not set a "date applied" in the future from the form', async () => {
    const drawer = await openAddForm()
    const date = drawer.getByLabelText('Date applied') as HTMLInputElement
    expect(date.max).toBe(localToday())
  })

  it('Cancel discards the form without calling the server', async () => {
    const drawer = await openAddForm()
    fill(drawer, 'Position *', 'Dev')
    fill(drawer, 'Company *', 'Acme')
    fireEvent.click(drawer.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fake.current.jobs.size).toBe(0)
  })
})

describe('editing and deleting a job', () => {
  it('closes without a request when nothing was changed', async () => {
    fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme' })
    const update = vi.spyOn(fake.current.jobsApi, 'update')
    renderRoute('/jobs')
    fireEvent.click(await screen.findByRole('button', { name: 'Frontend Engineer' }))
    const drawer = within(await screen.findByRole('dialog', { name: 'Frontend Engineer' }))
    fireEvent.click(drawer.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(update).not.toHaveBeenCalled()
  })

  it('shows a failed update and keeps the drawer open', async () => {
    fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme' })
    fake.current.jobsApi.update = async () => {
      throw new ApiRequestError(409, 'conflict', 'changed elsewhere')
    }
    renderRoute('/jobs')
    fireEvent.click(await screen.findByRole('button', { name: 'Frontend Engineer' }))
    const drawer = within(await screen.findByRole('dialog', { name: 'Frontend Engineer' }))
    fill(drawer, 'Company *', 'Other Corp')
    fireEvent.click(drawer.getByRole('button', { name: 'Save' }))
    expect((await screen.findByRole('alert')).textContent).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Frontend Engineer' })).toBeDefined()
  })

  it('deleting a job that is already gone shows a message and keeps the app working', async () => {
    const saved = fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme' })
    renderRoute('/jobs')
    fireEvent.click(await screen.findByRole('button', { name: 'Frontend Engineer' }))
    const drawer = within(await screen.findByRole('dialog', { name: 'Frontend Engineer' }))
    fake.current.jobs.delete(saved.id)
    fireEvent.click(drawer.getByRole('button', { name: 'Delete' }))
    const confirm = within(await screen.findByRole('dialog', { name: /^Delete/ }))
    fireEvent.click(confirm.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
  })
})

describe('many jobs', () => {
  it('lists 120 jobs and filters them by status', async () => {
    const statuses = ['to_apply', 'applied', 'rejected', 'no_answer'] as const
    for (let i = 0; i < 120; i++) {
      fake.current.seedJob({
        position: `Role ${i}`,
        company: `Company ${i % 17}`,
        status: statuses[i % statuses.length],
      })
    }
    renderRoute('/jobs')
    expect(await screen.findByText('120 jobs')).toBeDefined()
    expect(screen.getAllByRole('row').length).toBeGreaterThan(120)
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), {
      target: { value: 'rejected' },
    })
    expect(await screen.findByText('30 of 120 jobs')).toBeDefined()
  })

  it('says so when no job matches the filters', async () => {
    fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme' })
    renderRoute('/jobs')
    await screen.findByRole('button', { name: 'Frontend Engineer' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), {
      target: { value: 'accepted' },
    })
    expect(await screen.findByText('No jobs match these filters.')).toBeDefined()
  })
})
