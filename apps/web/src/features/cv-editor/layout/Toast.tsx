import { useEffect } from 'react'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'

export function Toast() {
  const { notice, clearNotice } = useEditorUi()

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(clearNotice, 3000)
    return () => clearTimeout(timer)
  }, [notice, clearNotice])

  if (!notice) return null
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
    >
      {notice}
    </div>
  )
}
