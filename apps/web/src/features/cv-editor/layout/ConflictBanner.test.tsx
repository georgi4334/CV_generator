import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/shared/api/client'
import { useSaveState } from '@/features/cv-editor/state/editorSession'
import { ConflictBanner } from './ConflictBanner'

const conflictWith = (details: unknown) =>
  act(() => {
    useSaveState.setState({
      status: 'conflict',
      lastSavedAt: null,
      error: new ApiRequestError(409, 'conflict', 'changed', details),
    })
  })

beforeEach(() => useSaveState.setState({ status: 'saved', lastSavedAt: null, error: null }))
afterEach(() => vi.restoreAllMocks())

describe('ConflictBanner', () => {
  it.each(['saved', 'pending', 'saving', 'error'] as const)(
    'is hidden while the status is "%s"',
    (status) => {
      useSaveState.setState({ status, lastSavedAt: null, error: null })
      const { container } = render(
        <ConflictBanner kind="cv" reload={async () => {}} overwrite={() => {}} />,
      )
      expect(container.firstChild).toBeNull()
    },
  )

  it('says which kind of document changed elsewhere', () => {
    conflictWith({ revision: 3 })
    render(<ConflictBanner kind="cv" reload={async () => {}} overwrite={() => {}} />)
    expect(screen.getByRole('alert').textContent).toMatch(/CV/i)
  })

  it('"keep mine" overwrites using the revision the server reported', () => {
    conflictWith({ revision: 12 })
    const overwrite = vi.fn()
    render(<ConflictBanner kind="cv" reload={async () => {}} overwrite={overwrite} />)
    fireEvent.click(screen.getByRole('button', { name: /keep/i }))
    expect(overwrite).toHaveBeenCalledWith(12)
  })

  it.each([
    ['no details at all', undefined],
    ['details without a revision', {}],
    ['details that are not an object', 'oops'],
  ])('cannot overwrite blindly when the server sent %s', (_, details) => {
    conflictWith(details)
    const overwrite = vi.fn()
    render(<ConflictBanner kind="cv" reload={async () => {}} overwrite={overwrite} />)
    const keep = screen.getByRole('button', { name: /keep/i }) as HTMLButtonElement
    expect(keep.disabled).toBe(true)
    fireEvent.click(keep)
    expect(overwrite).not.toHaveBeenCalled()
  })

  it('disables both buttons while the latest version is loading, then enables them', async () => {
    conflictWith({ revision: 2 })
    let finish!: () => void
    const reload = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    render(<ConflictBanner kind="cv" reload={reload} overwrite={() => {}} />)
    const load = screen.getByRole('button', { name: /load/i }) as HTMLButtonElement
    fireEvent.click(load)
    expect(load.disabled).toBe(true)
    // A double click does not start a second request.
    fireEvent.click(load)
    expect(reload).toHaveBeenCalledOnce()
    await act(async () => finish())
    await waitFor(() => expect(load.disabled).toBe(false))
  })

  it('tells the user when loading the latest version fails, and stays usable', async () => {
    conflictWith({ revision: 2 })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const reload = vi.fn().mockRejectedValue(new ApiRequestError(null, 'network_error', 'offline'))
    render(<ConflictBanner kind="cv" reload={reload} overwrite={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /load/i }))
    await waitFor(() => expect(alertSpy).toHaveBeenCalledOnce())
    expect(String(alertSpy.mock.calls[0]![0]).length).toBeGreaterThan(0)
    expect((screen.getByRole('button', { name: /load/i }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('disappears once the status leaves "conflict"', () => {
    conflictWith({ revision: 2 })
    render(<ConflictBanner kind="cv" reload={async () => {}} overwrite={() => {}} />)
    expect(screen.getByRole('alert')).toBeDefined()
    act(() => useSaveState.setState({ status: 'saved', error: null }))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
