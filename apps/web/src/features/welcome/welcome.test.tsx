// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { auth } from '@/test/fakeHolders'
import { TEST_USER } from '@/test/fakeAuthApi'
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/renderRoute'

const signedOut = { user: null }

describe('welcome page', () => {
  it('is what a signed-out visitor sees at the home address', async () => {
    const router = renderRoute('/', signedOut)
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Build a CV that gets you the interview',
      }),
    ).toBeDefined()
    expect(router.state.location.pathname).toBe('/welcome')
  })

  it('offers Register and Log in, and leads to them', async () => {
    const router = renderRoute('/welcome', signedOut)
    await screen.findByRole('heading', { level: 1 })
    const main = within(screen.getByRole('main'))
    expect(main.getAllByRole('link', { name: 'Create your CV' }).length).toBeGreaterThan(0)
    fireEvent.click(main.getAllByRole('link', { name: 'Create your CV' })[0]!)
    await screen.findByRole('heading', { name: 'Create your account' })
    expect(router.state.location.pathname).toBe('/register')
  })

  it('has a Log in link in its header', async () => {
    const router = renderRoute('/welcome', signedOut)
    await screen.findByRole('heading', { level: 1 })
    fireEvent.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Log in' }))
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('describes the six main features and shows an example CV', async () => {
    renderRoute('/welcome', signedOut)
    await screen.findByRole('heading', { level: 1 })
    const features = within(screen.getByRole('region', { name: 'Everything for your job search' }))
    expect(features.getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByRole('figure', { name: /example CV/ })).toBeDefined()
  })

  it('sends a signed-in person to the dashboard', async () => {
    auth.current.reset(TEST_USER)
    const router = renderRoute('/welcome')
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(router.state.location.pathname).toBe('/')
  })

  it('still sends signed-out visitors of other pages to the sign-in page', async () => {
    const router = renderRoute('/jobs', signedOut)
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('is translated', async () => {
    renderRoute('/welcome', signedOut)
    await screen.findByRole('heading', { level: 1 })
    const select = screen.getByLabelText('Interface language')
    fireEvent.change(select, { target: { value: 'de' } })
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Erstellen Sie einen Lebenslauf, der zum Gespräch führt',
      }),
    ).toBeDefined()
  })
})
