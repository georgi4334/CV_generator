import {
  JOB_STATUS_LABELS,
  JOB_TYPE_LABELS,
  type DocumentType,
  type JobStatus,
  type JobType,
} from '@cv/shared'

const STATUS_STYLES: Record<JobStatus, string> = {
  to_apply: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  interviewing: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  negotiating: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  no_answer: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
}

const pill =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap'

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={`${pill} ${STATUS_STYLES[status]}`}>{JOB_STATUS_LABELS[status]}</span>
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
