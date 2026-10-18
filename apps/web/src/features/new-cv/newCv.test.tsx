// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/shared/api/client'
import { renderRoute } from '@/test/renderRoute'

describe('create new CV', () => {
  const created = () => [...fake.current.cvs.values()][0]!
  const professions = () => screen.queryByRole('list', { name: 'Professions' })

  it('sends the old /cvs/new/edit address to the wizard', () => {
    const router = renderRoute('/cvs/new/edit')
    expect(router.state.location.pathname).toBe('/cvs/new')
    expect(professions()).not.toBeNull()
  })

  it("creates a CV from the profession's example in a recommended template", async () => {
    const router = renderRoute('/cvs/new')
    fireEvent.click(screen.getByRole('button', { name: /^Designer/ }))
    expect(router.state.location.search).toBe('?profession=designer')

    const recommended = within(screen.getByRole('region', { name: 'Recommended for Designer' }))
    expect(recommended.getAllByRole('button')).toEqual(
      ['Creative', 'Stylish', 'Contemporary'].map((name) =>
        recommended.getByRole('button', { name: `${name} Recommended` }),
      ),
    )
    fireEvent.click(recommended.getByRole('button', { name: /^Creative/ }))

    expect(screen.getByRole('radio', { name: /Start from an example/ })).toHaveProperty(
      'checked',
      true,
    )
    expect(screen.getByRole('textbox', { name: 'CV name' })).toHaveProperty('value', 'Designer CV')
    fireEvent.click(screen.getByRole('button', { name: 'Create CV' }))

    await waitFor(() => expect(fake.current.cvs.size).toBe(1))
    expect(created()).toMatchObject({
      title: 'Designer CV',
      professionId: 'designer',
      document: { design: { templateId: 'creative', fontFamily: 'Montserrat' } },
    })
    expect(created().document.header.name).not.toBe('')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/cvs/${created().id}/edit`))
    expect(await screen.findByDisplayValue('Designer CV')).toBeDefined()
  })

  it('creates one CV when Create CV is clicked twice quickly', async () => {
    renderRoute('/cvs/new?profession=designer&template=creative')
    const button = screen.getByRole('button', { name: 'Create CV' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(fake.current.cvs.size).toBeGreaterThan(0))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(fake.current.cvs.size).toBe(1)
  })

  it('starts blank with a custom name and language', async () => {
    renderRoute('/cvs/new')
    fireEvent.click(screen.getByRole('button', { name: /^Healthcare/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Timeline/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Start blank/ }))
    fireEvent.change(screen.getByRole('textbox', { name: 'CV name' }), {
      target: { value: 'Hospital CV' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'CV language' }), {
      target: { value: 'bg' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create CV' }))

    await waitFor(() => expect(fake.current.cvs.size).toBe(1))
    const { title, professionId, document } = created()
    expect({ title, professionId, language: document.language }).toEqual({
      title: 'Hospital CV',
      professionId: 'healthcare',
      language: 'bg',
    })
    expect(document.design.templateId).toBe('timeline')
    expect(document.header.name).toBe('')
    expect(document.sections.map((s) => s.type)).toEqual([
      'summary',
      'experience',
      'education',
      'certificates',
      'skills',
      'languages',
    ])
  })

  it('offers every template and a blank start for "Other"', async () => {
    renderRoute('/cvs/new')
    fireEvent.click(screen.getByRole('button', { name: /^Other/ }))
    const all = within(screen.getByRole('region', { name: 'All templates' }))
    expect(all.getAllByRole('button')).toHaveLength(8)
    expect(screen.queryByText('Recommended')).toBeNull()
    fireEvent.click(all.getByRole('button', { name: 'Compact' }))

    expect(screen.queryByRole('radio', { name: /Start from an example/ })).toBeNull()
    expect(screen.getByRole('radio', { name: /Start blank/ })).toHaveProperty('checked', true)
    fireEvent.click(screen.getByRole('button', { name: 'Create CV' }))
    await waitFor(() => expect(fake.current.cvs.size).toBe(1))
    expect(created()).toMatchObject({ title: 'Untitled CV', professionId: null })
    expect(created().document.design.templateId).toBe('compact')
  })

  it('goes back with the Back button and the steps', () => {
    const router = renderRoute('/cvs/new?profession=academic&template=timeline')
    expect(screen.getByRole('button', { name: 'Create CV' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /^Template · Timeline/ }))
    expect(router.state.location.search).toBe('?profession=academic')
    expect(
      screen.getByRole('region', { name: 'Recommended for Academic & Research' }),
    ).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(router.state.location.search).toBe('')
    expect(professions()).not.toBeNull()
  })

  it('shows why a CV could not be created and stays on the page', async () => {
    vi.spyOn(fake.current.api, 'create').mockRejectedValueOnce(
      new ApiRequestError(403, 'plan_limit', 'The free plan allows up to 20 CVs'),
    )
    const router = renderRoute('/cvs/new?profession=designer&template=stylish')
    fireEvent.click(screen.getByRole('button', { name: 'Create CV' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'You have reached the limit of your plan.',
    )
    expect(router.state.location.pathname).toBe('/cvs/new')
    expect(fake.current.cvs.size).toBe(0)
  })

  it('marks recommended templates in the editor for CVs with a profession', async () => {
    const cv = fake.current.seed('Nurse CV', 'healthcare')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Nurse CV')
    fireEvent.click(screen.getByRole('button', { name: 'Templates' }))
    const list = within(await screen.findByRole('list', { name: 'Templates' }))
    expect(list.getByRole('button', { name: 'Timeline Recommended' })).toBeDefined()
    expect(list.getByRole('button', { name: 'Compact' })).toBeDefined()
  })
})
