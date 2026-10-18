import { JOB_STATUSES, type DocumentSummary, type Job, type JobStatus } from '@cv/shared'
import { Bell, Briefcase, FilePlus2, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { DocumentTypeBadge, SharedBadge } from '@/shared/ui/Badges'
import { JOB_STATUS_STYLES } from '@/shared/ui/badgeStyles'
import { PageHeader, primaryButton, secondaryButton } from '@/shared/ui/PageHeader'
import { CvThumbnail, LetterThumbnail, ResignationThumbnail } from '@/renderer'
import { statusChange } from '@/features/jobs/jobHelpers'
import { errorMessage } from '@/shared/api/errorMessage'
import { useCv, useCvList } from '@/features/cv-editor/queries'
import { formatDate, localToday } from '@/shared/lib/format'
import { useJobs, useUpdateJob } from '@/features/jobs/queries'
import { useCoverLetter, useCoverLetterList } from '@/features/cover-letters/queries'
import { useResignation, useResignationList } from '@/features/resignation/queries'
import { editPath, NEW_CV_PATH, NEW_LETTER_PATH } from '@/shared/lib/paths'
import { remindersFor } from './reminders'
import { JobInsights } from './JobInsights'
import { TransitionLink } from '@/shared/ui/TransitionLink'
import { useDocTransitionStyle } from '@/shared/lib/viewTransitions'
import { LoadingRegion, Skeleton, SkeletonText } from '@/shared/ui/Skeleton'

const QUICK_ACTIONS = [
  { to: NEW_CV_PATH, label: 'dashboard.newCv', icon: FilePlus2 },
  { to: NEW_LETTER_PATH, label: 'dashboard.newLetter', icon: Mail },
  { to: '/jobs?add=1', label: 'dashboard.addJob', icon: Briefcase },
] as const

const RECENT_COUNT = 4
const THUMBNAIL_WIDTH = 132
/** Placeholders shown while the recent documents load. */
const RECENT_PLACEHOLDERS = RECENT_COUNT

/** The first page of a document, or an empty page while it loads. */
function DocumentThumbnail({ doc }: { doc: DocumentSummary }) {
  const cv = useCv(doc.type === 'cv' ? doc.id : undefined).data
  const letter = useCoverLetter(doc.type === 'coverLetter' ? doc.id : undefined).data
  const resignation = useResignation(doc.type === 'resignation' ? doc.id : undefined).data
  // The page zooms open from here, and shrinks back here when closed.
  const transitionStyle = useDocTransitionStyle(doc.id)
  return (
    <div data-transition-source style={transitionStyle} className="w-fit">
      {cv ? (
        <CvThumbnail cv={cv.document} width={THUMBNAIL_WIDTH} />
      ) : letter ? (
        <LetterThumbnail letter={letter.document} width={THUMBNAIL_WIDTH} />
      ) : resignation ? (
        <ResignationThumbnail letter={resignation.document} width={THUMBNAIL_WIDTH} />
      ) : (
        <ThumbnailSkeleton />
      )}
    </div>
  )
}

/** A page-shaped placeholder the size of a thumbnail. */
function ThumbnailSkeleton() {
  return <Skeleton className="aspect-paper" style={{ width: THUMBNAIL_WIDTH }} />
}

/** While the list loads: thumbnails, titles and badges in the shape of real documents. */
function RecentDocumentsSkeleton() {
  const { t } = useTranslation()
  return (
    <LoadingRegion label={t('dashboard.recent.loading')}>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: RECENT_PLACEHOLDERS }, (_, i) => (
          <li key={i} className="flex flex-col gap-2 p-2">
            <ThumbnailSkeleton />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  )
}

function RecentDocuments({ docs, loading }: { docs: DocumentSummary[]; loading: boolean }) {
  const { t } = useTranslation()
  return (
    <section className="glass p-5 lg:col-span-2" aria-labelledby="recent-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="recent-heading" className="font-semibold">
          {t('dashboard.recent.heading')}
        </h2>
        <Link to="/documents" className="tap-target text-sm text-brand-fg hover:underline">
          {t('dashboard.recent.viewAll')}
        </Link>
      </div>
      {loading ? (
        <RecentDocumentsSkeleton />
      ) : docs.length === 0 ? (
        <div className="py-6 text-center text-sm text-fg-muted">
          <p>{t('dashboard.recent.empty')}</p>
          <Link to={NEW_CV_PATH} className={`${primaryButton} mt-3`}>
            <FilePlus2 className="size-4" /> {t('dashboard.recent.createFirst')}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {docs.map((doc) => (
            <li key={doc.id}>
              <TransitionLink
                to={editPath(doc)}
                transition="doc-open"
                docId={doc.id}
                className="group flex h-full flex-col gap-2 rounded-control p-2 hover:bg-glass-hover"
              >
                <DocumentThumbnail doc={doc} />
                <span className="line-clamp-2 text-sm font-medium group-hover:text-brand-fg">
                  {doc.title}
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                  <DocumentTypeBadge type={doc.type} />
                  {doc.shared && <SharedBadge />}
                  {formatDate(doc.updatedAt)}
                </span>
              </TransitionLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function JobPipeline({ jobs }: { jobs: Job[] }) {
  const { t } = useTranslation()
  const counts = JOB_STATUSES.map((status) => ({
    status,
    count: jobs.filter((job) => job.status === status).length,
  }))
  const most = Math.max(1, ...counts.map((c) => c.count))
  return (
    <section className="glass p-5" aria-labelledby="pipeline-heading">
      <h2 id="pipeline-heading" className="mb-4 font-semibold">
        {t('dashboard.pipeline.heading')}
      </h2>
      <ul className="space-y-1">
        {counts.map(({ status, count }) => (
          <li key={status}>
            <Link
              to={`/jobs?status=${status}`}
              className="block rounded-tight px-2 py-1.5 text-sm hover:bg-glass-hover"
            >
              <span className="flex items-center justify-between">
                <span className="text-fg-soft">{t(`labels.jobStatus.${status}`)}</span>
                {/* Read as "Applied: 3"; the colon is only for screen readers. */}
                <span className="sr-only">:</span>{' '}
                <span className="font-semibold tabular-nums">{count}</span>
              </span>
              <span className="mt-1 block h-1 overflow-hidden rounded-pill bg-muted">
                <span
                  className={`block h-full rounded-pill ${JOB_STATUS_STYLES[status].split(' ')[0]}`}
                  style={{ width: `${(count / most) * 100}%` }}
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/jobs" className="tap-target mt-3 text-sm text-brand-fg hover:underline">
        {t('dashboard.pipeline.allJobs')}
      </Link>
    </section>
  )
}

function Reminders({ jobs, today }: { jobs: Job[]; today: string }) {
  const { t } = useTranslation()
  const update = useUpdateJob()
  const reminders = remindersFor(jobs, today)
  const setStatus = (job: Job, status: JobStatus) =>
    // Same rule as the Saved Jobs table: leaving "To apply" fills in "Date applied".
    update.mutate({ id: job.id, change: statusChange(job, status) })

  return (
    <section className="glass p-5 lg:col-span-3" aria-labelledby="reminders-heading">
      <h2 id="reminders-heading" className="mb-4 flex items-center gap-2 font-semibold">
        <Bell className="size-4" aria-hidden /> {t('dashboard.reminders.heading')}
        {reminders.length > 0 && (
          <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-fg">
            {reminders.length}
          </span>
        )}
      </h2>
      {update.isError && (
        <p role="alert" className="mb-3 text-sm text-danger-fg">
          {t('dashboard.reminders.updateError', { message: errorMessage(update.error) })}
        </p>
      )}
      {reminders.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('dashboard.reminders.none')}</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {reminders.map(({ job, days, kind }) => (
            <li key={job.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="min-w-0 flex-1">
                <Link to={`/jobs?job=${job.id}`} className="font-medium hover:text-brand-fg">
                  {t('dashboard.reminders.jobAt', { position: job.position, company: job.company })}
                </Link>
                <span className="block text-fg-muted">
                  {kind === 'no-answer'
                    ? t('dashboard.reminders.noAnswer', { count: days })
                    : t('dashboard.reminders.toApply', {
                        count: days,
                        status: t('labels.jobStatus.to_apply'),
                      })}
                </span>
              </span>
              {kind === 'no-answer' ? (
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setStatus(job, 'no_answer')}
                >
                  {t('dashboard.reminders.markNoAnswer', {
                    status: t('labels.jobStatus.no_answer'),
                  })}
                </button>
              ) : (
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setStatus(job, 'applied')}
                >
                  {t('dashboard.reminders.applied')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * While the jobs load, the cards that depend on them are skeletons: showing
 * them empty would claim "Nothing to follow up on" before anyone has looked.
 */
function JobCardsSkeleton() {
  const { t } = useTranslation()
  const card = (className: string, lines: number) => (
    <section className={`glass p-5 ${className}`}>
      <LoadingRegion label={t('jobs.loading')}>
        <Skeleton className="mb-4 h-4 w-1/3" />
        <SkeletonText lines={lines} />
      </LoadingRegion>
    </section>
  )
  return (
    <>
      {card('', 5)}
      {card('lg:col-span-2', 5)}
      {card('', 3)}
      {card('lg:col-span-3', 2)}
    </>
  )
}

/** If the jobs cannot be loaded, say so (and offer to retry) instead of showing empty cards. */
function JobCardsError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <section className="glass flex flex-wrap items-center gap-3 p-5 lg:col-span-3">
      <p role="alert" className="min-w-0 flex-1 text-sm text-danger-fg">
        {t('dashboard.jobsError', { message: errorMessage(error) })}
      </p>
      <button type="button" className={secondaryButton} onClick={onRetry}>
        {t('common.tryAgain')}
      </button>
    </section>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const cvs = useCvList()
  const letters = useCoverLetterList()
  const resignations = useResignationList()
  const jobsQuery = useJobs()
  const jobs = jobsQuery.data ?? []
  const today = localToday()
  const recent = [...(cvs.data ?? []), ...(letters.data ?? []), ...(resignations.data ?? [])]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, RECENT_COUNT)

  return (
    <>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      <section aria-label={t('dashboard.quickActions')} className="mb-8 grid gap-4 sm:grid-cols-3">
        {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="glass flex items-center gap-3 p-4 font-medium hover:border-brand-line"
          >
            <span className="rounded-control bg-brand-soft p-2 text-brand-fg">
              <Icon className="size-5" />
            </span>
            {t(label)}
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentDocuments
          docs={recent}
          loading={cvs.isPending || letters.isPending || resignations.isPending}
        />
        {jobsQuery.isError ? (
          <JobCardsError error={jobsQuery.error} onRetry={() => void jobsQuery.refetch()} />
        ) : jobsQuery.isPending ? (
          <JobCardsSkeleton />
        ) : (
          <>
            <JobPipeline jobs={jobs} />
            <JobInsights jobs={jobs} />
            <Reminders jobs={jobs} today={today} />
          </>
        )}
      </div>
    </>
  )
}
