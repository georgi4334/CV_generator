import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ErrorPage } from './ErrorPage'
import { NotFoundPage } from './NotFoundPage'

function Crash(): never {
  throw new Error('boom')
}

const routes = [
  { path: '/', element: <h1>Dashboard</h1> },
  { path: '/crash', element: <Crash />, errorElement: <ErrorPage /> },
  { path: '*', element: <NotFoundPage /> },
]

describe('not found page', () => {
  it('opened directly: offers the dashboard, without "Go back"', () => {
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/nope'] })} />)
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Go to dashboard' }).getAttribute('href')).toBe('/')
    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull()
  })

  it('reached from another page: "Go back" returns there', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    render(<RouterProvider router={router} />)
    await act(() => router.navigate('/broken-link'))
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeDefined()
  })
})

describe('error page', () => {
  it('offers to reload or to go to the dashboard', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/crash'] })} />)
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Go to dashboard' }).getAttribute('href')).toBe('/')
    vi.restoreAllMocks()
  })
})
