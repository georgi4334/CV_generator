// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fake } from '@/test/fakeHolders'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/renderRoute'

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

  it('shows the Saved Jobs table with every column', async () => {
    fake.current.seedJob({ position: 'Frontend Engineer', company: 'Acme' })
    renderRoute('/jobs')
    await screen.findByRole('button', { name: 'Frontend Engineer' })
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
      'Actions',
    ])
  })
})
