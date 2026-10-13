import { JOB_STATUSES, JOB_STATUS_LABELS } from '@cv/shared'
import { Bell, Briefcase, FilePlus2, Mail } from 'lucide-react'
import { Link } from 'react-router'
import { DocumentTypeBadge } from '../components/Badges'
import { card, PageHeader } from '../components/PageHeader'
import { daysBetween, formatDate } from '../lib/format'
import { editPath } from '../lib/paths'
import { MOCK_DOCUMENTS, MOCK_JOBS, MOCK_TODAY } from '../mocks/data'

const QUICK_ACTIONS = [
  { to: '/cvs/new/edit', label: 'New CV', icon: FilePlus2 },
  { to: '/cover-letters/new/edit', label: 'New cover letter', icon: Mail },
  { to: '/jobs', label: 'Add job', icon: Briefcase },
]

export function DashboardPage() {
  const recent = [...MOCK_DOCUMENTS]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4)
  const counts = JOB_STATUSES.map((status) => ({
    status,
    count: MOCK_JOBS.filter((job) => job.status === status).length,
  }))
  const reminders = [
    ...MOCK_JOBS.filter(
      (job) =>
        job.status === 'applied' &&
        job.dateApplied &&
        daysBetween(job.dateApplied, MOCK_TODAY) >= 14,
    ).map((job) => ({
      id: job.id,
      text: `${job.position} at ${job.company}: applied ${daysBetween(job.dateApplied!, MOCK_TODAY)} days ago. Mark as "No answer"?`,
    })),
    ...MOCK_JOBS.filter(
      (job) => job.status === 'to_apply' && daysBetween(job.dateSaved, MOCK_TODAY) >= 7,
    ).map((job) => ({
      id: job.id,
      text: `${job.position} at ${job.company}: saved ${daysBetween(job.dateSaved, MOCK_TODAY)} days ago and still "To apply".`,
    })),
  ]

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
        <section className={`${card} p-5 lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent documents</h2>
            <Link
              to="/documents"
              className="text-sm text-teal-700 hover:underline dark:text-teal-300"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((doc) => (
              <li key={doc.id}>
                <Link
                  to={editPath(doc)}
                  className="flex items-center justify-between gap-4 py-3 hover:text-teal-700 dark:hover:text-teal-300"
                >
                  <span className="flex items-center gap-3">
                    <DocumentTypeBadge type={doc.type} />
                    {doc.title}
                  </span>
                  <span className="text-sm text-slate-500">{formatDate(doc.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="mb-4 font-semibold">Job pipeline</h2>
          <ul className="space-y-2">
            {counts.map(({ status, count }) => (
              <li key={status} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">
                  {JOB_STATUS_LABELS[status]}
                </span>
                <span className="font-semibold tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${card} p-5 lg:col-span-3`}>
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Bell className="size-4" /> Reminders
          </h2>
          {reminders.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing to follow up on.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {reminders.map((r) => (
                <li key={r.id}>
                  <Link to="/jobs" className="hover:text-teal-700 dark:hover:text-teal-300">
                    {r.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
