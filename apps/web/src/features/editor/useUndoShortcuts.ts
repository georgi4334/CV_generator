import { useEffect } from 'react'
import { useCvEditor } from './cvEditorStore'

/** Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo, for the whole CV. */
export function useUndoShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      // Form inputs (e.g. the date picker) keep their own undo.
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) useCvEditor.getState().redo()
        else useCvEditor.getState().undo()
      } else if (key === 'y') {
        e.preventDefault()
        useCvEditor.getState().redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
