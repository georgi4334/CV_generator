import type { Job } from '@cv/shared'
import { useTranslation } from 'react-i18next'
import { JobTypeBadge } from '@/shared/ui/Badges'
import { formatDate } from '@/shared/lib/format'
import { StatusSelect } from './fields'
import { statusChange } from '@/features/jobs/jobHelpers'
import { useJobActions } from '@/features/jobs/jobContext'

/** Saved Jobs on small screens: one card per job; tap the title for all details. */
export function JobCards({ jobs }: { jobs: Job[] }) {
  const { t } = useTranslation()
  const { update, open, cvs } = useJobActions()
  return (
    <ul aria-label={t('jobs.list')} className="space-y-3">
      {jobs.map((job) => {
        const cv = cvs.find((c) => c.id === job.cvId)
        return (
          <li key={job.id} className="glass p-4">
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => open(job)} className="min-w-0 text-left">
                <span className="block font-medium">{job.position}</span>
                <span className="block text-sm text-fg-muted">
                  {job.company}
                  {job.location && ` · ${job.location}`}
                </span>
              </button>
              <StatusSelect
                value={job.status}
                label={t('jobs.cell.statusFor', { position: job.position })}
                onChange={(status) => update(job, statusChange(job, status))}
              />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-fg-muted">
              <dt>{t('jobs.card.saved')}</dt>
              <dd>{formatDate(job.dateSaved)}</dd>
              <dt>{t('jobs.card.applied')}</dt>
              <dd>{formatDate(job.dateApplied)}</dd>
              <dt>{t('jobs.card.type')}</dt>
              <dd>
                <JobTypeBadge type={job.type} />
              </dd>
              <dt>{t('jobs.card.resume')}</dt>
              <dd className="truncate">{cv?.title ?? '—'}</dd>
            </dl>
            {job.notes && <p className="mt-2 line-clamp-2 text-sm text-fg-soft">{job.notes}</p>}
          </li>
        )
      })}
    </ul>
  )
}
