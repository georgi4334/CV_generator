import { useEffect } from 'react'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'

/** How long a notice stays on screen. */
const NOTICE_MS = 3000

/** A short notice at the bottom of the editor; `raised` keeps it above the phone toolbar. */
export function Toast({ raised = false }: { raised?: boolean }) {
  const { notice, clearNotice } = useEditorUi()

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(clearNotice, NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice, clearNotice])

  if (!notice) return null
  return (
    <div
      role="status"
      className={`fixed left-1/2 z-(--z-toast) w-max max-w-[calc(100%-2*var(--spacing-gutter))] -translate-x-1/2 rounded-control bg-inverse px-4 py-2.5 text-center text-sm text-on-inverse shadow-overlay ${
        raised
          ? 'bottom-[calc(var(--spacing-bottom-nav)+var(--spacing-section))]'
          : 'bottom-section'
      }`}
    >
      {notice}
    </div>
  )
}
