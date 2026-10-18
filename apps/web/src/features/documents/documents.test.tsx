// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/renderRoute'

describe('documents', () => {
  it('lists saved CVs on the CVs tab and cover letters on their own tab', async () => {
    fake.current.seed('Frontend CV')
    renderRoute('/documents/cvs')
    expect(await screen.findByRole('link', { name: 'Frontend CV' })).toBeDefined()
    expect(screen.queryByText('Cover letter – general')).toBeNull()
  })

  it('shows only cover letters on the Cover letters tab', async () => {
    fake.current.seed('Frontend CV')
    fake.current.seedLetter('Cover letter – general')
    renderRoute('/documents/cover-letters')
    expect(await screen.findByText('Cover letter – general')).toBeDefined()
    expect(screen.queryByText('Frontend CV')).toBeNull()
  })

  it('draws a CV and a cover letter with different icons and colours', async () => {
    fake.current.seed('Frontend CV')
    fake.current.seedLetter('Cover letter – general')
    renderRoute('/documents/all')
    await screen.findByText('Cover letter – general')
    const icons = Array.from(document.querySelectorAll<HTMLElement>('[data-doc-icon]'))
    const cv = icons.find((i) => i.dataset.docType === 'cv')!
    const letter = icons.find((i) => i.dataset.docType === 'coverLetter')!
    expect(cv.className).not.toBe(letter.className)
    expect(cv.className).toContain('teal')
    expect(letter.className).toContain('sky')
    expect(cv.querySelector('svg')!.getAttribute('class')).toContain('lucide-file-user')
    expect(letter.querySelector('svg')!.getAttribute('class')).toContain('lucide-mail')
  })

  it('offers CV, cover letter or resignation letter from "Create new" on All documents', () => {
    renderRoute('/documents/all')
    fireEvent.click(screen.getByRole('button', { name: /create new/i }))
    const menu = screen.getByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((m) => m.textContent),
    ).toEqual(['CV', 'Cover letter', 'Resignation letter'])
    expect(within(menu).getByRole('menuitem', { name: 'CV' }).getAttribute('href')).toBe('/cvs/new')
    expect(
      within(menu).getByRole('menuitem', { name: 'Resignation letter' }).getAttribute('href'),
    ).toBe('/resignations/new')
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

  it('has a row menu you can use with the keyboard: arrows move, Escape closes and returns focus', async () => {
    fake.current.seed('Frontend CV')
    renderRoute('/documents/cvs')
    const button = await screen.findByRole('button', { name: 'Actions for Frontend CV' })
    button.focus()
    fireEvent.keyDown(button, { key: 'ArrowDown' })
    const menu = await screen.findByRole('menu')
    const items = within(menu).getAllByRole('menuitem')
    // Opening moves focus to the first item.
    expect(document.activeElement).toBe(items[0])
    fireEvent.keyDown(items[0]!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])
    fireEvent.keyDown(items[1]!, { key: 'ArrowUp' })
    fireEvent.keyDown(items[0]!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[items.length - 1])
    fireEvent.keyDown(items[items.length - 1]!, { key: 'Home' })
    expect(document.activeElement).toBe(items[0])
    fireEvent.keyDown(items[0]!, { key: 'End' })
    expect(document.activeElement).toBe(items[items.length - 1])

    fireEvent.keyDown(items[items.length - 1]!, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('offers to create the kind of document the empty tab lists', async () => {
    renderRoute('/documents/resignations')
    const link = await screen.findByRole('link', { name: 'Create your first resignation letter' })
    expect(link.getAttribute('href')).toBe('/resignations/new')
    cleanup()
    renderRoute('/documents/cover-letters')
    const letter = await screen.findByRole('link', { name: 'Create your first cover letter' })
    expect(letter.getAttribute('href')).toBe('/cover-letters/new')
    cleanup()
    renderRoute('/documents/all')
    const cv = await screen.findByRole('link', { name: 'Create your first CV' })
    expect(cv.getAttribute('href')).toBe('/cvs/new')
  })

  it('starts the page with a "Skip to content" link to the main content', async () => {
    renderRoute('/documents/all')
    await screen.findByRole('heading', { name: 'Documents' })
    const skip = screen.getByRole('link', { name: 'Skip to content' })
    expect(skip.getAttribute('href')).toBe('#main-content')
    const main = screen.getByRole('main')
    expect(main.id).toBe('main-content')
    // It is the first link in the page.
    expect(document.querySelector('a')).toBe(skip)
    fireEvent.click(skip)
    expect(document.activeElement).toBe(main)
  })
})
