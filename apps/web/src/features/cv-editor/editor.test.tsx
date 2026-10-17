// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { page, SAVE_TIMEOUT } from '@/test/appHelpers'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { renderRoute } from '@/test/renderRoute'

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

  it('changes how skills look from the section toolbar', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')
    fireEvent.click(page().getByRole('button', { name: 'Skills style' }))
    const styles = screen.getByRole('dialog', { name: 'Skills style' })
    fireEvent.click(within(styles).getByLabelText('Pills'))
    const skills = useCvEditor.getState().cv!.sections.find((s) => s.type === 'skills')!
    expect(skills.type === 'skills' && skills.levelDisplay).toBe('pills')
    expect(screen.queryByRole('dialog', { name: 'Skills style' })).toBeNull()
  })

  it('zooms the page and fits it back to the screen', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')
    const zoom = screen.getByRole('group', { name: 'Page zoom' })
    expect(within(zoom).getByText('100%')).toBeDefined()
    fireEvent.click(within(zoom).getByRole('button', { name: 'Zoom out' }))
    expect(within(zoom).getByText('90%')).toBeDefined()
    fireEvent.change(within(zoom).getByRole('slider', { name: 'Page zoom' }), {
      target: { value: '55' },
    })
    expect(within(zoom).getByText('55%')).toBeDefined()
    fireEvent.click(within(zoom).getByRole('button', { name: 'Zoom in' }))
    expect(within(zoom).getByText('60%')).toBeDefined()
    fireEvent.click(within(zoom).getByRole('button', { name: 'Fit to screen' }))
    expect(within(zoom).getByText('100%')).toBeDefined()
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
