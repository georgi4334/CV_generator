// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { SAVE_TIMEOUT } from '@/test/appHelpers'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLetterEditor } from '@/features/cover-letters/state/letterEditorStore'
import { usePrintJob } from '@/features/print/printCv'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { renderRoute } from '@/test/renderRoute'

describe('cover letters', () => {
  const letterPage = () => within(screen.getByRole('document', { name: 'Cover letter' }))
  const onlyLetter = () => [...fake.current.letters.values()][0]!

  it('creates a letter from a CV, with its header and design', async () => {
    const cv = fake.current.seed('Designer CV', 'designer')
    const router = renderRoute('/documents/cover-letters')
    fireEvent.click(await screen.findByRole('link', { name: /Create new cover letter/ }))
    expect(router.state.location.pathname).toBe('/cover-letters/new')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create cover letter' })).toHaveProperty(
        'disabled',
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create cover letter' }))

    await waitFor(() => expect(fake.current.letters.size).toBe(1))
    expect(onlyLetter()).toMatchObject({ title: 'Cover letter', cvId: cv.id })
    expect(onlyLetter().document.header).toEqual(cv.document.header)
    expect(onlyLetter().document.design).toEqual(cv.document.design)
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/cover-letters/${onlyLetter().id}/edit`),
    )
    expect((await screen.findAllByText(cv.document.header.name)).length).toBeGreaterThan(0)
  })

  it('writes a letter for a saved job from the job details', async () => {
    const cv = fake.current.seed('Frontend CV')
    const job = fake.current.seedJob({
      position: 'Frontend Engineer',
      company: 'Acme',
      cvId: cv.id,
    })
    renderRoute('/jobs')
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Frontend Engineer at Acme' }))
    fireEvent.click(screen.getByRole('link', { name: 'Write a cover letter for this job' }))
    const name = await screen.findByRole('textbox', { name: 'Name' })
    expect((name as HTMLInputElement).value).toBe('Cover letter – Acme')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create cover letter' })).toHaveProperty(
        'disabled',
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create cover letter' }))
    await waitFor(() => expect(fake.current.letters.size).toBe(1))
    expect(onlyLetter()).toMatchObject({ cvId: cv.id, jobId: job.id })
    expect(onlyLetter().document.recipient.company).toBe('Acme')
    expect(fake.current.jobs.get(job.id)!.coverLetterId).toBe(onlyLetter().id)
  })

  it('edits the letter in place and saves it automatically', async () => {
    const letter = fake.current.seedLetter('Letter – Acme')
    renderRoute(`/cover-letters/${letter.id}/edit`)
    await screen.findByDisplayValue('Letter – Acme')
    const greeting = letterPage().getByRole('textbox', { name: 'Dear Hiring Manager,' })
    greeting.textContent = 'Dear Maria,'
    fireEvent.input(greeting)
    await waitFor(
      () => expect(fake.current.letters.get(letter.id)!.document.greeting).toBe('Dear Maria,'),
      SAVE_TIMEOUT,
    )
    expect(fake.current.letters.get(letter.id)!.revision).toBe(2)

    fireEvent.click(letterPage().getByRole('button', { name: 'Add paragraph' }))
    await waitFor(
      () => expect(fake.current.letters.get(letter.id)!.document.paragraphs).toHaveLength(4),
      SAVE_TIMEOUT,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(
      () => expect(fake.current.letters.get(letter.id)!.document.paragraphs).toHaveLength(3),
      SAVE_TIMEOUT,
    )
  })

  it('starts a new paragraph on Enter and moves the cursor into it', async () => {
    const letter = fake.current.seedLetter('Letter')
    renderRoute(`/cover-letters/${letter.id}/edit`)
    await screen.findByDisplayValue('Letter')
    const first = letterPage().getByRole('textbox', { name: /^Opening/ })
    first.focus()
    fireEvent.keyDown(first, { key: 'Enter' })
    await waitFor(() =>
      expect(useLetterEditor.getState().letter!.paragraphs).toEqual(['', '', '', '']),
    )
    await waitFor(() =>
      expect(document.activeElement?.getAttribute('data-path')).toBe('paragraphs.1'),
    )
  })

  it("copies the linked CV's header and design again", async () => {
    const cv = fake.current.seed('Designer CV', 'designer')
    const letter = fake.current.seedLetter('Letter', { cvId: cv.id })
    renderRoute(`/cover-letters/${letter.id}/edit`)
    await screen.findByDisplayValue('Letter')
    await waitFor(() =>
      expect((screen.getByRole('combobox', { name: 'Linked CV' }) as HTMLSelectElement).value).toBe(
        cv.id,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: "Use CV's header & design" }))
    await waitFor(
      () =>
        expect(fake.current.letters.get(letter.id)!.document).toMatchObject({
          header: cv.document.header,
          design: cv.document.design,
          signature: cv.document.header.name,
        }),
      SAVE_TIMEOUT,
    )
  })

  it('changes template and font with the same panels as CVs', async () => {
    const letter = fake.current.seedLetter('Letter')
    renderRoute(`/cover-letters/${letter.id}/edit`)
    await screen.findByDisplayValue('Letter')
    fireEvent.click(screen.getByRole('button', { name: 'Templates' }))
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Templates' })).getByRole('button', {
        name: 'Creative',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Design & Font' }))
    expect(screen.queryByRole('radiogroup', { name: /Column layout/i })).toBeNull()
    await waitFor(
      () =>
        expect(fake.current.letters.get(letter.id)!.document.design).toMatchObject({
          templateId: 'creative',
          fontFamily: 'Montserrat',
        }),
      SAVE_TIMEOUT,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Rearrange' }))
    expect(useEditorUi.getState().notice).toContain('no sections to rearrange')
  })

  it('downloads, shares and shows a shared letter read-only', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    usePrintJob.setState({ job: null })
    const letter = fake.current.seedLetter('Letter – Acme')
    renderRoute(`/cover-letters/${letter.id}/edit`)
    await screen.findByDisplayValue('Letter – Acme')
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(usePrintJob.getState().job).toMatchObject({
      title: 'Letter – Acme',
      doc: { kind: 'coverLetter' },
    })
    await waitFor(() => expect(print).toHaveBeenCalled())
    print.mockRestore()

    fireEvent.click(screen.getByRole('button', { name: 'Share link' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Share “Letter – Acme”' }))
    fireEvent.click(await dialog.findByRole('switch'))
    await dialog.findByRole('textbox', { name: 'Share link' })
    const slug = fake.current.shares.get(letter.id)!.slug
    cleanup()

    renderRoute(`/s/${slug}`)
    expect(await screen.findByRole('heading', { name: 'Letter – Acme' })).toBeDefined()
    expect(letterPage().getByText('Dear Hiring Manager,')).toBeDefined()
    expect(letterPage().queryByRole('textbox')).toBeNull()
  })

  it('lists, renames, copies and deletes letters in Documents', async () => {
    fake.current.seed('Frontend CV')
    const letter = fake.current.seedLetter('Letter – Acme')
    renderRoute('/documents/all')
    await screen.findByRole('link', { name: 'Letter – Acme' })
    expect(screen.getByRole('link', { name: 'Frontend CV' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Letter – Acme' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy' }))
    expect(await screen.findByRole('link', { name: 'Copy of Letter – Acme' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Letter – Acme' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    const input = screen.getByRole('textbox', { name: 'New name for Letter – Acme' })
    fireEvent.change(input, { target: { value: 'Letter – Northwind' } })
    fireEvent.blur(input)
    await waitFor(() =>
      expect(fake.current.letters.get(letter.id)!.title).toBe('Letter – Northwind'),
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Actions for Letter – Northwind' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    const confirm = within(screen.getByRole('dialog', { name: 'Delete this cover letter?' }))
    fireEvent.click(confirm.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(fake.current.letters.has(letter.id)).toBe(false))
  })

  it('links a cover letter to a job in the table', async () => {
    const letter = fake.current.seedLetter('Letter – Acme')
    const job = fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme' })
    renderRoute('/jobs')
    await screen.findByRole('button', { name: 'Frontend Engineer' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Letter – Acme' })).toBeDefined())
    fireEvent.change(screen.getByRole('combobox', { name: 'Cover letter for Frontend Engineer' }), {
      target: { value: letter.id },
    })
    await waitFor(() => expect(fake.current.jobs.get(job.id)!.coverLetterId).toBe(letter.id))
    expect(screen.getByRole('link', { name: 'Open Letter – Acme' }).getAttribute('href')).toBe(
      `/cover-letters/${letter.id}/edit`,
    )
  })

  it('shows a letter on the preview page', async () => {
    const letter = fake.current.seedLetter('Letter – Acme')
    renderRoute(`/cover-letters/${letter.id}/preview`)
    expect(await screen.findByText('Preview · Letter – Acme')).toBeDefined()
    expect(letterPage().getByText('Dear Hiring Manager,')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDefined()
  })

  it('sends the old new-letter address to the new page', () => {
    const router = renderRoute('/cover-letters/new/edit')
    expect(router.state.location.pathname).toBe('/cover-letters/new')
  })
})
