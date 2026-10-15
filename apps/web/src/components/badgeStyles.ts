import type { JobStatus } from '@cv/shared'

/** Badge colors per job status (also used by the inline status picker). */
export const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  to_apply: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  interviewing: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  negotiating: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  no_answer: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
}
