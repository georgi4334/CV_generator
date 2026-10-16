import {
  JOB_STATUSES,
  JOB_TYPES,
  type Job,
  type JobStatus,
  type JobType,
  type UpdateJobInput,
} from '@cv/shared'
import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { card, PageHeader, primaryButton, secondaryButton } from '../components/PageHeader'
import { JobCards } from '../features/jobs/JobCards'
import { JobDrawer } from '../features/jobs/JobDrawer'
import { JobsTable } from '../features/jobs/JobsTable'
import { JobActionsContext, type JobActions } from '../features/jobs/jobContext'
import { errorMessage } from '../lib/errorMessage'
import { useCvList } from '../lib/cvQueries'
import { useCoverLetterList } from '../lib/letterQueries'
import { useDeleteJob, useJobs, useUpdateJob } from '../lib/jobQueries'
import { useMediaQuery } from '../lib/useMediaQuery'

const select =
  'rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900'

type Drawer = { kind: 'add' } | { kind: 'job'; id: string } | null

export function JobsPage() {
  const { t } = useTranslation()
  const jobsQuery = useJobs()
  // The table needs room; phones get one card per job.
  const wide = useMediaQuery('(min-width: 768px)')
  const cvs = useCvList().data
  const letters = useCoverLetterList().data
  const update = useUpdateJob()
  const remove = useDeleteJob()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  // The Dashboard links here with ?status= (pipeline) or ?job= (reminders).
  const [status, setStatus] = useState<JobStatus | 'all'>(() => {
    const requested = params.get('status')
    return JOB_STATUSES.find((s) => s === requested) ?? 'all'
  })
  const [type, setType] = useState<JobType | 'all'>('all')
  // /jobs?add=1 opens the form straight away, /jobs?job=<id> that job's details.
  const [drawer, setDrawer] = useState<Drawer>(() => {
    const jobId = params.get('job')
    if (jobId) return { kind: 'job', id: jobId }
    return params.get('add') === '1' ? { kind: 'add' } : null
  })
  const [toDelete, setToDelete] = useState<Job | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // The request is read once; keep the address clean afterwards.
    if (['add', 'job', 'status'].some((key) => params.has(key))) setParams({}, { replace: true })
  }, [params, setParams])

  const all = jobsQuery.data
  const jobs = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (all ?? []).filter(
      (job) =>
        (status === 'all' || job.status === status) &&
        (type === 'all' || job.type === type) &&
        (!needle ||
          [job.position, job.company, job.location, job.notes].some((text) =>
            text.toLowerCase().includes(needle),
          )),
    )
  }, [all, query, status, type])

  const actions = useMemo<JobActions>(
    () => ({
      cvs: (cvs ?? []).filter((doc) => doc.type === 'cv'),
      letters: letters ?? [],
      update: (job: Job, change: UpdateJobInput) => {
        setMessage(null)
        update.mutate(
          { id: job.id, change },
          {
            onError: (e) =>
              setMessage(t('jobs.saveError', { position: job.position, message: errorMessage(e) })),
          },
        )
      },
      open: (job: Job) => setDrawer({ kind: 'job', id: job.id }),
      remove: setToDelete,
    }),
    [cvs, letters, update, t],
  )

  const openJob = drawer?.kind === 'job' ? all?.find((job) => job.id === drawer.id) : undefined
  const filtered = query.trim() !== '' || status !== 'all' || type !== 'all'

  return (
    <JobActionsContext.Provider value={actions}>
      <PageHeader
        title={t('jobs.title')}
        description={t('jobs.description')}
        actions={
          <button
            type="button"
            className={primaryButton}
            onClick={() => setDrawer({ kind: 'add' })}
          >
            <Plus className="size-4" /> {t('jobs.add')}
          </button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label={t('jobs.search.label')}
            placeholder={t('jobs.search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <select
          aria-label={t('jobs.filterStatus')}
          value={status}
          onChange={(e) => setStatus(e.target.value as JobStatus | 'all')}
          className={select}
        >
          <option value="all">{t('jobs.allStatuses')}</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`labels.jobStatus.${s}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('jobs.filterType')}
          value={type}
          onChange={(e) => setType(e.target.value as JobType | 'all')}
          className={select}
        >
          <option value="all">{t('jobs.allTypes')}</option>
          {JOB_TYPES.map((jobType) => (
            <option key={jobType} value={jobType}>
              {t(`labels.jobType.${jobType}`)}
            </option>
          ))}
        </select>
        {filtered && (
          <button
            type="button"
            className={secondaryButton}
            onClick={() => {
              setQuery('')
              setStatus('all')
              setType('all')
            }}
          >
            {t('jobs.clearFilters')}
          </button>
        )}
      </div>

      {message && (
        <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
          {message}
        </p>
      )}

      {jobsQuery.isPending ? (
        <p className="py-6 text-sm text-slate-500">{t('jobs.loading')}</p>
      ) : jobsQuery.isError ? (
        <div className="flex items-center gap-3 py-6 text-sm">
          <span className="text-red-600">
            {t('jobs.loadError', { message: errorMessage(jobsQuery.error) })}
          </span>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => void jobsQuery.refetch()}
          >
            {t('common.tryAgain')}
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className={`${card} px-4 py-10 text-center text-sm text-slate-500`}>
          {filtered ? (
            t('jobs.noMatch')
          ) : (
            <>
              <p>{t('jobs.empty')}</p>
              <button
                type="button"
                className={`${primaryButton} mt-3`}
                onClick={() => setDrawer({ kind: 'add' })}
              >
                <Plus className="size-4" /> {t('jobs.addFirst')}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500" aria-live="polite">
            {jobs.length === all?.length
              ? t('jobs.count', { count: jobs.length })
              : t('jobs.filteredCount', { count: all?.length ?? 0, shown: jobs.length })}
          </p>
          {wide ? (
            <div className={`${card} overflow-x-auto`}>
              <JobsTable jobs={jobs} />
            </div>
          ) : (
            <JobCards jobs={jobs} />
          )}
        </>
      )}

      {(drawer?.kind === 'add' || openJob) && (
        <JobDrawer
          key={openJob?.id ?? 'new'}
          job={openJob ?? null}
          onClose={() => setDrawer(null)}
          onDelete={setToDelete}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title={t('jobs.deleteTitle')}
          message={t('jobs.deleteMessage', {
            position: toDelete.position,
            company: toDelete.company,
          })}
          confirmLabel={t('common.delete')}
          danger
          busy={remove.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() =>
            remove.mutate(toDelete.id, {
              onSuccess: () => {
                if (drawer?.kind === 'job' && drawer.id === toDelete.id) setDrawer(null)
              },
              onError: (e) => setMessage(t('jobs.deleteError', { message: errorMessage(e) })),
              onSettled: () => setToDelete(null),
            })
          }
        />
      )}
    </JobActionsContext.Provider>
  )
}
