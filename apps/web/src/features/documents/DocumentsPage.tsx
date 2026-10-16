import type { DocumentSummary } from '@cv/shared'
import {
  ChevronDown,
  Copy,
  Download,
  FileText,
  Link2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, NavLink, useParams } from 'react-router'
import { DocumentTypeBadge, SharedBadge } from '@/shared/ui/Badges'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { card, PageHeader, primaryButton, secondaryButton } from '@/shared/ui/PageHeader'
import { ShareDialog } from '@/features/share/ShareDialog'
import { errorMessage } from '@/shared/api/errorMessage'
import { useCvList } from '@/features/cv-editor/queries'
import { useDocumentActions } from './documentActions'
import { useCoverLetterList } from '@/features/cover-letters/queries'
import { formatDate } from '@/shared/lib/format'
import {
  DOCUMENT_SUBTABS,
  editPath,
  isDocumentSubtab,
  NEW_CV_PATH,
  NEW_LETTER_PATH,
  type DocumentSubtab,
} from '@/shared/lib/paths'
import { useJobs } from '@/features/jobs/queries'

type SortKey = 'updated' | 'created' | 'name' | 'type'

const SORTS: SortKey[] = ['updated', 'created', 'name', 'type']

const compare: Record<SortKey, (a: DocumentSummary, b: DocumentSummary) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  type: (a, b) => a.type.localeCompare(b.type) || b.updatedAt.localeCompare(a.updatedAt),
}

function CreateNewButton({ subtab }: { subtab: DocumentSubtab }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (subtab === 'cvs') {
    return (
      <Link to={NEW_CV_PATH} className={primaryButton}>
        <Plus className="size-4" /> {t('documents.createCv')}
      </Link>
    )
  }
  if (subtab === 'cover-letters') {
    return (
      <Link to={NEW_LETTER_PATH} className={primaryButton}>
        <Plus className="size-4" /> {t('documents.createLetter')}
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
        <Plus className="size-4" /> {t('documents.createNew')} <ChevronDown className="size-4" />
      </button>
      {open && (
        <div
          role="menu"
          className={`${card} absolute right-0 z-(--z-dropdown) mt-2 w-menu overflow-hidden py-1 text-sm`}
        >
          <Link role="menuitem" to={NEW_CV_PATH} className="block px-4 py-2 hover:bg-muted">
            {t('labels.documentType.cv')}
          </Link>
          <Link role="menuitem" to={NEW_LETTER_PATH} className="block px-4 py-2 hover:bg-muted">
            {t('labels.documentType.coverLetter')}
          </Link>
        </div>
      )}
    </div>
  )
}

interface RowActions {
  onRename: () => void
  onDuplicate: () => void
  onDownload: () => void
  onShare: () => void
  onDelete: () => void
}

function RowMenu({ doc, actions }: { doc: DocumentSummary; actions: RowActions }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const item =
    'flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
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
        aria-label={t('documents.actionsFor', { title: doc.title })}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-tight p-1.5 text-fg-muted hover:bg-muted"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div
          role="menu"
          className={`${card} absolute right-0 z-(--z-dropdown) mt-1 w-menu overflow-hidden py-1 text-sm`}
        >
          <Link role="menuitem" to={editPath(doc)} className={item}>
            <FileText className="size-4" /> {t('documents.menu.open')}
          </Link>
          <button type="button" role="menuitem" className={item} onClick={run(actions.onRename)}>
            <Pencil className="size-4" /> {t('documents.menu.rename')}
          </button>
          <button type="button" role="menuitem" className={item} onClick={run(actions.onDuplicate)}>
            <Copy className="size-4" /> {t('documents.menu.copy')}
          </button>
          <button type="button" role="menuitem" className={item} onClick={run(actions.onDownload)}>
            <Download className="size-4" /> {t('documents.menu.downloadPdf')}
          </button>
          <button type="button" role="menuitem" className={item} onClick={run(actions.onShare)}>
            <Link2 className="size-4" /> {t('documents.menu.share')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-danger-fg`}
            onClick={run(actions.onDelete)}
          >
            <Trash2 className="size-4" /> {t('common.delete')}
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
  const { t } = useTranslation()
  const [value, setValue] = useState(doc.title)
  return (
    <input
      aria-label={t('documents.renameLabel', { title: doc.title })}
      autoFocus
      maxLength={200}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDone(value.trim() && value.trim() !== doc.title ? value.trim() : null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') onDone(null)
      }}
      className="w-full rounded-tight border border-brand-line bg-surface px-2 py-1 font-medium"
    />
  )
}

export function DocumentsPage() {
  const { t } = useTranslation()
  const { subtab } = useParams()
  const cvs = useCvList()
  const letters = useCoverLetterList()
  const actions = useDocumentActions()
  const { remove } = actions
  const jobs = useJobs().data ?? []
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('updated')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<DocumentSummary[] | null>(null)
  const [sharing, setSharing] = useState<DocumentSummary | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const documents = useMemo(() => {
    if (!isDocumentSubtab(subtab)) return []
    const all = [...(cvs.data ?? []), ...(letters.data ?? [])]
    const needle = query.trim().toLowerCase()
    return all
      .filter(
        (doc) =>
          subtab === 'all' || (subtab === 'cvs' ? doc.type === 'cv' : doc.type === 'coverLetter'),
      )
      .filter((doc) => !needle || doc.title.toLowerCase().includes(needle))
      .sort(compare[sort])
  }, [cvs.data, letters.data, subtab, query, sort])

  if (!isDocumentSubtab(subtab)) return <Navigate to="/documents/all" replace />

  const selectable = documents
  const loading = cvs.isPending || letters.isPending
  const loadError = cvs.error ?? letters.error
  const selectedDocs = selectable.filter((doc) => selected.has(doc.id))
  const allSelected = selectable.length > 0 && selectedDocs.length === selectable.length
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const report = (build: (message: string) => string) => (e: unknown) =>
    setMessage(build(errorMessage(e)))

  const download = async (doc: DocumentSummary) => {
    setMessage(null)
    try {
      await actions.download(doc)
      setMessage(t('documents.messages.printHint'))
    } catch (e) {
      report((message) => t('documents.messages.downloadFailed', { title: doc.title, message }))(e)
    }
  }

  const duplicateMany = async (docs: DocumentSummary[]) => {
    setMessage(null)
    for (const doc of docs) {
      try {
        await actions.duplicate(doc)
      } catch (e) {
        report((message) => t('documents.messages.copyFailed', { title: doc.title, message }))(e)
        return
      }
    }
    setMessage(t('documents.messages.copied', { count: docs.length }))
  }

  return (
    <>
      <PageHeader
        title={t('documents.title')}
        description={t('documents.description')}
        actions={<CreateNewButton subtab={subtab} />}
      />

      <nav aria-label={t('documents.tabsLabel')} className="mb-4 flex gap-2">
        {DOCUMENT_SUBTABS.map((tab) => (
          <NavLink
            key={tab.id}
            to={`/documents/${tab.id}`}
            onClick={() => setSelected(new Set())}
            className={({ isActive }) =>
              `rounded-pill px-4 py-1.5 text-sm font-medium ${
                isActive
                  ? 'bg-brand text-on-brand'
                  : 'bg-surface text-fg-soft ring-1 ring-line hover:bg-muted '
              }`
            }
          >
            {t(`documents.tabs.${tab.id}`)}
          </NavLink>
        ))}
      </nav>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-faint" />
          <input
            type="search"
            aria-label={t('documents.search.label')}
            placeholder={t('documents.search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-control border border-line-strong bg-surface py-2 pr-3 pl-9 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-fg-soft">
          {t('documents.sortBy')}
          <select
            aria-label={t('documents.sortBy')}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-control border border-line-strong bg-surface px-2 py-2 text-sm"
          >
            {SORTS.map((key) => (
              <option key={key} value={key}>
                {t(`documents.sort.${key}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedDocs.length > 0 && (
        <div
          role="toolbar"
          aria-label={t('documents.selection.toolbar')}
          className="mb-3 flex flex-wrap items-center gap-2 rounded-control bg-brand-soft px-3 py-2 text-sm"
        >
          <span className="mr-auto font-medium">
            {t('documents.selection.count', { count: selectedDocs.length })}
          </span>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => void duplicateMany(selectedDocs)}
          >
            <Copy className="size-4" /> {t('documents.selection.copy')}
          </button>
          <button
            type="button"
            className={`${secondaryButton} disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={selectedDocs.length !== 1}
            title={selectedDocs.length === 1 ? undefined : t('documents.selection.downloadHint')}
            onClick={() => void download(selectedDocs[0]!)}
          >
            <Download className="size-4" /> {t('documents.selection.download')}
          </button>
          <button
            type="button"
            className={`${secondaryButton} text-danger-fg`}
            onClick={() => setToDelete(selectedDocs)}
          >
            <Trash2 className="size-4" /> {t('common.delete')}
          </button>
        </div>
      )}

      {message && (
        <p role="status" className="mb-3 text-sm text-fg-soft">
          {message}
        </p>
      )}

      <div className={card}>
        <div className="flex items-center gap-4 border-b border-line px-4 py-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            aria-label={t('documents.selection.selectAll')}
            disabled={selectable.length === 0}
            checked={allSelected}
            onChange={() =>
              setSelected(allSelected ? new Set() : new Set(selectable.map((doc) => doc.id)))
            }
          />
          <span className="flex-1">{t('documents.list.name')}</span>
          <span className="hidden w-28 text-right sm:block">{t('documents.list.lastEdited')}</span>
          <span className="w-8" />
        </div>

        {loading && (
          <p className="px-4 py-6 text-sm text-fg-muted">{t('documents.list.loading')}</p>
        )}
        {loadError && (
          <div className="flex items-center gap-3 px-4 py-6 text-sm">
            <span className="text-danger-fg">
              {t('documents.list.loadError', { message: errorMessage(loadError) })}
            </span>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                void cvs.refetch()
                void letters.refetch()
              }}
            >
              {t('common.tryAgain')}
            </button>
          </div>
        )}
        {!loading && documents.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-fg-muted">
            {query ? t('documents.list.noMatch') : t('documents.list.empty')}
            {!query && subtab !== 'cover-letters' && (
              <div className="mt-3">
                <Link to={NEW_CV_PATH} className={primaryButton}>
                  <Plus className="size-4" /> {t('documents.list.createFirst')}
                </Link>
              </div>
            )}
          </div>
        )}

        <ul aria-label={t('documents.list.label')} className="divide-y divide-line">
          {documents.map((doc) => {
            const job = jobs.find((j) => j.id === doc.jobId)
            return (
              <li key={doc.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted">
                <input
                  type="checkbox"
                  aria-label={t('documents.selection.select', { title: doc.title })}
                  checked={selected.has(doc.id)}
                  onChange={() => toggle(doc.id)}
                />
                <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded-tight border border-line bg-page">
                  <FileText className="size-4 text-fg-faint" />
                </span>
                <div className="min-w-0 flex-1">
                  {renaming === doc.id ? (
                    <RenameInput
                      doc={doc}
                      onDone={(title) => {
                        setRenaming(null)
                        if (title)
                          actions
                            .rename(doc, title)
                            .catch(
                              report((message) =>
                                t('documents.messages.renameFailed', { message }),
                              ),
                            )
                      }}
                    />
                  ) : (
                    <Link
                      to={editPath(doc)}
                      className="block truncate font-medium hover:text-brand-fg"
                    >
                      {doc.title}
                    </Link>
                  )}
                  <span className="block truncate text-sm text-fg-muted">
                    {job
                      ? t('documents.list.forJob', { position: job.position, company: job.company })
                      : t('documents.list.noJob')}
                  </span>
                </div>
                {doc.shared && <SharedBadge />}
                <DocumentTypeBadge type={doc.type} />
                <span className="hidden w-28 text-right text-sm text-fg-muted sm:block">
                  {formatDate(doc.updatedAt)}
                </span>
                <RowMenu
                  doc={doc}
                  actions={{
                    onRename: () => setRenaming(doc.id),
                    onDuplicate: () => void duplicateMany([doc]),
                    onDownload: () => void download(doc),
                    onShare: () => setSharing(doc),
                    onDelete: () => setToDelete([doc]),
                  }}
                />
              </li>
            )
          })}
        </ul>
      </div>

      {sharing && (
        <ShareDialog
          type={sharing.type}
          id={sharing.id}
          title={sharing.title}
          onClose={() => setSharing(null)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title={
            toDelete.length === 1
              ? t(
                  toDelete[0]!.type === 'cv'
                    ? 'documents.confirm.deleteCvTitle'
                    : 'documents.confirm.deleteLetterTitle',
                )
              : t('documents.confirm.deleteManyTitle', { count: toDelete.length })
          }
          message={
            toDelete.length === 1
              ? t(
                  toDelete[0]!.type === 'cv'
                    ? 'documents.confirm.deleteCvMessage'
                    : 'documents.confirm.deleteLetterMessage',
                  { title: toDelete[0]!.title },
                )
              : t('documents.confirm.deleteManyMessage')
          }
          confirmLabel={t('common.delete')}
          danger
          busy={remove.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            const ids = toDelete.map((doc) => doc.id)
            remove.mutate(toDelete, {
              onSuccess: () => setMessage(t('documents.messages.deleted', { count: ids.length })),
              onError: report((message) => t('documents.messages.deleteFailed', { message })),
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
