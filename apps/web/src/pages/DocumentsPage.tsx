import type { DocumentSummary } from '@cv/shared'
import {
  ChevronDown,
  Copy,
  Download,
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, NavLink, useParams } from 'react-router'
import { DocumentTypeBadge } from '../components/Badges'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { card, PageHeader, primaryButton, secondaryButton } from '../components/PageHeader'
import { toApiRequestError } from '../lib/api'
import { useCvList, useDeleteCvs, useDuplicateCv, useRenameCv } from '../lib/cvQueries'
import { formatDate } from '../lib/format'
import {
  DOCUMENT_SUBTABS,
  editPath,
  isDocumentSubtab,
  NEW_CV_PATH,
  type DocumentSubtab,
} from '../lib/paths'
import { MOCK_COVER_LETTERS, MOCK_JOBS } from '../mocks/data'

type SortKey = 'updated' | 'created' | 'name' | 'type'

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'updated', label: 'Last edited' },
  { key: 'created', label: 'Date created' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'type', label: 'Type' },
]

const compare: Record<SortKey, (a: DocumentSummary, b: DocumentSummary) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  type: (a, b) => a.type.localeCompare(b.type) || b.updatedAt.localeCompare(a.updatedAt),
}

/** Cover letters are sample data until Step 13, so they cannot be changed yet. */
const isEditable = (doc: DocumentSummary) => doc.type === 'cv'

function CreateNewButton({ subtab }: { subtab: DocumentSubtab }) {
  const [open, setOpen] = useState(false)

  if (subtab === 'cvs') {
    return (
      <Link to={NEW_CV_PATH} className={primaryButton}>
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
            to={NEW_CV_PATH}
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

interface RowActions {
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function RowMenu({ doc, actions }: { doc: DocumentSummary; actions: RowActions }) {
  const [open, setOpen] = useState(false)
  const editable = isEditable(doc)
  const item =
    'flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-slate-800'
  const run = (action: () => void) => () => {
    setOpen(false)
    action()
  }
  return (
    <div
      className="relative"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Actions for ${doc.title}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div
          role="menu"
          className={`${card} absolute right-0 z-20 mt-1 w-44 overflow-hidden py-1 text-sm`}
        >
          <Link role="menuitem" to={editPath(doc)} className={item}>
            <FileText className="size-4" /> Open
          </Link>
          <button
            type="button"
            role="menuitem"
            className={item}
            disabled={!editable}
            onClick={run(actions.onRename)}
          >
            <Pencil className="size-4" /> Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            disabled={!editable}
            onClick={run(actions.onDuplicate)}
          >
            <Copy className="size-4" /> Copy
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            disabled
            title="PDF download arrives in Step 11"
          >
            <Download className="size-4" /> Download
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-red-600 dark:text-red-400`}
            disabled={!editable}
            onClick={run(actions.onDelete)}
          >
            <Trash2 className="size-4" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

function RenameInput({
  doc,
  onDone,
}: {
  doc: DocumentSummary
  onDone: (title: string | null) => void
}) {
  const [value, setValue] = useState(doc.title)
  return (
    <input
      aria-label={`New name for ${doc.title}`}
      autoFocus
      maxLength={200}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDone(value.trim() && value.trim() !== doc.title ? value.trim() : null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') onDone(null)
      }}
      className="w-full rounded-md border border-teal-600 bg-white px-2 py-1 font-medium dark:bg-slate-800"
    />
  )
}

export function DocumentsPage() {
  const { subtab } = useParams()
  const cvs = useCvList()
  const rename = useRenameCv()
  const duplicate = useDuplicateCv()
  const remove = useDeleteCvs()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('updated')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<DocumentSummary[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const documents = useMemo(() => {
    if (!isDocumentSubtab(subtab)) return []
    const all = [...(cvs.data ?? []), ...MOCK_COVER_LETTERS]
    const needle = query.trim().toLowerCase()
    return all
      .filter(
        (doc) =>
          subtab === 'all' || (subtab === 'cvs' ? doc.type === 'cv' : doc.type === 'coverLetter'),
      )
      .filter((doc) => !needle || doc.title.toLowerCase().includes(needle))
      .sort(compare[sort])
  }, [cvs.data, subtab, query, sort])

  if (!isDocumentSubtab(subtab)) return <Navigate to="/documents/all" replace />

  const selectable = documents.filter(isEditable)
  const selectedDocs = selectable.filter((doc) => selected.has(doc.id))
  const allSelected = selectable.length > 0 && selectedDocs.length === selectable.length
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const report = (prefix: string) => (e: unknown) =>
    setMessage(`${prefix}: ${toApiRequestError(e).message}`)

  const duplicateMany = async (docs: DocumentSummary[]) => {
    setMessage(null)
    for (const doc of docs) {
      try {
        await duplicate.mutateAsync(doc.id)
      } catch (e) {
        report(`"${doc.title}" was not copied`)(e)
        return
      }
    }
    setMessage(docs.length === 1 ? 'Copy created.' : `${docs.length} copies created.`)
  }

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
            onClick={() => setSelected(new Set())}
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

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Search documents"
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          Sort by
          <select
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {SORTS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedDocs.length > 0 && (
        <div
          role="toolbar"
          aria-label="Selected documents"
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm dark:bg-teal-950/50"
        >
          <span className="mr-auto font-medium">{selectedDocs.length} selected</span>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => void duplicateMany(selectedDocs)}
          >
            <Copy className="size-4" /> Copy
          </button>
          <button
            type="button"
            className={`${secondaryButton} opacity-50`}
            disabled
            title="PDF download arrives in Step 11"
          >
            <Download className="size-4" /> Download
          </button>
          <button
            type="button"
            className={`${secondaryButton} text-red-600 dark:text-red-400`}
            onClick={() => setToDelete(selectedDocs)}
          >
            <Trash2 className="size-4" /> Delete
          </button>
        </div>
      )}

      {message && (
        <p role="status" className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          {message}
        </p>
      )}

      <div className={card}>
        <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
          <input
            type="checkbox"
            aria-label="Select all"
            disabled={selectable.length === 0}
            checked={allSelected}
            onChange={() =>
              setSelected(allSelected ? new Set() : new Set(selectable.map((doc) => doc.id)))
            }
          />
          <span className="flex-1">Name</span>
          <span className="hidden w-28 text-right sm:block">Last edited</span>
          <span className="w-8" />
        </div>

        {cvs.isPending && (
          <p className="px-4 py-6 text-sm text-slate-500">Loading your documents…</p>
        )}
        {cvs.isError && (
          <div className="flex items-center gap-3 px-4 py-6 text-sm">
            <span className="text-red-600">
              Could not load your CVs: {toApiRequestError(cvs.error).message}
            </span>
            <button type="button" className={secondaryButton} onClick={() => void cvs.refetch()}>
              Try again
            </button>
          </div>
        )}
        {!cvs.isPending && documents.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            {query ? 'No documents match your search.' : 'Nothing here yet.'}
            {!query && subtab !== 'cover-letters' && (
              <div className="mt-3">
                <Link to={NEW_CV_PATH} className={primaryButton}>
                  <Plus className="size-4" /> Create your first CV
                </Link>
              </div>
            )}
          </div>
        )}

        <ul aria-label="Documents" className="divide-y divide-slate-100 dark:divide-slate-800">
          {documents.map((doc) => {
            const job = MOCK_JOBS.find((j) => j.id === doc.jobId)
            const editable = isEditable(doc)
            return (
              <li
                key={doc.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${doc.title}`}
                  disabled={!editable}
                  title={editable ? undefined : 'Cover letters arrive in Step 13'}
                  checked={selected.has(doc.id)}
                  onChange={() => toggle(doc.id)}
                />
                <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  <FileText className="size-4 text-slate-400" />
                </span>
                <div className="min-w-0 flex-1">
                  {renaming === doc.id ? (
                    <RenameInput
                      doc={doc}
                      onDone={(title) => {
                        setRenaming(null)
                        if (title)
                          rename.mutate({ id: doc.id, title }, { onError: report('Not renamed') })
                      }}
                    />
                  ) : (
                    <Link
                      to={editPath(doc)}
                      className="block truncate font-medium hover:text-teal-700 dark:hover:text-teal-300"
                    >
                      {doc.title}
                    </Link>
                  )}
                  <span className="block truncate text-sm text-slate-500">
                    {job ? `For ${job.position} at ${job.company}` : 'Not linked to a job'}
                  </span>
                </div>
                <DocumentTypeBadge type={doc.type} />
                <span className="hidden w-28 text-right text-sm text-slate-500 sm:block">
                  {formatDate(doc.updatedAt)}
                </span>
                <RowMenu
                  doc={doc}
                  actions={{
                    onRename: () => setRenaming(doc.id),
                    onDuplicate: () => void duplicateMany([doc]),
                    onDelete: () => setToDelete([doc]),
                  }}
                />
              </li>
            )
          })}
        </ul>
      </div>

      {toDelete && (
        <ConfirmDialog
          title={toDelete.length === 1 ? 'Delete this CV?' : `Delete ${toDelete.length} CVs?`}
          message={
            toDelete.length === 1
              ? `"${toDelete[0]!.title}" and its version history will be deleted. This cannot be undone.`
              : 'They will be deleted with their version history. This cannot be undone.'
          }
          confirmLabel="Delete"
          danger
          busy={remove.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            const ids = toDelete.map((doc) => doc.id)
            remove.mutate(ids, {
              onSuccess: () =>
                setMessage(ids.length === 1 ? 'CV deleted.' : `${ids.length} CVs deleted.`),
              onError: report('Not everything was deleted'),
              onSettled: () => {
                setToDelete(null)
                setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))))
              },
            })
          }}
        />
      )}
    </>
  )
}
