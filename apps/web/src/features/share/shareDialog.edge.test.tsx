// Route-level tests: the real app with fake APIs (see test/appHarness.ts).
import '@/test/appHarness'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/shared/api/client'
import { fake } from '@/test/fakeHolders'
import { renderRoute } from '@/test/renderRoute'

let originals: Partial<typeof fake.current.api>

beforeEach(() => {
  originals ??= {
    getShare: fake.current.api.getShare,
    setShare: fake.current.api.setShare,
    resetShare: fake.current.api.resetShare,
    getShared: fake.current.api.getShared,
  }
  Object.assign(fake.current.api, originals)
})
afterEach(() => {
  vi.restoreAllMocks()
  delete (navigator as { clipboard?: unknown }).clipboard
})

async function openDialog() {
  const cv = fake.current.seed('Frontend CV')
  renderRoute(`/cvs/${cv.id}/edit`)
  await screen.findByDisplayValue('Frontend CV')
  fireEvent.click(screen.getByRole('button', { name: 'Share link' }))
  const dialog = within(await screen.findByRole('dialog', { name: /^Share/ }))
  return { cv, dialog }
}
const turnOn = async (dialog: ReturnType<typeof within>) => {
  fireEvent.click(await dialog.findByRole('switch', { name: 'Share a read-only link' }))
  return (await dialog.findByRole('textbox', { name: 'Share link' })) as HTMLInputElement
}

describe('copying the share link', () => {
  it('selects the link for manual copying when the clipboard is not available', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    const { dialog } = await openDialog()
    const input = await turnOn(dialog)
    const select = vi.spyOn(input, 'select')
    fireEvent.click(dialog.getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(select).toHaveBeenCalled())
    expect(dialog.queryByRole('button', { name: 'Copied' })).toBeNull()
  })

  it('does the same when the browser refuses the permission', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { dialog } = await openDialog()
    const input = await turnOn(dialog)
    const select = vi.spyOn(input, 'select')
    fireEvent.click(dialog.getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(select).toHaveBeenCalled())
    expect(dialog.getByRole('button', { name: 'Copy' })).toBeDefined()
  })

  it('shows "Copied" only after a successful copy and forgets it when the link is replaced', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { dialog } = await openDialog()
    const input = await turnOn(dialog)
    fireEvent.click(dialog.getByRole('button', { name: 'Copy' }))
    await dialog.findByRole('button', { name: 'Copied' })
    expect(writeText).toHaveBeenCalledWith(input.value)
    fireEvent.click(dialog.getByRole('button', { name: 'Replace link' }))
    await dialog.findByRole('button', { name: 'Copy' })
  })

  it('copying ten times in a row is harmless', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { dialog } = await openDialog()
    await turnOn(dialog)
    const copy = dialog.getByRole('button', { name: 'Copy' })
    for (let i = 0; i < 10; i++) fireEvent.click(copy)
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(10))
    expect(new Set(writeText.mock.calls.map((c) => c[0])).size).toBe(1)
  })

  it('the link is on this site and opens safely in a new tab', async () => {
    const { dialog } = await openDialog()
    const input = await turnOn(dialog)
    expect(input.value.startsWith(window.location.origin + '/s/')).toBe(true)
    const open = dialog.getByRole('link', { name: /Open/ })
    expect(open.getAttribute('target')).toBe('_blank')
    expect(open.getAttribute('rel')).toContain('noreferrer')
  })
})

describe('the share service fails', () => {
  it('shows an error and keeps the switch off when the state cannot be loaded', async () => {
    fake.current.api.getShare = async () => {
      throw new ApiRequestError(null, 'network_error', 'offline')
    }
    const { dialog } = await openDialog()
    expect((await dialog.findByRole('alert')).textContent).toBeTruthy()
    const toggle = await dialog.findByRole('switch')
    expect((toggle as HTMLButtonElement).disabled).toBe(true)
    expect(dialog.queryByRole('textbox', { name: 'Share link' })).toBeNull()
  })

  it('turning the link on fails: the switch stays off and the error is shown', async () => {
    const { dialog } = await openDialog()
    const toggle = await dialog.findByRole('switch', { name: 'Share a read-only link' })
    fake.current.api.setShare = async () => {
      throw new ApiRequestError(500, 'internal_error', 'boom')
    }
    fireEvent.click(toggle)
    expect((await dialog.findByRole('alert')).textContent).toBeTruthy()
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(dialog.queryByRole('textbox', { name: 'Share link' })).toBeNull()
  })

  it('replacing the link fails: the old link stays and the error is shown', async () => {
    const { dialog } = await openDialog()
    const input = await turnOn(dialog)
    const before = input.value
    fake.current.api.resetShare = async () => {
      throw new ApiRequestError(null, 'network_error', 'offline')
    }
    fireEvent.click(dialog.getByRole('button', { name: 'Replace link' }))
    await dialog.findByRole('alert')
    expect((dialog.getByRole('textbox', { name: 'Share link' }) as HTMLInputElement).value).toBe(
      before,
    )
  })

  it('a later success clears the earlier error', async () => {
    const { dialog } = await openDialog()
    const toggle = await dialog.findByRole('switch', { name: 'Share a read-only link' })
    const good = fake.current.api.setShare
    fake.current.api.setShare = async () => {
      throw new ApiRequestError(500, 'internal_error', 'boom')
    }
    fireEvent.click(toggle)
    await dialog.findByRole('alert')
    fake.current.api.setShare = good
    fireEvent.click(toggle)
    await dialog.findByRole('textbox', { name: 'Share link' })
    expect(dialog.queryByRole('alert')).toBeNull()
  })

  it('cannot be toggled again while the first change is still being saved', async () => {
    const { dialog } = await openDialog()
    const toggle = (await dialog.findByRole('switch', {
      name: 'Share a read-only link',
    })) as HTMLButtonElement
    let finish!: () => void
    const good = fake.current.api.setShare
    const slow = vi.fn(
      (id: string, change: Parameters<typeof good>[1]) =>
        new Promise<Awaited<ReturnType<typeof good>>>(
          (resolve) => (finish = () => resolve(good(id, change))),
        ),
    )
    fake.current.api.setShare = slow
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle.disabled).toBe(true))
    fireEvent.click(toggle)
    fireEvent.click(toggle)
    expect(slow).toHaveBeenCalledTimes(1)
    finish()
    await dialog.findByRole('textbox', { name: 'Share link' })
  })

  it('closes with the X button', async () => {
    const { dialog } = await openDialog()
    await dialog.findByRole('switch')
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('opening a share link', () => {
  it('shows "does not work" for a link that never existed', async () => {
    renderRoute('/s/aaaaaaaaaaaaaaaa', { user: null })
    expect(await screen.findByRole('heading', { name: 'This link does not work' })).toBeDefined()
  })

  it.each([
    '%00',
    '..%2F..%2Fetc%2Fpasswd',
    '%3Cscript%3Ealert(1)%3C%2Fscript%3E',
    'a'.repeat(5000),
  ])('shows "does not work" for the odd slug %s without crashing', async (slug) => {
    renderRoute(`/s/${slug}`, { user: null })
    expect(await screen.findByRole('heading', { name: 'This link does not work' })).toBeDefined()
  })

  it('shows an error with a retry (not "does not work") when the server fails', async () => {
    let failing = true
    const good = fake.current.api.getShared
    fake.current.api.getShared = async (slug) => {
      if (failing) throw new ApiRequestError(400, 'http_error', 'bad request')
      return good(slug)
    }
    const cv = fake.current.seed('Frontend CV')
    const { link } = await fake.current.api.setShare(cv.id, { isActive: true })
    renderRoute(`/s/${link!.slug}`, { user: null })
    const retry = await screen.findByRole('button', { name: 'Try again' })
    expect(screen.queryByRole('heading', { name: 'This link does not work' })).toBeNull()
    failing = false
    fireEvent.click(retry)
    expect(await screen.findByRole('heading', { name: 'Frontend CV' })).toBeDefined()
  })
})
