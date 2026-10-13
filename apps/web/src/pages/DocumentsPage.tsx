import { ChevronDown, FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, NavLink, useParams } from 'react-router'
import { DocumentTypeBadge } from '../components/Badges'
import { card, PageHeader, primaryButton } from '../components/PageHeader'
import { formatDate } from '../lib/format'
import { DOCUMENT_SUBTABS, editPath, isDocumentSubtab, type DocumentSubtab } from '../lib/paths'
import { MOCK_DOCUMENTS, MOCK_JOBS } from '../mocks/data'

function CreateNewButton({ subtab }: { subtab: DocumentSubtab }) {
  const [open, setOpen] = useState(false)

  if (subtab === 'cvs') {
    return (
      <Link to="/cvs/new/edit" className={primaryButton}>
        <Plus className="size-4" /> Create new CV
      </Link>
    )
  }
  if (subtab === 'cover-letters') {
    return (
      <Link to="/cover-letters/new/edit" className={primaryButton}>
        <Plus className="size-4" /> Create new cover letter
      </Link>
    )
  }
  return (
    <div className="relative">
      <button
        type="button"
        className={primaryButton}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Plus className="size-4" /> Create new <ChevronDown className="size-4" />
      </button>
      {open && (
        <div
          role="menu"
          className={`${card} absolute right-0 z-10 mt-2 w-48 overflow-hidden py-1 text-sm`}
        >
          <Link
            role="menuitem"
            to="/cvs/new/edit"
            className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            CV
          </Link>
          <Link
            role="menuitem"
            to="/cover-letters/new/edit"
            className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cover letter
          </Link>
        </div>
      )}
    </div>
  )
}

export function DocumentsPage() {
  const { subtab } = useParams()
  if (!isDocumentSubtab(subtab)) return <Navigate to="/documents/all" replace />

  const documents = MOCK_DOCUMENTS.filter(
    (doc) =>
      subtab === 'all' || (subtab === 'cvs' ? doc.type === 'cv' : doc.type === 'coverLetter'),
  ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <>
      <PageHeader
        title="Documents"
        description="Your CVs and cover letters."
        actions={<CreateNewButton subtab={subtab} />}
      />

      <nav aria-label="Document types" className="mb-4 flex gap-2">
        {DOCUMENT_SUBTABS.map((tab) => (
          <NavLink
            key={tab.id}
            to={`/documents/${tab.id}`}
            className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-medium ${
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800 dark:hover:bg-slate-800'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <ul className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
        {documents.map((doc) => {
          const job = MOCK_JOBS.find((j) => j.id === doc.jobId)
          return (
            <li key={doc.id}>
              <Link
                to={editPath(doc)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  <FileText className="size-4 text-slate-400" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{doc.title}</span>
                  <span className="block truncate text-sm text-slate-500">
                    {job ? `For ${job.position} at ${job.company}` : 'Not linked to a job'}
                  </span>
                </span>
                <DocumentTypeBadge type={doc.type} />
                <span className="hidden w-28 text-right text-sm text-slate-500 sm:block">
                  {formatDate(doc.updatedAt)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Sorting, selection, copy, download and delete arrive with the backend in Step 9.
      </p>
    </>
  )
}
