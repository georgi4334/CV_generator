// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { page } from '@/test/appHelpers'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePrintJob } from '@/features/print/printCv'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { renderRoute } from '@/test/renderRoute'

describe('download and share', () => {
  const print = vi.fn()
  const writeText = vi.fn(async () => {})
  const printed = () => usePrintJob.getState().job

  beforeEach(() => {
    print.mockReset()
    writeText.mockClear()
    vi.spyOn(window, 'print').mockImplementation(print)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    usePrintJob.setState({ job: null })
  })
  afterEach(() => vi.restoreAllMocks())

  const openShareDialog = async (button = 'Share link') => {
    fireEvent.click(screen.getByRole('button', { name: button }))
    const dialog = within(await screen.findByRole('dialog', { name: /^Share/ }))
    await dialog.findByRole('switch')
    return dialog
  }

  it('downloads the CV from the editor with the latest edits', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')
    const name = page().getByRole('textbox', { name: 'Your Name' })
    name.textContent = 'Maria Unsaved'
    fireEvent.input(name)

    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(printed()).toMatchObject({ title: 'Frontend CV' })
    expect(printed()!.doc).toMatchObject({ kind: 'cv', cv: { header: { name: 'Maria Unsaved' } } })
    expect(useEditorUi.getState().notice).toContain('Save as PDF')
    await waitFor(() => expect(print).toHaveBeenCalledOnce())
    expect(screen.getByTestId('print-root').textContent).toContain('Maria Unsaved')
  })

  it('turns a share link on, copies, replaces and turns it off', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/edit`)
    await screen.findByDisplayValue('Frontend CV')
    const dialog = await openShareDialog()

    const toggle = dialog.getByRole('switch', { name: 'Share a read-only link' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(dialog.queryByRole('textbox', { name: 'Share link' })).toBeNull()

    fireEvent.click(toggle)
    const input = await dialog.findByRole('textbox', { name: 'Share link' })
    const first = (input as HTMLInputElement).value
    const slug = fake.current.shares.get(cv.id)!.slug
    expect(first).toBe(`${window.location.origin}/s/${slug}`)
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(dialog.getByRole('button', { name: 'Copy' }))
    await dialog.findByRole('button', { name: 'Copied' })
    expect(writeText).toHaveBeenCalledWith(first)

    fireEvent.click(dialog.getByRole('button', { name: 'Replace link' }))
    await waitFor(() =>
      expect(
        (dialog.getByRole('textbox', { name: 'Share link' }) as HTMLInputElement).value,
      ).not.toBe(first),
    )

    fireEvent.click(toggle)
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'))
    expect(dialog.queryByRole('textbox', { name: 'Share link' })).toBeNull()
    expect(fake.current.shares.get(cv.id)!.isActive).toBe(false)

    fireEvent.click(dialog.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('downloads and shares from the Documents list and marks shared CVs', async () => {
    const one = fake.current.seed('Frontend CV')
    fake.current.seed('Backend CV')
    renderRoute('/documents/cvs')
    await screen.findByRole('link', { name: 'Frontend CV' })
    const row = () => within(screen.getByRole('link', { name: 'Frontend CV' }).closest('li')!)

    fireEvent.click(row().getByRole('button', { name: 'Actions for Frontend CV' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Download PDF' }))
    await waitFor(() => expect(printed()?.title).toBe('Frontend CV'))
    expect(printed()!.doc).toEqual({ kind: 'cv', cv: one.document })

    expect(row().queryByText('Shared')).toBeNull()
    fireEvent.click(row().getByRole('button', { name: 'Actions for Frontend CV' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Share link' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Share “Frontend CV”' }))
    fireEvent.click(await dialog.findByRole('switch'))
    await dialog.findByRole('textbox', { name: 'Share link' })
    fireEvent.click(dialog.getByRole('button', { name: 'Done' }))
    expect(row().getByText('Shared')).toBeDefined()
  })

  it('downloads from the selection only when one CV is selected', async () => {
    fake.current.seed('Frontend CV')
    fake.current.seed('Backend CV')
    renderRoute('/documents/cvs')
    await screen.findByRole('link', { name: 'Frontend CV' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }))
    const toolbar = within(screen.getByRole('toolbar', { name: 'Selected documents' }))
    expect(toolbar.getByRole('button', { name: 'Download' })).toHaveProperty('disabled', true)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Backend CV' }))
    fireEvent.click(toolbar.getByRole('button', { name: 'Download' }))
    await waitFor(() => expect(printed()?.title).toBe('Frontend CV'))
  })

  it('shows a shared CV to anyone with the link, read-only', async () => {
    const cv = fake.current.seed('Frontend CV')
    const { link } = await fake.current.api.setShare(cv.id, true)
    renderRoute(`/s/${link!.slug}`)

    expect(await screen.findByRole('heading', { name: 'Frontend CV' })).toBeDefined()
    expect(page().getByText(cv.document.header.name)).toBeDefined()
    expect(page().queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull()
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(printed()).toMatchObject({ title: 'Frontend CV' })
  })

  it('explains a link that was turned off', async () => {
    const cv = fake.current.seed('Frontend CV')
    const { link } = await fake.current.api.setShare(cv.id, true)
    await fake.current.api.setShare(cv.id, false)
    renderRoute(`/s/${link!.slug}`)
    expect(await screen.findByRole('heading', { name: 'This link does not work' })).toBeDefined()
    expect(screen.queryByText(cv.document.header.name)).toBeNull()
  })

  it('downloads and shares from the preview page', async () => {
    const cv = fake.current.seed('Frontend CV')
    renderRoute(`/cvs/${cv.id}/preview`)
    await screen.findByText('Preview · Frontend CV')
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(printed()).toMatchObject({ title: 'Frontend CV' })
    await openShareDialog('Share')
  })
})
