import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/** The document title in the top bar; click to rename, Enter or leaving the field saves. */
export function EditableTitle({
  value,
  onRename,
}: {
  value: string
  onRename: (title: string) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    const next = draft?.trim()
    setDraft(null)
    if (next && next !== value) onRename(next)
  }

  return (
    <input
      aria-label={t('editor.title.label')}
      title={t('editor.title.rename')}
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
      className="w-48 min-w-0 truncate rounded-tight bg-transparent px-1.5 py-0.5 text-fg-soft outline-none hover:bg-glass-hover focus:bg-glass-hover focus:ring-1 focus:ring-brand-line"
    />
  )
}
