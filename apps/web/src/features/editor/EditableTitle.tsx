import { useState } from 'react'

/** The document title in the top bar; click to rename, Enter or leaving the field saves. */
export function EditableTitle({
  value,
  onRename,
}: {
  value: string
  onRename: (title: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    const next = draft?.trim()
    setDraft(null)
    if (next && next !== value) onRename(next)
  }

  return (
    <input
      aria-label="Document title"
      title="Rename"
      maxLength={200}
      value={draft ?? value}
      onFocus={() => setDraft(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(null)
          requestAnimationFrame(() => (e.target as HTMLInputElement).blur())
        }
      }}
      className="w-48 min-w-0 truncate rounded bg-transparent px-1.5 py-0.5 text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-teal-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
    />
  )
}
