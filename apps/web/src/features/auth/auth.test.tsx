import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import type { FakeAuthApi } from '@/test/fakeAuthApi'
import { TEST_USER } from '@/test/fakeAuthApi'
import type { FakeCvApi } from '@/test/fakeCvApi'
import { renderRoute } from '@/test/renderRoute'

const auth = vi.hoisted(() => ({ current: null as unknown as FakeAuthApi }))
const fake = vi.hoisted(() => ({ current: null as unknown as FakeCvApi }))

vi.mock('./api', async () => {
  const { createFakeAuthApi } = await import('@/test/fakeAuthApi')
  auth.current ??= createFakeAuthApi()
  return { authApi: auth.current.api }
})
vi.mock('@/features/cv-editor/api', async () => {
  const { createFakeCvApi } = await import('@/test/fakeCvApi')
  fake.current ??= createFakeCvApi()
  return { cvApi: fake.current.api }
})
vi.mock('@/features/cover-letters/api', async () => {
  const { createFakeCvApi } = await import('@/test/fakeCvApi')
  fake.current ??= createFakeCvApi()
  return { coverLetterApi: fake.current.coverLetterApi }
})
vi.mock('@/features/jobs/api', async () => {
  const { createFakeCvApi } = await import('@/test/fakeCvApi')
  fake.current ??= createFakeCvApi()
  return { jobsApi: fake.current.jobsApi }
})
vi.mock('@/shared/api/useHealth', () => ({
  useHealth: () => ({ isLoading: false, isError: false, data: undefined }),
}))

beforeEach(() => {
  fake.current.reset()
  auth.current.reset(null)
})

const signedOut = { user: null }
const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))

describe('signing in', () => {
  it('sends signed-out visitors to /login and back to the page they wanted', async () => {
    const router = renderRoute('/jobs', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe('?next=%2Fjobs')

    type('Email', 'ann@example.com')
    type(/^Password/, 'correct horse')
    click('Sign in')
    await screen.findByRole('heading', { name: 'Saved Jobs' })
    expect(router.state.location.pathname).toBe('/jobs')
  })

  it('shows the error for a wrong password and stays on the page', async () => {
    const router = renderRoute('/login', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    type('Email', 'ann@example.com')
    type(/^Password/, 'nope nope nope')
    click('Sign in')
    expect((await screen.findByRole('alert')).textContent).toBe('Wrong email or password')
    expect(router.state.location.pathname).toBe('/login')
  })

  it('does not follow a ?next= that leaves the site', async () => {
    const router = renderRoute('/login?next=//evil.example', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    type('Email', 'ann@example.com')
    type(/^Password/, 'correct horse')
    click('Sign in')
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(router.state.location.pathname).toBe('/')
  })

  it('skips the sign-in page when already signed in', async () => {
    auth.current.reset(TEST_USER)
    const router = renderRoute('/login')
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(router.state.location.pathname).toBe('/')
  })

  it('keeps the shared-document page public', async () => {
    renderRoute('/s/some-slug', signedOut)
    await waitFor(() => expect(auth.current.calls).not.toContain('login'))
    expect(screen.queryByRole('heading', { name: 'Sign in' })).toBeNull()
  })
})

describe('creating an account', () => {
  it('signs up, lands on the dashboard and reminds to confirm the email', async () => {
    renderRoute('/register', signedOut)
    await screen.findByRole('heading', { name: 'Create your account' })
    type(/Name/, 'Bea')
    type('Email', 'bea@example.com')
    type(/^Password/, 'a long enough password')
    click('Create account')
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(screen.getByRole('status').textContent).toContain('bea@example.com')
    click('Send it again')
    await screen.findByText(/A new link is on its way/)
    expect(auth.current.calls).toContain('resend')
  })

  it('tells when the email is taken', async () => {
    renderRoute('/register', signedOut)
    await screen.findByRole('heading', { name: 'Create your account' })
    type('Email', 'taken@example.com')
    type(/^Password/, 'a long enough password')
    click('Create account')
    expect((await screen.findByRole('alert')).textContent).toContain('already exists')
  })
})

describe('forgotten password', () => {
  it('asks for a link without saying whether the account exists', async () => {
    renderRoute('/forgot-password', signedOut)
    type('Email', 'who@example.com')
    click('Send reset link')
    await screen.findByText(/a reset link is on its way/)
    expect(auth.current.calls).toContain('forgot:who@example.com')
  })

  it('sets a new password from the emailed link', async () => {
    renderRoute('/reset-password?token=good-token-good-token-good', signedOut)
    type(/^New password/, 'a brand new secret')
    click('Change password')
    await screen.findByText(/Your password was changed/)
    expect(auth.current.calls).toContain('reset:good-token-good-token-good')
  })

  it('offers a new link when the old one expired', async () => {
    renderRoute('/reset-password?token=expired-token-expired-token', signedOut)
    type(/^New password/, 'a brand new secret')
    click('Change password')
    await screen.findByText(/invalid or has expired/)
    expect(screen.getByRole('link', { name: 'Ask for a new link' })).toBeDefined()
  })

  it('explains an incomplete link', () => {
    renderRoute('/reset-password', signedOut)
    expect(screen.getByRole('heading', { name: 'Reset link is incomplete' })).toBeDefined()
  })
})

describe('email confirmation page', () => {
  it('confirms once, even in development double rendering', async () => {
    renderRoute('/verify-email?token=good-token-good-token-good', signedOut)
    await screen.findByText(/Your email address is confirmed/)
    expect(auth.current.calls.filter((c) => c.startsWith('verify:'))).toHaveLength(1)
  })

  it('reports an invalid link', async () => {
    renderRoute('/verify-email?token=expired-token-expired-token', signedOut)
    await screen.findByText(/invalid or has expired/)
  })
})

describe('signed in', () => {
  beforeEach(() => auth.current.reset(TEST_USER))

  it('signs out, forgets the open document and returns to /login', async () => {
    useCvEditor.setState({ docId: 'x' })
    const router = renderRoute('/')
    await screen.findByRole('heading', { name: 'Dashboard' })
    click('Sign out')
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(router.state.location.pathname).toBe('/login')
    expect(useCvEditor.getState().docId).toBeNull()
    expect(auth.current.calls).toContain('logout')
    cleanup()
  })

  it('changes the name and the password on the account page', async () => {
    renderRoute('/account')
    await screen.findByRole('heading', { name: 'Account' })
    type('Name', 'Anna')
    click('Save')
    await screen.findByText('Saved')
    expect(auth.current.calls).toContain('profile')

    type('Current password', 'wrong one')
    type(/^New password/, 'a brand new secret')
    click('Change password')
    expect((await screen.findByRole('alert')).textContent).toContain('not correct')

    type('Current password', 'correct horse')
    click('Change password')
    await screen.findByText('Password changed')
  })

  it('deletes the account after asking for the password', async () => {
    const router = renderRoute('/account')
    await screen.findByRole('heading', { name: 'Account' })
    click('Delete account…')
    type('Enter your password to confirm', 'wrong')
    click('Delete my account')
    expect((await screen.findByRole('alert')).textContent).toContain('not correct')
    type('Enter your password to confirm', 'correct horse')
    click('Delete my account')
    await screen.findByRole('heading', { name: 'Create your account' })
    expect(router.state.location.pathname).toBe('/register')
  })
})
