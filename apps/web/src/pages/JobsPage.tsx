import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { JobStatusBadge, JobTypeBadge } from '../components/Badges'
import { card, PageHeader, primaryButton } from '../components/PageHeader'
import { formatDate } from '../lib/format'
import { findDocument, MOCK_JOBS } from '../mocks/data'

function DocLink({ id, type }: { id: string | null; type: 'cv' | 'coverLetter' }) {
  const doc = id ? findDocument(id) : undefined
  if (!doc) return <span className="text-slate-400">—</span>
  const to = type === 'cv' ? `/cvs/${doc.id}/edit` : `/cover-letters/${doc.id}/edit`
  return (
    <Link to={to} className="text-teal-700 hover:underline dark:text-teal-300">
      {doc.title}
    </Link>
  )
}

const COLUMNS = [
  'Position',
  'Company',
  'Status',
  'Date saved',
  'Date applied',
  'Type',
  'Resume',
  'Cover letter',
  'Notes',
]

export function JobsPage() {
  const jobs = [...MOCK_JOBS].sort((a, b) => b.dateSaved.localeCompare(a.dateSaved))

  return (
    <>
      <PageHeader
        title="Saved Jobs"
        description="Track where you applied and which documents you sent."
        actions={
          <button
            type="button"
            className={`${primaryButton} opacity-60`}
            disabled
            title="Coming in Step 12"
          >
            <Plus className="size-4" /> Add job
          </button>
        }
      />

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col} scope="col" className="px-4 py-3 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium">{job.position}</td>
                <td className="px-4 py-3">{job.company}</td>
                <td className="px-4 py-3">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(job.dateSaved)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(job.dateApplied)}</td>
                <td className="px-4 py-3">
                  <JobTypeBadge type={job.type} />
                </td>
                <td className="px-4 py-3">
                  <DocLink id={job.cvId} type="cv" />
                </td>
                <td className="px-4 py-3">
                  <DocLink id={job.coverLetterId} type="coverLetter" />
                </td>
                <td className="max-w-56 truncate px-4 py-3 text-slate-500" title={job.notes}>
                  {job.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Sorting, filters, inline editing and the job details drawer arrive in Step 12.
      </p>
    </>
  )
}
