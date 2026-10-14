import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCvEditor } from './features/editor/cvEditorStore'
import { ApiRequestError } from './lib/api'
import { useSaveState } from './features/editor/editorSession'
import { useEditorUi } from './stores/editorUi'
import type { FakeCvApi } from './test/fakeCvApi'
import { renderRoute } from './test/renderRoute'

const fake = vi.hoisted(() => ({ current: null as unknown as FakeCvApi }))

vi.mock('./lib/cvApi', async () => {
  const { createFakeCvApi } = await import('./test/fakeCvApi')
  fake.current = createFakeCvApi()
  return { cvApi: fake.current.api }
})

vi.mock('./lib/useHealth', () => ({
  useHealth: () => ({
    isLoading: false,
    isError: false,
    data: { status: 'ok', database: 'up', timestamp: '2026-10-13T10:00:00Z' },
  }),
}))

beforeEach(() => {
  fake.current.reset()
  useEditorUi.setState({ activePanel: null, notice: null, previewVersionId: null })
  useCvEditor.setState({ docId: null, cv: null, past: [], future: [] })
  useSaveState.setState({ status: 'saved', lastSavedAt: null, error: null })
})

const page = () => within(screen.getByRole('document', { name: 'CV' }))
const SAVE_TIMEOUT = { timeout: 4000 }

describe('main navigation', () => {
  it('shows the three main tabs', () => {
    renderRoute('/')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Dashboard', 'Documents', 'Saved Jobs'])
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeDefined()
  })

  it('redirects /documents to the All documents sub-tab', () => {
    const router = renderRoute('/documents')
    expect(router.state.location.pathname).toBe('/documents/all')
  })

  it('redirects an unknown documents sub-tab', () => {
    const router = renderRoute('/documents/unknown')
    expect(router.state.location.pathname).toBe('/documents/all')
  })

  it('shows the Saved Jobs table with every column', () => {
    renderRoute('/jobs')
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Position',
      'Company',
      'Status',
      'Date saved',
      'Date applied',
      'Type',
      'Resume',
      'Cover letter',
      'Notes',
    ])
  })
})

describe('documents', () => {
  it('lists saved CVs on the CVs tab and cover letters on their own tab', async () => {
    fake.current.seed('Frontend CV')
    renderRoute('/documents/cvs')
    expect(await screen.findByRole('link', { name: 'Frontend CV' })).toBeDefined()
    expect(screen.queryByText('Cover letter – general')).toBeNull()
  })

  it('shows only cover letters on the Cover letters tab', async () => {
    fake.current.seed('Frontend CV')
    renderRoute('/documents/cover-letters')
    expect(await screen.findByText('Cover letter – general')).toBeDefined()
    expect(screen.queryByText('Frontend CV')).toBeNull()
  })

  it('offers CV or cover letter from "Create new" on All documents', () => {
    renderRoute('/documents/all')
    fireEvent.click(screen.getByRole('button', { name: /create new/i }))
    const menu = screen.getByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((m) => m.textContent),
    ).toEqual(['CV', 'Cover letter'])
    expect(within(menu).getByRole('menuitem', { name: 'CV' }).getAttribute('href')).toBe('/cvs/new')
  })

  it('searches and sorts by name', async () => {
    fake.current.seed('Zebra CV')
    fake.current.seed('Apple CV')
    renderRoute('/documents/cvs')
    await screen.findByRole('link', { name: 'Apple CV' })
    const names = () =>
      within(screen.getByRole('list', { name: 'Documents' }))
        .getAllByRole('link')
        .map((l) => l.textContent)
    expect(names()).toEqual(['Apple CV', 'Zebra CV']) // newest first
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
      target: { value: 'name' },
    })
    expect(names()).toEqual(['Apple CV', 'Zebra CV'])
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search documents' }), {
      target: { value: 'zeb' },
    })
    expect(names()).toEqual(['Zebra CV'])
  })

  it('renames a CV from its menu', async () => {
    const cv = fake.current.seed('Old name')
    renderRoute('/documents/cvs')
    fireEvent.click(await screen.findByRole('button', { name: 'Actions for Old name' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    const input = screen.getByRole('textbox', { name: 'New name for Old name' })
    fireEvent.change(input, { target: { value: 'New name' } })
    fireEvent.blur(input)
    await waitFor(() => expect(fake.current.cvs.get(cv.id)!.title).toBe('New name'))
    expect(await screen.findByRole('link', { name: 'New name' })).toBeDefined()
  })

  it('copies a CV from its menu', async () => {
    fake.current.seed('Frontend CV')
    renderRoute('/documents/cvs')
    fireEvent.click(await screen.findByRole('button', { name: 'Actions for Frontend CV' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy' }))
    expect(await screen.findByRole('link', { name: 'Copy of Frontend CV' })).toBeDefined()
  })

  it('asks before deleting, then deletes', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute('/documents/cvs')
    fireEvent.click(await screen.findByRole('button', { name: 'Actions for Frontend CV' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(screen.getByText('Delete this CV?')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(fake.current.cvs.has(cv.id)).toBe(false))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Frontend CV' })).toBeNull())
  })

  it('selects all and deletes them together', async () => {
    fake.current.seed('One')
    fake.current.seed('Two')
    renderRoute('/documents/cvs')
    await screen.findByRole('link', { name: 'One' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }))
    const toolbar = screen.getByRole('toolbar', { name: 'Selected documents' })
    expect(within(toolbar).getByText('2 selected')).toBeDefined()
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Delete' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(fake.current.cvs.size).toBe(0))
  })

  it('invites to create a first CV when there are none', async () => {
    renderRoute('/documents/cvs')
    expect(await screen.findByRole('link', { name: 'Create your first CV' })).toBeDefined()
  })
})

describe('editor', () => {
  it('loads the CV from the API', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    expect(await screen.findByDisplayValue('Frontend CV')).toBeDefined()
    expect(page().getByText(cv.document.header.name)).toBeDefined()
  })

  it('opens and switches the side panels', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')
    fireEvent.click(screen.getByRole('button', { name: 'Templates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Design & Font' }))
    expect(screen.queryByRole('complementary', { name: 'Templates' })).toBeNull()
    expect(screen.getByRole('complementary', { name: 'Design & Font' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Close Design & Font' }))
    expect(screen.queryByRole('complementary', { name: 'Design & Font' })).toBeNull()
  })

  it('explains features that are not built yet', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')
    fireEvent.click(screen.getByRole('button', { name: 'Fix Mistakes' }))
    expect(useEditorUi.getState().notice).toContain('Step 16')
  })

  it('saves edits automatically and shows "Saved"', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')
    const name = page().getByRole('textbox', { name: 'Your Name' })
    name.textContent = 'Maria'
    fireEvent.input(name)
    expect(await screen.findByText('Saving…')).toBeDefined()
    await waitFor(
      () => expect(fake.current.cvs.get(cv.id)!.document.header.name).toBe('Maria'),
      SAVE_TIMEOUT,
    )
    expect(fake.current.cvs.get(cv.id)!.revision).toBe(2)
    expect(await screen.findByText('Saved')).toBeDefined()
  })

  it('undo restores the text and is saved too', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')
    const name = page().getByRole('textbox', { name: 'Your Name' })
    const original = cv.document.header.name
    name.textContent = 'Maria'
    fireEvent.input(name)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(useCvEditor.getState().cv?.header.name).toBe(original)
    expect(name.textContent).toBe(original)
  })

  it('renames the CV from the top bar', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    const title = await screen.findByRole('textbox', { name: 'Document title' })
    fireEvent.focus(title)
    fireEvent.change(title, { target: { value: 'Backend CV' } })
    fireEvent.blur(title)
    await waitFor(() => expect(fake.current.cvs.get(cv.id)!.title).toBe('Backend CV'))
  })

  it('shows a conflict when another tab saved first, and can keep this version', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')
    // Another tab saves a different document.
    await fake.current.api.update(cv.id, {
      revision: 1,
      document: { ...cv.document, header: { ...cv.document.header, name: 'Other tab' } },
    })

    const name = page().getByRole('textbox', { name: 'Your Name' })
    name.textContent = 'This tab'
    fireEvent.input(name)
    const banner = await screen.findByRole('alert', {}, SAVE_TIMEOUT)
    expect(banner.textContent).toContain('changed in another tab')

    fireEvent.click(within(banner).getByRole('button', { name: 'Keep my version' }))
    await waitFor(
      () => expect(fake.current.cvs.get(cv.id)!.document.header.name).toBe('This tab'),
      SAVE_TIMEOUT,
    )
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('saves a named version, previews it and restores it', async () => {
    const cv = fake.current.seed('Frontend CV')
    const original = cv.document.header.name
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')

    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Version name' }), {
      target: { value: 'Sent to Acme' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    const version = await screen.findByRole('button', { name: /Sent to Acme/ })

    const name = page().getByRole('textbox', { name: 'Your Name' })
    name.textContent = 'Changed'
    fireEvent.input(name)
    await waitFor(
      () => expect(fake.current.cvs.get(cv.id)!.document.header.name).toBe('Changed'),
      SAVE_TIMEOUT,
    )

    fireEvent.click(version)
    const preview = await screen.findByRole('region', { name: 'Version preview' })
    const restore = within(preview).getByRole('button', { name: 'Restore this version' })
    await waitFor(() => expect((restore as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(restore)
    await waitFor(() => expect(fake.current.cvs.get(cv.id)!.document.header.name).toBe(original))
    await waitFor(() => expect(useCvEditor.getState().cv?.header.name).toBe(original))
    expect(screen.queryByRole('region', { name: 'Version preview' })).toBeNull()
  })

  it('adds an entry from the entry toolbar', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')
    const experience = useCvEditor.getState().cv!.sections.find((s) => s.type === 'experience')!
    const before = 'items' in experience ? experience.items.length : 0
    fireEvent.click(screen.getAllByRole('button', { name: 'Add entry below' })[0]!)
    const after = useCvEditor.getState().cv!.sections.find((s) => s.id === experience.id)!
    expect('items' in after && after.items.length).toBe(before + 1)
  })

  it('does not show editing controls in preview', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/preview`)
    await screen.findByText(`Preview · Frontend CV`)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryAllByRole('toolbar')).toHaveLength(0)
  })

  it('shows "Page not found" for an unknown CV', async () => {
    renderRoute('/cvs/00000000-0000-4000-8000-999999999999/edit')
    expect(await screen.findByText('Page not found')).toBeDefined()
  })
})

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
      'The free plan allows up to 20 CVs',
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
