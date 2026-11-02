// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@cv/shared'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiRequestError } from '@/shared/api/client'
import { auth } from '@/test/fakeHolders'
import { renderRoute } from '@/test/renderRoute'

const signedOut = { user: null }
const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))

let originals: Pick<typeof auth.current.api, 'login' | 'register' | 'forgotPassword'>
beforeEach(() => {
  originals ??= {
    login: auth.current.api.login,
    register: auth.current.api.register,
    forgotPassword: auth.current.api.forgotPassword,
  }
  Object.assign(auth.current.api, originals)
})

describe('sign in form', () => {
  it('requires both fields and an email-shaped address', async () => {
    renderRoute('/login', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    expect((screen.getByLabelText('Email') as HTMLInputElement).required).toBe(true)
    expect((screen.getByLabelText('Email') as HTMLInputElement).type).toBe('email')
    expect((screen.getByLabelText(/^Password/) as HTMLInputElement).required).toBe(true)
  })

  it('sends one request when the button is pressed again while signing in', async () => {
    renderRoute('/login', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    let finish!: () => void
    const good = auth.current.api.login
    let started = 0
    auth.current.api.login = (input) => {
      started += 1
      return new Promise((resolve) => (finish = () => resolve(good(input))))
    }
    type('Email', 'ann@example.com')
    type(/^Password/, 'correct horse')
    click('Sign in')
    const busy = await screen.findByRole('button', { name: 'Signing in…' })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(busy)
    fireEvent.click(busy)
    finish()
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(started).toBe(1)
  })

  it('does not tell whether the email or the password was wrong', async () => {
    renderRoute('/login', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    type('Email', 'nobody@example.com')
    type(/^Password/, 'wrong wrong wrong')
    click('Sign in')
    expect((await screen.findByRole('alert')).textContent).toBe('Wrong email or password')
  })

  it('shows a network error and lets the person try again', async () => {
    renderRoute('/login', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    const good = auth.current.api.login
    auth.current.api.login = async () => {
      throw new ApiRequestError(null, 'network_error', 'offline')
    }
    type('Email', 'ann@example.com')
    type(/^Password/, 'correct horse')
    click('Sign in')
    expect((await screen.findByRole('alert')).textContent).toContain('Cannot reach the server')
    auth.current.api.login = good
    click('Sign in')
    await screen.findByRole('heading', { name: 'Dashboard' })
  })

  it.each([
    ['a rate limit', new ApiRequestError(429, 'too_many_requests', 'raw')],
    ['an unexpected server error', new ApiRequestError(500, 'internal_error', 'raw')],
  ])('explains %s in words', async (_, error) => {
    renderRoute('/login', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    auth.current.api.login = async () => {
      throw error
    }
    type('Email', 'ann@example.com')
    type(/^Password/, 'whatever')
    click('Sign in')
    const text = (await screen.findByRole('alert')).textContent!
    expect(text).not.toBe('raw')
    expect(text.length).toBeGreaterThan(10)
  })

  it('accepts a 10 000 character password field value without breaking the page', async () => {
    renderRoute('/login', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    type('Email', 'ann@example.com')
    type(/^Password/, 'p'.repeat(10_000))
    click('Sign in')
    expect((await screen.findByRole('alert')).textContent).toBe('Wrong email or password')
  })
})

describe('sign up form', () => {
  it('limits the name and the password length in the fields', async () => {
    renderRoute('/register', signedOut)
    await screen.findByRole('heading', { name: 'Create your account' })
    expect((screen.getByLabelText(/Name/) as HTMLInputElement).maxLength).toBe(NAME_MAX_LENGTH)
    expect((screen.getByLabelText(/^Password/) as HTMLInputElement).minLength).toBe(
      PASSWORD_MIN_LENGTH,
    )
  })

  it('creates one account when the button is pressed twice', async () => {
    renderRoute('/register', signedOut)
    await screen.findByRole('heading', { name: 'Create your account' })
    let finish!: () => void
    const good = auth.current.api.register
    let started = 0
    auth.current.api.register = (input) => {
      started += 1
      return new Promise((resolve) => (finish = () => resolve(good(input))))
    }
    type('Email', 'new@example.com')
    type(/^Password/, 'a long enough password')
    click('Create account')
    const busy = await screen.findByRole('button', { name: /Creating|Saving|…/ })
    fireEvent.click(busy)
    fireEvent.click(busy)
    expect(started).toBe(1)
    finish()
    await screen.findByRole('heading', { name: 'Dashboard' })
  })

  it('sends a whitespace-only name as typed (the server decides) and still signs up', async () => {
    renderRoute('/register', signedOut)
    await screen.findByRole('heading', { name: 'Create your account' })
    type(/Name/, '     ')
    type('Email', 'new@example.com')
    type(/^Password/, 'a long enough password')
    click('Create account')
    await screen.findByRole('heading', { name: 'Dashboard' })
  })

  it('keeps what was typed after "email taken"', async () => {
    renderRoute('/register', signedOut)
    await screen.findByRole('heading', { name: 'Create your account' })
    type(/Name/, 'Bea')
    type('Email', 'taken@example.com')
    type(/^Password/, 'a long enough password')
    click('Create account')
    await screen.findByRole('alert')
    expect((screen.getByLabelText(/Name/) as HTMLInputElement).value).toBe('Bea')
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('taken@example.com')
    expect((screen.getByLabelText(/^Password/) as HTMLInputElement).value).toBe(
      'a long enough password',
    )
  })

  it('names with emoji and right-to-left text are accepted', async () => {
    renderRoute('/register', signedOut)
    await screen.findByRole('heading', { name: 'Create your account' })
    type(/Name/, '👩🏽‍💻 مريم')
    type('Email', 'emoji@example.com')
    type(/^Password/, 'a long enough password')
    click('Create account')
    await waitFor(() => expect(auth.current.calls).toContain('register'))
  })
})

describe('forgot password form', () => {
  it('asks once even when the button is pressed repeatedly', async () => {
    renderRoute('/forgot-password', signedOut)
    type('Email', 'who@example.com')
    let started = 0
    auth.current.api.forgotPassword = async () => {
      started += 1
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    const send = screen.getByRole('button', { name: 'Send reset link' })
    fireEvent.click(send)
    // Once the page shows the request is running, more presses do nothing.
    await waitFor(() => expect((send as HTMLButtonElement).disabled).toBe(true))
    fireEvent.click(send)
    fireEvent.click(send)
    await screen.findByText(/a reset link is on its way/)
    expect(started).toBe(1)
  })

  it('shows the same message for a failed request without leaking whether the account exists', async () => {
    renderRoute('/forgot-password', signedOut)
    auth.current.api.forgotPassword = async () => {
      throw new ApiRequestError(500, 'internal_error', 'boom')
    }
    type('Email', 'who@example.com')
    click('Send reset link')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).not.toMatch(/exists|no account|unknown/i)
  })
})
