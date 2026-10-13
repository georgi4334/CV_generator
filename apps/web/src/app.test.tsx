import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCvEditor } from './features/editor/cvEditorStore'
import { useEditorUi } from './stores/editorUi'
import { renderRoute } from './test/renderRoute'

vi.mock('./lib/useHealth', () => ({
  useHealth: () => ({
    isLoading: false,
    isError: false,
    data: { status: 'ok', database: 'up', timestamp: '2026-10-13T10:00:00Z' },
  }),
}))

beforeEach(() => useEditorUi.setState({ activePanel: null, notice: null }))

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
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual([
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

describe('documents sub-tabs', () => {
  it('lists only cover letters on the Cover letters tab', () => {
    renderRoute('/documents/cover-letters')
    expect(screen.queryByText('Software Developer CV')).toBeNull()
    expect(screen.getByText('Cover letter – general')).toBeDefined()
  })

  it('lists only CVs on the CVs tab', () => {
    renderRoute('/documents/cvs')
    expect(screen.getByText('Software Developer CV')).toBeDefined()
    expect(screen.queryByText('Cover letter – general')).toBeNull()
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
  })
})

describe('editor', () => {
  it('renders the CV from mock data', () => {
    renderRoute('/cvs/cv-1/edit')
    expect(
      within(screen.getByRole('document', { name: 'CV' })).getByText('Alex Petrov'),
    ).toBeDefined()
    expect(screen.getByRole('navigation', { name: 'Editor tools' })).toBeDefined()
  })

  it('opens and closes the Design & Font panel', () => {
    renderRoute('/cvs/cv-1/edit')
    fireEvent.click(screen.getByRole('button', { name: 'Design & Font' }))
    expect(screen.getByRole('complementary', { name: 'Design & Font' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Close Design & Font' }))
    expect(screen.queryByRole('complementary', { name: 'Design & Font' })).toBeNull()
  })

  it('switches between panels', () => {
    renderRoute('/cvs/cv-1/edit')
    fireEvent.click(screen.getByRole('button', { name: 'Templates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Design & Font' }))
    expect(screen.queryByRole('complementary', { name: 'Templates' })).toBeNull()
    expect(screen.getByRole('complementary', { name: 'Design & Font' })).toBeDefined()
  })

  it('explains features that are not built yet', () => {
    renderRoute('/cvs/cv-1/edit')
    fireEvent.click(screen.getByRole('button', { name: 'Rearrange' }))
    expect(screen.getByRole('status').textContent).toContain('Step 6')
  })

  it('opens a blank CV for /cvs/new/edit', () => {
    renderRoute('/cvs/new/edit')
    const name = within(screen.getByRole('document', { name: 'CV' })).getByRole('textbox', {
      name: 'Your Name',
    })
    expect(name.textContent).toBe('')
  })

  it('edits text in place and undoes it', () => {
    renderRoute('/cvs/new/edit')
    const page = within(screen.getByRole('document', { name: 'CV' }))
    const name = page.getByRole('textbox', { name: 'Your Name' })

    name.textContent = 'Maria'
    fireEvent.input(name)
    expect(useCvEditor.getState().cv?.header.name).toBe('Maria')

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(useCvEditor.getState().cv?.header.name).toBe('')
    expect(name.textContent).toBe('')
  })

  it('adds an entry from the entry toolbar', () => {
    renderRoute('/cvs/new/edit')
    const experience = useCvEditor.getState().cv!.sections.find((s) => s.type === 'experience')!
    const before = 'items' in experience ? experience.items.length : 0
    fireEvent.click(screen.getAllByRole('button', { name: 'Add entry below' })[0]!)
    const after = useCvEditor.getState().cv!.sections.find((s) => s.id === experience.id)!
    expect('items' in after && after.items.length).toBe(before + 1)
  })

  it('does not show editing controls in preview', () => {
    renderRoute('/cvs/cv-1/preview')
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryAllByRole('toolbar')).toHaveLength(0)
  })

  it('shows "Page not found" for an unknown document', () => {
    renderRoute('/cvs/does-not-exist/edit')
    expect(screen.getByText('Page not found')).toBeDefined()
  })
})
