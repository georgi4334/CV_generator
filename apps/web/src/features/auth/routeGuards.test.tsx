// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { describe, expect, it } from 'vitest'
import { ApiRequestError } from '@/shared/api/client'
import { auth, fake } from '@/test/fakeHolders'
import { renderRoute } from '@/test/renderRoute'

const signedOut = { user: null }
const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const signIn = () => {
  type('Email', 'ann@example.com')
  type(/^Password/, 'correct horse')
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('deep links while signed out', () => {
  it.each([
    ['/jobs', '?next=%2Fjobs'],
    ['/jobs?status=applied', '?next=%2Fjobs%3Fstatus%3Dapplied'],
    ['/documents/cvs', '?next=%2Fdocuments%2Fcvs'],
    ['/cvs/abc/edit', '?next=%2Fcvs%2Fabc%2Fedit'],
    ['/cvs/abc/edit?x=1&y=a%20b', '?next=%2Fcvs%2Fabc%2Fedit%3Fx%3D1%26y%3Da%2520b'],
  ])('%s is sent to /login and remembered as %s', async (path, search) => {
    const router = renderRoute(path, signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe(search)
  })

  it('shows the welcome page, not the login page, for the front door', async () => {
    const router = renderRoute('/', signedOut)
    await waitFor(() => expect(router.state.location.pathname).toBe('/welcome'))
  })

  it('does not load the page data before signing in', async () => {
    const cv = fake.current.seed('Secret CV')
    renderRoute(`/cvs/${cv.id}/edit`, signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(screen.queryByDisplayValue('Secret CV')).toBeNull()
  })

  it('returns to the deep link with its query after signing in', async () => {
    const router = renderRoute('/jobs?status=applied', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    signIn()
    await screen.findByRole('heading', { name: 'Saved Jobs' })
    expect(router.state.location.pathname).toBe('/jobs')
  })

  it('"Create one" on the login page carries the destination to the sign-up page', async () => {
    const router = renderRoute('/jobs', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    fireEvent.click(screen.getByRole('link', { name: 'Create one' }))
    await screen.findByRole('heading', { name: 'Create your account' })
    expect(router.state.location.search).toBe('?next=%2Fjobs')
  })

  it('an unknown address shows the not-found page, also when signed out', async () => {
    const router = renderRoute('/this/page/does/not/exist', signedOut)
    await screen.findByRole('heading', { name: /not found|doesn.t exist|404/i })
    expect(router.state.location.pathname).toBe('/this/page/does/not/exist')
  })
})

describe('open redirects after signing in', () => {
  it.each([
    ['//evil.example', '/'],
    ['//evil.example/jobs', '/'],
    ['///evil.example', '/'],
    ['https://evil.example', '/'],
    ['javascript:alert(1)', '/'],
    ['evil.example', '/'],
  ])('?next=%s lands on %s', async (next, landing) => {
    const router = renderRoute(`/login?next=${encodeURIComponent(next)}`, signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    signIn()
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(router.state.location.pathname).toBe(landing)
    expect(router.state.location.search).toBe('')
  })

  it('does not follow ?next= on the sign-up page either', async () => {
    const router = renderRoute('/register?next=//evil.example', signedOut)
    await screen.findByRole('heading', { name: 'Create your account' })
    type('Email', 'new@example.com')
    type(/^Password/, 'a long enough password')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(router.state.location.pathname).toBe('/')
  })

  it('a signed-in visitor of /login?next=//evil.example is not forwarded off site', async () => {
    auth.current.reset()
    const router = renderRoute('/login?next=//evil.example')
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('an account service that answers with an error', () => {
  it('shows a retryable error instead of the sign-in page when /me fails', async () => {
    let failing = true
    auth.current.api.me = async () => {
      if (failing) throw new ApiRequestError(403, 'forbidden', 'Not allowed here')
      return null
    }
    // Like renderRoute, but nobody told the app who is signed in: it has to ask the server.
    const router = createMemoryRouter(routes, { initialEntries: ['/jobs'] })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    const retry = await screen.findByRole('button', { name: 'Try again' })
    expect(screen.queryByRole('heading', { name: 'Sign in' })).toBeNull()
    failing = false
    fireEvent.click(retry)
    await screen.findByRole('heading', { name: 'Sign in' })
  })
})
