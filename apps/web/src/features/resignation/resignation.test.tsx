// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { SAVE_TIMEOUT } from '@/test/appHelpers'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HIDDEN_PERSONAL } from '@cv/shared'
import { QueryClient } from '@tanstack/react-query'
import { resetClientState } from '@/features/auth/sessionState'
import { useResignationEditor } from '@/features/resignation/state/resignationEditorStore'
import { usePrintJob } from '@/features/print/printCv'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { renderRoute } from '@/test/renderRoute'

const letterPage = () => within(screen.getByRole('document', { name: 'Resignation letter' }))
const created = () => [...fake.current.resignations.values()][0]!
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } })

describe('resignation letters', () => {
  beforeEach(() => usePrintJob.setState({ job: null }))
  afterEach(() => vi.restoreAllMocks())

  it('is offered from Documents, not from the dashboard', async () => {
    fake.current.seed('Frontend CV')
    renderRoute('/')
    await screen.findByRole('link', { name: 'New cover letter' })
    expect(screen.queryByRole('link', { name: /resignation/i })).toBeNull()

    cleanup()
    renderRoute('/documents/resignations')
    const create = await screen.findByRole('link', { name: 'Create new resignation letter' })
    expect(create.getAttribute('href')).toBe('/resignations/new')
  })

  it('lists resignation letters on their tab and on All, with their own badge', async () => {
    fake.current.seed('Frontend CV')
    fake.current.seedResignation('Leaving Pixel & Pine')
    renderRoute('/documents/resignations')
    expect(await screen.findByText('Leaving Pixel & Pine')).toBeDefined()
    expect(screen.queryByText('Frontend CV')).toBeNull()

    cleanup()
    renderRoute('/documents/all')
    await screen.findAllByText('Leaving Pixel & Pine')
    const icon = document.querySelector<HTMLElement>('[data-doc-type="resignation"]')
    expect(icon).not.toBeNull()
    const cvIcon = document.querySelector<HTMLElement>('[data-doc-type="cv"]')!
    expect(icon!.className).not.toBe(cvIcon.className)
  })

  it('shows a recent resignation letter on the dashboard', async () => {
    fake.current.seedResignation('Leaving Pixel & Pine')
    renderRoute('/')
    expect(await screen.findByRole('link', { name: /Leaving Pixel & Pine/ })).toBeDefined()
  })

  it('creates a letter from the form: sender, employer, subject and date', async () => {
    const router = renderRoute('/resignations/new')
    await screen.findByRole('heading', { name: 'Create a resignation letter' })
    type('Name', 'Maria Petrova')
    type('Email', 'maria@example.com')
    type('Phone', '+359 88 123 4567')
    type('Place of residence', '12 Oak Street, Sofia')
    type('Company name', 'Pixel & Pine Ltd')
    type('Contact name', 'Jordan Reyes')
    type('Address', '7 Harbour Road')
    type('Postal code', '1000')
    type('City', 'Sofia')
    type('Subject', 'Resignation – Senior Designer')
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create resignation letter' }))

    await waitFor(() => expect(fake.current.resignations.size).toBe(1))
    const { title, document: doc } = created()
    expect(title).toBe('Resignation – Pixel & Pine Ltd')
    expect(doc).toMatchObject({
      sender: {
        name: 'Maria Petrova',
        email: 'maria@example.com',
        phone: '+359 88 123 4567',
        residence: '12 Oak Street, Sofia',
      },
      employer: {
        company: 'Pixel & Pine Ltd',
        contact: 'Jordan Reyes',
        address: '7 Harbour Road',
        postalCode: '1000',
        city: 'Sofia',
      },
      subject: 'Resignation – Senior Designer',
      date: 'October 15, 2026',
      greeting: 'Dear Jordan Reyes,',
      signature: 'Maria Petrova',
    })
    expect(doc.paragraphs[0]).toContain('Pixel & Pine Ltd')
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/resignations/${created().id}/edit`),
    )
  })

  it('fills the sender and the look in from a CV', async () => {
    const cv = fake.current.seed('Designer CV', 'designer')
    renderRoute('/resignations/new')
    const select = await screen.findByRole('combobox', { name: /Fill in from a CV/ })
    await screen.findByRole('option', { name: 'Designer CV' })
    fireEvent.change(select, { target: { value: cv.id } })
    await waitFor(() =>
      expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe(
        cv.document.header.name,
      ),
    )
    expect((screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement).value).toBe(
      cv.document.header.email,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create resignation letter' }))
    await waitFor(() => expect(fake.current.resignations.size).toBe(1))
    expect(created().document.design).toEqual(cv.document.design)
    expect(created().document.sender.residence).toBe(cv.document.header.location)
  })

  it('creates one letter when the button is clicked twice quickly', async () => {
    renderRoute('/resignations/new')
    const button = await screen.findByRole('button', { name: 'Create resignation letter' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(fake.current.resignations.size).toBeGreaterThan(0))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(fake.current.resignations.size).toBe(1)
  })

  it('edits the letter in place and saves it', async () => {
    const letter = fake.current.seedResignation('Leaving')
    renderRoute(`/resignations/${letter.id}/edit`)
    await screen.findByDisplayValue('Leaving')
    const subject = letterPage().getByRole('textbox', { name: /Subject/ })
    subject.textContent = 'Notice of resignation'
    fireEvent.input(subject)
    await waitFor(
      () =>
        expect(fake.current.resignations.get(letter.id)!.document.subject).toBe(
          'Notice of resignation',
        ),
      SAVE_TIMEOUT,
    )
    expect(fake.current.resignations.get(letter.id)!.revision).toBe(2)
  })

  it('limits how long the fields can be while typing', async () => {
    const letter = fake.current.seedResignation('Leaving')
    renderRoute(`/resignations/${letter.id}/edit`)
    await screen.findByDisplayValue('Leaving')
    const phone = letterPage().getByRole('textbox', { name: 'Your phone' })
    phone.textContent = '9'.repeat(100)
    fireEvent.input(phone)
    await waitFor(
      () =>
        expect(fake.current.resignations.get(letter.id)!.document.sender.phone).toHaveLength(40),
      SAVE_TIMEOUT,
    )
  })

  it('has no templates, sections or AI assistant, but keeps Design & Font and Fix Mistakes', async () => {
    const letter = fake.current.seedResignation('Leaving')
    renderRoute(`/resignations/${letter.id}/edit`)
    await screen.findByDisplayValue('Leaving')
    for (const [button, text] of [
      ['Templates', 'no templates'],
      ['Rearrange', 'no sections to rearrange'],
      ['Check & Tailor', 'works on CVs'],
    ] as const) {
      fireEvent.click(screen.getByRole('button', { name: button }))
      expect(useEditorUi.getState().notice).toContain(text)
    }
    fireEvent.click(screen.getByRole('button', { name: 'AI assistant' }))
    expect(useEditorUi.getState().notice).toContain('Fix Mistakes can proofread')

    fireEvent.click(screen.getByRole('button', { name: 'Design & Font' }))
    expect(screen.getByRole('complementary', { name: 'Design & Font' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Upload photo' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Fix Mistakes' }))
    expect(await screen.findByRole('complementary', { name: 'Fix Mistakes' })).toBeDefined()
  })

  it('downloads, previews and shares a letter', async () => {
    vi.spyOn(window, 'print').mockImplementation(() => {})
    const letter = fake.current.seedResignation('Leaving')
    renderRoute(`/resignations/${letter.id}/preview`)
    await screen.findByRole('document', { name: 'Resignation letter' })
    expect(screen.queryByRole('textbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(usePrintJob.getState().job).toMatchObject({
      doc: { kind: 'resignation' },
      title: 'Leaving',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    const dialog = within(await screen.findByRole('dialog'))
    fireEvent.click(await dialog.findByRole('switch', { name: 'Share a read-only link' }))
    await waitFor(() => expect(fake.current.shares.get(letter.id)?.isActive).toBe(true))
    const { slug } = fake.current.shares.get(letter.id)!

    renderRoute(`/s/${slug}`)
    expect(await screen.findByRole('heading', { name: 'Leaving' })).toBeDefined()
    expect(screen.getAllByRole('document', { name: 'Resignation letter' }).length).toBeGreaterThan(
      0,
    )
  })

  it('blurs the stand-ins and shows no real name on a link that hides personal details', async () => {
    const letter = fake.current.seedResignation('Leaving Pixel & Pine', {})
    const real = letter.document
    real.sender = { ...real.sender, name: 'Maria Petrova', email: 'maria@example.com' }
    const { link } = await fake.current.resignationApi.setShare(letter.id, {
      isActive: true,
      hidePersonal: true,
    })
    renderRoute(`/s/${link!.slug}`)
    expect(await screen.findByRole('heading', { name: 'Shared resignation letter' })).toBeDefined()
    expect(screen.getByText('The owner hid their personal details on this link.')).toBeDefined()
    expect(document.body.textContent).not.toContain('Maria')
    expect(document.body.textContent).not.toContain('Pixel')
    expect(document.body.textContent).not.toContain('Jordan')
    const hidden = screen.getAllByText(HIDDEN_PERSONAL.name)[0]!
    expect(hidden.className).toContain('cv-hidden-personal')
  })

  it('is forgotten when someone signs out, so the next person never sees it', async () => {
    const letter = fake.current.seedResignation('Leaving')
    renderRoute(`/resignations/${letter.id}/edit`)
    await screen.findByDisplayValue('Leaving')
    expect(useResignationEditor.getState().letter).not.toBeNull()
    resetClientState(new QueryClient(), null)
    expect(useResignationEditor.getState()).toMatchObject({ docId: null, letter: null })
  })

  it('deletes with a confirmation, like other documents', async () => {
    fake.current.seedResignation('Leaving')
    renderRoute('/documents/resignations')
    fireEvent.click(await screen.findByRole('button', { name: 'Actions for Leaving' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Delete this resignation letter?')).toBeDefined()
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(fake.current.resignations.size).toBe(0))
  })
})
