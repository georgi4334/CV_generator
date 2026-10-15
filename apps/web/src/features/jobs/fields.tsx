import {
  JOB_STATUS_LABELS,
  JOB_STATUSES,
  JOB_TYPE_LABELS,
  JOB_TYPES,
  type DocumentSummary,
  type JobStatus,
  type JobType,
} from '@cv/shared'
import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { JOB_STATUS_STYLES } from '../../components/badgeStyles'
import { editPath } from '../../lib/paths'
import { inputClass } from './jobHelpers'

/** Status as a colored badge that is also a dropdown. */
export function StatusSelect({
  value,
  label,
  onChange,
}: {
  value: JobStatus
  label: string
  onChange: (status: JobStatus) => void
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as JobStatus)}
      className={`cursor-pointer rounded-full border-0 py-0.5 pr-7 pl-2.5 text-xs font-medium ${JOB_STATUS_STYLES[value]}`}
    >
      {JOB_STATUSES.map((status) => (
        <option key={status} value={status}>
          {JOB_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  )
}

export function TypeSelect({
  value,
  label,
  onChange,
  className = inputClass,
}: {
  value: JobType | null
  label: string
  onChange: (type: JobType | null) => void
  className?: string
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value || null) as JobType | null)}
      className={className}
    >
      <option value="">—</option>
      {JOB_TYPES.map((type) => (
        <option key={type} value={type}>
          {JOB_TYPE_LABELS[type]}
        </option>
      ))}
    </select>
  )
}

/** A date that may be empty; changes are kept only when complete. */
export function DateInput({
  value,
  label,
  onChange,
  className = inputClass,
}: {
  value: string | null
  label: string
  onChange: (date: string | null) => void
  className?: string
}) {
  return (
    <input
      type="date"
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => {
        const next = e.target.value
        if (next === '' || /^\d{4}-\d{2}-\d{2}$/.test(next)) onChange(next || null)
      }}
      className={className}
    />
  )
}

/** Short text edited in place: saved on Enter or when leaving the field, Escape undoes. */
export function InlineText({
  value,
  label,
  placeholder,
  onSave,
}: {
  value: string
  label: string
  placeholder?: string
  onSave: (text: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft !== null && draft !== value) onSave(draft)
    setDraft(null)
  }
  return (
    <input
      aria-label={label}
      title={value || undefined}
      placeholder={placeholder}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(value)
      }}
      className="w-full truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-600 hover:border-slate-300 focus:border-teal-600 focus:bg-white focus:outline-none dark:text-slate-300 dark:hover:border-slate-600 dark:focus:bg-slate-800"
    />
  )
}

/** Pick which CV or cover letter was sent; a link opens it. */
export function DocumentSelect({
  value,
  docs,
  label,
  onChange,
  className = inputClass,
}: {
  value: string | null
  docs: DocumentSummary[]
  label: string
  onChange: (id: string | null) => void
  className?: string
}) {
  const linked = docs.find((doc) => doc.id === value)
  return (
    <span className="flex min-w-0 items-center gap-1">
      <select
        aria-label={label}
        value={linked ? linked.id : ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={`min-w-0 flex-1 ${className}`}
      >
        <option value="">—</option>
        {docs.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.title}
          </option>
        ))}
      </select>
      {linked && (
        <Link
          to={editPath(linked)}
          aria-label={`Open ${linked.title}`}
          title={`Open ${linked.title}`}
          className="shrink-0 rounded p-1 text-teal-700 hover:bg-slate-100 dark:text-teal-300 dark:hover:bg-slate-800"
        >
          <ExternalLink className="size-3.5" />
        </Link>
      )}
    </span>
  )
}
