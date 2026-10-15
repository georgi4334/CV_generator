import {
  JOB_STATUS_LABELS,
  JOB_STATUSES,
  type DocumentSummary,
  type Job,
  type JobStatus,
} from '@cv/shared'
import { Bell, Briefcase, FilePlus2, Mail } from 'lucide-react'
import { Link } from 'react-router'
import { DocumentTypeBadge, SharedBadge } from '../components/Badges'
import { JOB_STATUS_STYLES } from '../components/badgeStyles'
import { card, PageHeader, primaryButton, secondaryButton } from '../components/PageHeader'
import { CvThumbnail, LetterThumbnail } from '../cv-renderer'
import { statusChange } from '../features/jobs/jobHelpers'
import { toApiRequestError } from '../lib/api'
import { useCv, useCvList } from '../lib/cvQueries'
import { formatDate, localToday } from '../lib/format'
import { useJobs, useUpdateJob } from '../lib/jobQueries'
import { useCoverLetter, useCoverLetterList } from '../lib/letterQueries'
import { editPath, NEW_CV_PATH, NEW_LETTER_PATH } from '../lib/paths'
import { remindersFor } from '../lib/reminders'

const QUICK_ACTIONS = [
  { to: NEW_CV_PATH, label: 'New CV', icon: FilePlus2 },
  { to: NEW_LETTER_PATH, label: 'New cover letter', icon: Mail },
  { to: '/jobs?add=1', label: 'Add job', icon: Briefcase },
]

const RECENT_COUNT = 4
const THUMBNAIL_WIDTH = 132

/** The first page of a document, or an empty page while it loads. */
function DocumentThumbnail({ doc }: { doc: DocumentSummary }) {
  const cv = useCv(doc.type === 'cv' ? doc.id : undefined).data
  const letter = useCoverLetter(doc.type === 'coverLetter' ? doc.id : undefined).data
  if (cv) return <CvThumbnail cv={cv.document} width={THUMBNAIL_WIDTH} />
  if (letter) return <LetterThumbnail letter={letter.document} width={THUMBNAIL_WIDTH} />
  return (
    <div
      aria-hidden
      className="animate-pulse rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
      style={{ width: THUMBNAIL_WIDTH, height: Math.round(THUMBNAIL_WIDTH * 1.414) }}
    />
  )
}

function RecentDocuments({ docs, loading }: { docs: DocumentSummary[]; loading: boolean }) {
  return (
    <section className={`${card} p-5 lg:col-span-2`} aria-labelledby="recent-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="recent-heading" className="font-semibold">
          Recent documents
        </h2>
        <Link to="/documents" className="text-sm text-teal-700 hover:underline dark:text-teal-300">
          View all
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading your documents…</p>
      ) : docs.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-500">
          <p>No documents yet. Your latest CVs and cover letters will show up here.</p>
          <Link to={NEW_CV_PATH} className={`${primaryButton} mt-3`}>
            <FilePlus2 className="size-4" /> Create your first CV
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link
                to={editPath(doc)}
                className="group flex h-full flex-col gap-2 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <DocumentThumbnail doc={doc} />
                <span className="line-clamp-2 text-sm font-medium group-hover:text-teal-700 dark:group-hover:text-teal-300">
                  {doc.title}
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <DocumentTypeBadge type={doc.type} />
                  {doc.shared && <SharedBadge />}
                  {formatDate(doc.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function JobPipeline({ jobs }: { jobs: Job[] }) {
  const counts = JOB_STATUSES.map((status) => ({
    status,
    count: jobs.filter((job) => job.status === status).length,
  }))
  const most = Math.max(1, ...counts.map((c) => c.count))
  return (
    <section className={`${card} p-5`} aria-labelledby="pipeline-heading">
      <h2 id="pipeline-heading" className="mb-4 font-semibold">
        Job pipeline
      </h2>
      <ul className="space-y-1">
        {counts.map(({ status, count }) => (
          <li key={status}>
            <Link
              to={`/jobs?status=${status}`}
              aria-label={`${JOB_STATUS_LABELS[status]}: ${count}`}
              className="block rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">
                  {JOB_STATUS_LABELS[status]}
                </span>
                <span className="font-semibold tabular-nums">{count}</span>
              </span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span
                  className={`block h-full rounded-full ${JOB_STATUS_STYLES[status].split(' ')[0]}`}
                  style={{ width: `${(count / most) * 100}%` }}
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to="/jobs"
        className="mt-3 inline-block text-sm text-teal-700 hover:underline dark:text-teal-300"
      >
        All saved jobs
      </Link>
    </section>
  )
}

function Reminders({ jobs, today }: { jobs: Job[]; today: string }) {
  const update = useUpdateJob()
  const reminders = remindersFor(jobs, today)
  const setStatus = (job: Job, status: JobStatus) =>
    // Same rule as the Saved Jobs table: leaving "To apply" fills in "Date applied".
    update.mutate({ id: job.id, change: statusChange(job, status) })

  return (
    <section className={`${card} p-5 lg:col-span-3`} aria-labelledby="reminders-heading">
      <h2 id="reminders-heading" className="mb-4 flex items-center gap-2 font-semibold">
        <Bell className="size-4" aria-hidden /> Reminders
        {reminders.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {reminders.length}
          </span>
        )}
      </h2>
      {update.isError && (
        <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
          Could not update the job: {toApiRequestError(update.error).message}
        </p>
      )}
      {reminders.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing to follow up on.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {reminders.map(({ job, days, kind }) => (
            <li key={job.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="min-w-0 flex-1">
                <Link
                  to={`/jobs?job=${job.id}`}
                  className="font-medium hover:text-teal-700 dark:hover:text-teal-300"
                >
                  {job.position} at {job.company}
                </Link>
                <span className="block text-slate-500 dark:text-slate-400">
                  {kind === 'no-answer'
                    ? `Applied ${days} days ago and no answer yet.`
                    : `Saved ${days} days ago and still “To apply”.`}
                </span>
              </span>
              {kind === 'no-answer' ? (
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setStatus(job, 'no_answer')}
                >
                  Mark as “No answer”
                </button>
              ) : (
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setStatus(job, 'applied')}
                >
                  I applied
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function DashboardPage() {
  const cvs = useCvList()
  const letters = useCoverLetterList()
  const jobs = useJobs().data ?? []
  const today = localToday()
  const recent = [...(cvs.data ?? []), ...(letters.data ?? [])]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, RECENT_COUNT)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your documents and job applications at a glance."
      />

      <section aria-label="Quick actions" className="mb-8 grid gap-4 sm:grid-cols-3">
        {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className={`${card} flex items-center gap-3 p-4 font-medium hover:border-teal-500 dark:hover:border-teal-500`}
          >
            <span className="rounded-lg bg-teal-50 p-2 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <Icon className="size-5" />
            </span>
            {label}
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentDocuments docs={recent} loading={cvs.isPending || letters.isPending} />
        <JobPipeline jobs={jobs} />
        <Reminders jobs={jobs} today={today} />
      </div>
    </>
  )
}
