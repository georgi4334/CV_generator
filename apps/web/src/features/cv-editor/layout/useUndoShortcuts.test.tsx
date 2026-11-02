import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useUndoShortcuts } from './useUndoShortcuts'

function Host({ history }: { history: { undo: () => void; redo: () => void } }) {
  useUndoShortcuts(() => history)
  return (
    <div>
      <input aria-label="field" />
      <textarea aria-label="area" />
      <select aria-label="pick" />
      <div contentEditable suppressContentEditableWarning aria-label="page" />
    </div>
  )
}

const setup = () => {
  const history = { undo: vi.fn(), redo: vi.fn() }
  const view = render(<Host history={history} />)
  return { history, ...view }
}

describe('undo shortcuts', () => {
  it.each([
    ['ctrl+z', { key: 'z', ctrlKey: true }, 'undo'],
    ['cmd+z', { key: 'z', metaKey: true }, 'undo'],
    ['ctrl+Z (caps lock)', { key: 'Z', ctrlKey: true }, 'undo'],
    ['ctrl+shift+z', { key: 'z', ctrlKey: true, shiftKey: true }, 'redo'],
    ['cmd+shift+z', { key: 'z', metaKey: true, shiftKey: true }, 'redo'],
    ['ctrl+y', { key: 'y', ctrlKey: true }, 'redo'],
  ] as const)('%s calls %s once', (_, init, method) => {
    const { history } = setup()
    fireEvent.keyDown(window, init)
    expect(history[method]).toHaveBeenCalledOnce()
    expect(history[method === 'undo' ? 'redo' : 'undo']).not.toHaveBeenCalled()
  })

  it.each([
    ['plain z', { key: 'z' }],
    ['ctrl+alt+z (AltGr)', { key: 'z', ctrlKey: true, altKey: true }],
    ['ctrl+x', { key: 'x', ctrlKey: true }],
    ['y without ctrl', { key: 'y' }],
    ['ctrl+enter', { key: 'Enter', ctrlKey: true }],
  ])('%s does nothing', (_, init) => {
    const { history } = setup()
    fireEvent.keyDown(window, init)
    expect(history.undo).not.toHaveBeenCalled()
    expect(history.redo).not.toHaveBeenCalled()
  })

  it.each(['field', 'area', 'pick'])(
    'leaves ctrl+z to the browser inside the "%s" control',
    (label) => {
      const { history, getByLabelText } = setup()
      const event = fireEvent.keyDown(getByLabelText(label), { key: 'z', ctrlKey: true })
      expect(event).toBe(true) // not default-prevented
      expect(history.undo).not.toHaveBeenCalled()
    },
  )

  it('handles ctrl+z typed inside the editable page and prevents the browser undo', () => {
    const { history, getByLabelText } = setup()
    const allowed = fireEvent.keyDown(getByLabelText('page'), { key: 'z', ctrlKey: true })
    expect(allowed).toBe(false)
    expect(history.undo).toHaveBeenCalledOnce()
  })

  it('stops listening when unmounted', () => {
    const { history, unmount } = setup()
    unmount()
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(history.undo).not.toHaveBeenCalled()
  })

  it('does not stack listeners when re-rendered many times', () => {
    const history = { undo: vi.fn(), redo: vi.fn() }
    const getHistory = () => history
    function Same() {
      useUndoShortcuts(getHistory)
      return null
    }
    const { rerender } = render(<Same />)
    for (let i = 0; i < 20; i++) rerender(<Same />)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(history.undo).toHaveBeenCalledOnce()
  })

  it('holding the key (auto-repeat) undoes once per event without throwing', () => {
    const { history } = setup()
    for (let i = 0; i < 50; i++)
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, repeat: true })
    expect(history.undo).toHaveBeenCalledTimes(50)
  })
})
