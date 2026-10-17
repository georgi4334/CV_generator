import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('closes when the dimmed area around it is clicked, not when its content is', () => {
    const onClose = vi.fn()
    render(
      <Modal labelledBy="title" onClose={onClose} variant="drawer">
        <h2 id="title">Job</h2>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { hidden: true })
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 500,
      right: 900,
      top: 0,
      bottom: 800,
    } as DOMRect)

    fireEvent.click(screen.getByText('Job'))
    expect(onClose).not.toHaveBeenCalled()

    // Pressed and released on the backdrop, left of the drawer.
    fireEvent.pointerDown(dialog, { clientX: 100, clientY: 300 })
    fireEvent.click(dialog, { clientX: 100, clientY: 300 })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when a drag started inside ends on the backdrop', () => {
    const onClose = vi.fn()
    render(
      <Modal labelledBy="title" onClose={onClose} variant="drawer">
        <h2 id="title">Job</h2>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { hidden: true })
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 500,
      right: 900,
      top: 0,
      bottom: 800,
    } as DOMRect)
    fireEvent.pointerDown(dialog, { clientX: 600, clientY: 300 })
    fireEvent.click(dialog, { clientX: 100, clientY: 300 })
    expect(onClose).not.toHaveBeenCalled()
  })
})
