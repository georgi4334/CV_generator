import { Link2 } from 'lucide-react'
import { JOB_STATUS_STYLES } from './badgeStyles'
import {
  JOB_STATUS_LABELS,
  JOB_TYPE_LABELS,
  type DocumentType,
  type JobStatus,
  type JobType,
} from '@cv/shared'

const pill =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap'

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={`${pill} ${JOB_STATUS_STYLES[status]}`}>{JOB_STATUS_LABELS[status]}</span>
}

export function JobTypeBadge({ type }: { type: JobType | null }) {
  if (!type) return <span className="text-slate-400">—</span>
  return (
    <span
      className={`${pill} border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300`}
    >
      {JOB_TYPE_LABELS[type]}
    </span>
  )
}

export function DocumentTypeBadge({ type }: { type: DocumentType }) {
  return type === 'cv' ? (
    <span className={`${pill} bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300`}>
      CV
    </span>
  ) : (
    <span className={`${pill} bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300`}>
      Cover letter
    </span>
  )
}

/** Marks a template that suits the CV's profession. */
export function RecommendedBadge({
  compact = false,
  className = '',
}: {
  /** Smaller, for template thumbnails in the editor panel. */
  compact?: boolean
  className?: string
}) {
  const size = compact ? 'rounded-full px-1.5 py-px text-[10px] font-medium' : pill
  return (
    <span
      className={`${size} bg-amber-100 text-amber-800 shadow-sm dark:bg-amber-950 dark:text-amber-300 ${className}`}
    >
      Recommended
    </span>
  )
}

/** The document has an active public share link. */
export function SharedBadge() {
  return (
    <span
      className={`${pill} gap-1 bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300`}
      title="Anyone with the share link can view this"
    >
      <Link2 className="size-3" aria-hidden /> Shared
    </span>
  )
}
