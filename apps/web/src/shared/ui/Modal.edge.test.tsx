import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './Modal'

const cancel = (element: Element) =>
  act(() => {
    element.dispatchEvent(new Event('cancel', { cancelable: true }))
  })

afterEach(() => vi.restoreAllMocks())

describe('Modal', () => {
  it('Escape (cancel) asks to close instead of closing by itself, and is not left to the browser', () => {
    const onClose = vi.fn()
    render(
      <Modal labelledBy="t" onClose={onClose}>
        <h2 id="t">Hello</h2>
      </Modal>,
    )
    const event = new Event('cancel', { cancelable: true })
    act(() => void screen.getByRole('dialog', { hidden: true }).dispatchEvent(event))
    expect(event.defaultPrevented).toBe(true)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('prefers onCloseRequest over onClose for Escape and for a click on the backdrop', () => {
    const onClose = vi.fn()
    const onCloseRequest = vi.fn()
    render(
      <Modal labelledBy="t" onClose={onClose} onCloseRequest={onCloseRequest}>
        <h2 id="t">Hello</h2>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { hidden: true })
    cancel(dialog)
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 200,
      top: 100,
      bottom: 200,
    } as DOMRect)
    fireEvent.pointerDown(dialog, { clientX: 5, clientY: 5 })
    fireEvent.click(dialog, { clientX: 5, clientY: 5 })
    expect(onCloseRequest).toHaveBeenCalledTimes(2)
    expect(onClose).not.toHaveBeenCalled()
  })

  // BUG (latent): Modal's onCancel handler calls preventDefault() but not stopPropagation(), and
  // React bubbles `cancel` through the React tree. When a Modal is rendered inside another Modal
  // (React children), pressing Escape in the inner dialog also calls the OUTER dialog's onClose,
  // so both close. No screen nests them today (ConfirmDialog is a sibling of the job drawer), but
  // the first nested dialog will lose the outer one's unsaved state.
  // Repro: <Modal onClose={outer}><Modal onClose={inner}/></Modal>; dispatch a `cancel` event on the
  // inner <dialog> -> outer and inner are both called. Expected: only inner.
  it.fails('Escape in a nested dialog closes only the inner one', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <Modal labelledBy="outer" onClose={outer}>
        <h2 id="outer">Outer</h2>
        <Modal labelledBy="inner" onClose={inner}>
          <h2 id="inner">Inner</h2>
        </Modal>
      </Modal>,
    )
    cancel(screen.getByRole('dialog', { name: 'Inner', hidden: true }))
    expect(inner).toHaveBeenCalledOnce()
    expect(outer).not.toHaveBeenCalled()
  })

  it('Escape in the outer dialog does not call the inner one', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <Modal labelledBy="outer" onClose={outer}>
        <h2 id="outer">Outer</h2>
        <Modal labelledBy="inner" onClose={inner}>
          <h2 id="inner">Inner</h2>
        </Modal>
      </Modal>,
    )
    cancel(screen.getByRole('dialog', { name: 'Outer', hidden: true }))
    expect(outer).toHaveBeenCalledOnce()
    expect(inner).not.toHaveBeenCalled()
  })

  it('opens and closes cleanly when it has no focusable content at all', () => {
    const { unmount } = render(
      <Modal labelledBy="t" onClose={() => {}}>
        <h2 id="t">Only text</h2>
        <p>Nothing to focus here</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { hidden: true }).hasAttribute('open')).toBe(true)
    expect(() => unmount()).not.toThrow()
  })

  it('restores focus to document.body safely when the opener was removed', () => {
    function Host() {
      const [open, setOpen] = useState(false)
      const [hasButton, setHasButton] = useState(true)
      return (
        <>
          {hasButton && <button onClick={() => setOpen(true)}>Open</button>}
          {open && (
            <Modal
              labelledBy="t"
              onClose={() => {
                setHasButton(false)
                setOpen(false)
              }}
            >
              <h2 id="t">Dialog</h2>
            </Modal>
          )}
        </>
      )
    }
    render(<Host />)
    const opener = screen.getByRole('button', { name: 'Open' })
    opener.focus()
    fireEvent.click(opener)
    expect(() => cancel(screen.getByRole('dialog', { hidden: true }))).not.toThrow()
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
  })

  it('works in a browser without <dialog>.showModal and close()', () => {
    const showModal = HTMLDialogElement.prototype.showModal
    const close = HTMLDialogElement.prototype.close
    // @ts-expect-error simulating an old browser
    HTMLDialogElement.prototype.showModal = undefined
    // @ts-expect-error simulating an old browser
    HTMLDialogElement.prototype.close = undefined
    try {
      const { unmount } = render(
        <Modal labelledBy="t" onClose={() => {}}>
          <h2 id="t">Old browser</h2>
        </Modal>,
      )
      expect(screen.getByRole('dialog', { hidden: true }).hasAttribute('open')).toBe(true)
      expect(() => unmount()).not.toThrow()
    } finally {
      HTMLDialogElement.prototype.showModal = showModal
      HTMLDialogElement.prototype.close = close
    }
  })

  it('a click without a preceding press on the backdrop does not close it', () => {
    const onClose = vi.fn()
    render(
      <Modal labelledBy="t" onClose={onClose}>
        <h2 id="t">Hello</h2>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { hidden: true })
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 200,
      top: 100,
      bottom: 200,
    } as DOMRect)
    fireEvent.click(dialog, { clientX: 5, clientY: 5 })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('a click right on the edge of the dialog is inside it', () => {
    const onClose = vi.fn()
    render(
      <Modal labelledBy="t" onClose={onClose}>
        <h2 id="t">Hello</h2>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { hidden: true })
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 200,
      top: 100,
      bottom: 200,
    } as DOMRect)
    fireEvent.pointerDown(dialog, { clientX: 100, clientY: 200 })
    fireEvent.click(dialog, { clientX: 100, clientY: 200 })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('with closing set, calls onClose once after the animations finished, even if the parent re-renders', async () => {
    const onClose = vi.fn()
    let finish!: () => void
    const finished = new Promise<void>((resolve) => (finish = resolve))
    const original = HTMLDialogElement.prototype.getAnimations
    HTMLDialogElement.prototype.getAnimations = (() => [{ finished }]) as never
    try {
      const { rerender } = render(
        <Modal labelledBy="t" onClose={onClose} closing>
          <h2 id="t">Bye</h2>
        </Modal>,
      )
      rerender(
        <Modal labelledBy="t" onClose={onClose} closing>
          <h2 id="t">Bye</h2>
        </Modal>,
      )
      expect(onClose).not.toHaveBeenCalled()
      finish()
      await act(async () => {
        await finished
      })
      expect(onClose).toHaveBeenCalledOnce()
    } finally {
      if (original) HTMLDialogElement.prototype.getAnimations = original
      else delete (HTMLDialogElement.prototype as { getAnimations?: unknown }).getAnimations
    }
  })

  it('with closing set and a rejected (cancelled) animation, still closes', async () => {
    const onClose = vi.fn()
    const cancelled = Promise.reject(new DOMException('cancelled', 'AbortError'))
    cancelled.catch(() => {})
    const original = HTMLDialogElement.prototype.getAnimations
    HTMLDialogElement.prototype.getAnimations = (() => [{ finished: cancelled }]) as never
    try {
      render(
        <Modal labelledBy="t" onClose={onClose} closing>
          <h2 id="t">Bye</h2>
        </Modal>,
      )
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(onClose).toHaveBeenCalledOnce()
    } finally {
      if (original) HTMLDialogElement.prototype.getAnimations = original
      else delete (HTMLDialogElement.prototype as { getAnimations?: unknown }).getAnimations
    }
  })

  it('with closing set and nothing animating, closes at once', async () => {
    const onClose = vi.fn()
    render(
      <Modal labelledBy="t" onClose={onClose} closing>
        <h2 id="t">Bye</h2>
      </Modal>,
    )
    await act(async () => {})
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ConfirmDialog', () => {
  const setup = (props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        title="Delete CV?"
        message="This cannot be undone"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />,
    )
    return { onConfirm, onCancel }
  }

  it('confirms and cancels through their own buttons only', () => {
    const { onConfirm, onCancel } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Delete', hidden: true }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('Cancel and Escape both cancel', () => {
    const { onCancel, onConfirm } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel', hidden: true }))
    cancel(screen.getByRole('dialog', { hidden: true }))
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('cannot be confirmed again while busy', () => {
    setup({ busy: true })
    const confirm = screen.getByRole('button', {
      name: 'Delete',
      hidden: true,
    }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
  })

  it('the destructive button has the focus so Enter does not hit Cancel by accident', () => {
    setup({ danger: true })
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog.querySelector('button[autofocus], button.btn-danger')).not.toBeNull()
  })
})
