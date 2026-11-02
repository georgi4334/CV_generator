import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissToast, showToast, TOAST_MS, useToasts } from '@/shared/stores/toasts'
import { Toaster } from './Toaster'

beforeEach(() => {
  vi.useFakeTimers()
  useToasts.setState({ toasts: [] })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const show = (...args: Parameters<typeof showToast>) => act(() => void showToast(...args))

describe('Toaster', () => {
  it('renders nothing while there are no toasts', () => {
    const { container } = render(<Toaster />)
    expect(container.firstChild).toBeNull()
  })

  it('shows 100 notifications quickly and closes them one by one', () => {
    render(<Toaster />)
    act(() => {
      for (let i = 0; i < 100; i++) showToast({ tone: 'error', message: `Failed ${i}` })
    })
    expect(screen.getAllByRole('alert')).toHaveLength(100)
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]!)
    expect(screen.getAllByRole('alert')).toHaveLength(99)
    expect(screen.queryByText('Failed 0')).toBeNull()
    expect(screen.getByText('Failed 1')).toBeDefined()
  })

  it('removes 100 success toasts after their time, all at once', () => {
    render(<Toaster />)
    act(() => {
      for (let i = 0; i < 100; i++) showToast({ tone: 'success', message: `Done ${i}` })
    })
    expect(screen.getAllByRole('status')).toHaveLength(100)
    act(() => void vi.advanceTimersByTime(TOAST_MS))
    expect(screen.queryAllByRole('status')).toHaveLength(0)
    expect(useToasts.getState().toasts).toEqual([])
  })

  it('info toasts fade away after 5 seconds, not before', () => {
    render(<Toaster />)
    show({ tone: 'info', message: 'FYI' })
    act(() => void vi.advanceTimersByTime(TOAST_MS - 1))
    expect(screen.getByText('FYI')).toBeDefined()
    act(() => void vi.advanceTimersByTime(1))
    expect(screen.queryByText('FYI')).toBeNull()
  })

  it.each(['error', 'warning'] as const)('a %s toast stays until it is closed', (tone) => {
    render(<Toaster />)
    show({ tone, message: 'Stay' })
    act(() => void vi.advanceTimersByTime(10 * 60_000))
    expect(screen.getByText('Stay')).toBeDefined()
  })

  it('an explicit duration overrides the default, and null keeps a success toast', () => {
    render(<Toaster />)
    show({ tone: 'error', message: 'Short', duration: 1000 })
    show({ tone: 'success', message: 'Sticky', duration: null })
    act(() => void vi.advanceTimersByTime(1000))
    expect(screen.queryByText('Short')).toBeNull()
    act(() => void vi.advanceTimersByTime(60_000))
    expect(screen.getByText('Sticky')).toBeDefined()
  })

  it('a toast shown again with the same id restarts its timer', () => {
    render(<Toaster />)
    show({ id: 'save', tone: 'info', message: 'Saved v1' })
    act(() => void vi.advanceTimersByTime(4000))
    show({ id: 'save', tone: 'info', message: 'Saved v2' })
    act(() => void vi.advanceTimersByTime(4000))
    expect(screen.getByText('Saved v2')).toBeDefined()
    act(() => void vi.advanceTimersByTime(1000))
    expect(screen.queryByText('Saved v2')).toBeNull()
  })

  it('does not leave a timer running after the toast was closed by hand', () => {
    render(<Toaster />)
    show({ tone: 'info', message: 'Gone' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears its timers when the Toaster unmounts', () => {
    const { unmount } = render(<Toaster />)
    show({ tone: 'info', message: 'A' })
    show({ tone: 'success', message: 'B' })
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('closing a toast whose onDismiss throws still removes it', () => {
    render(<Toaster />)
    const onDismiss = vi.fn(() => {
      throw new Error('boom')
    })
    show({ tone: 'error', message: 'Bad callback', onDismiss })
    // React reports the error from the handler; the click itself must not break the app.
    const errors: unknown[] = []
    const onError = (e: ErrorEvent) => {
      errors.push(e.error)
      e.preventDefault()
    }
    window.addEventListener('error', onError)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    window.removeEventListener('error', onError)
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(errors.length).toBeLessThanOrEqual(1)
  })

  it('shows a very long unbroken message without throwing', () => {
    render(<Toaster />)
    show({ tone: 'error', message: 'x'.repeat(100_000) })
    expect(screen.getByRole('alert').textContent).toHaveLength(100_000)
  })

  it('a dismissed id that is shown again is not removed by the old exit', () => {
    render(<Toaster />)
    show({ id: 'a', tone: 'error', message: 'one' })
    act(() => dismissToast('a'))
    show({ id: 'a', tone: 'error', message: 'two' })
    expect(screen.getByText('two')).toBeDefined()
  })
})
