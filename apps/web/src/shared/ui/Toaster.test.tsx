import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { showToast, TOAST_MS, useToasts } from '@/shared/stores/toasts'
import { Toaster } from './Toaster'

afterEach(() => {
  useToasts.setState({ toasts: [] })
  vi.useRealTimers()
})

describe('Toaster', () => {
  it('shows errors as alerts until closed, and calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(<Toaster />)
    act(() => {
      showToast({ tone: 'error', message: 'Could not save', onDismiss })
    })
    expect(screen.getByRole('alert').textContent).toContain('Could not save')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lets success messages fade away on their own', () => {
    vi.useFakeTimers()
    render(<Toaster />)
    act(() => {
      showToast({ tone: 'success', message: 'Copied' })
    })
    expect(screen.getByRole('status').textContent).toContain('Copied')
    act(() => {
      vi.advanceTimersByTime(TOAST_MS)
    })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('replaces a toast with the same id instead of stacking it', () => {
    render(<Toaster />)
    act(() => {
      showToast({ id: 'save', tone: 'info', message: 'Saving' })
      showToast({ id: 'save', tone: 'warning', message: 'Still saving' })
    })
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status').textContent).toContain('Still saving')
  })
})
