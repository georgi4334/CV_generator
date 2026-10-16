// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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
