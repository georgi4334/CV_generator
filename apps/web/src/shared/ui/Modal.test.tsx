import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
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

  it('gives focus back to the button that opened it when it closes', () => {
    function Opener() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          {open && (
            <Modal labelledBy="title" onClose={() => setOpen(false)}>
              <h2 id="title">Dialog</h2>
              <button>Inside</button>
            </Modal>
          )}
        </>
      )
    }
    render(<Opener />)
    const opener = screen.getByRole('button', { name: 'Open' })
    opener.focus()
    fireEvent.click(opener)
    // Focus moves into the dialog, as showModal() does in a browser.
    screen.getByRole('button', { name: 'Inside', hidden: true }).focus()
    expect(document.activeElement).not.toBe(opener)

    // Escape asks to close; the parent removes the dialog.
    act(() => {
      screen
        .getByRole('dialog', { hidden: true })
        .dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})
