import { useEffect } from 'react'
import { useCvEditor } from './cvEditorStore'

interface UndoHistory {
  undo: () => void
  redo: () => void
}

/**
 * Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo, for the whole document.
 * `history` returns the open document's store (the CV editor by default).
 */
export function useUndoShortcuts(history: () => UndoHistory = () => useCvEditor.getState()) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      // Form inputs (e.g. the date picker) keep their own undo.
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) history().redo()
        else history().undo()
      } else if (key === 'y') {
        e.preventDefault()
        history().redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [history])
}
