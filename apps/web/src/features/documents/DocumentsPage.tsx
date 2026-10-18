import type { DocumentSummary, DocumentType } from '@cv/shared'
import {
  ChevronDown,
  Copy,
  Download,
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
import { DocumentTypeBadge, DocumentTypeIcon, SharedBadge } from '@/shared/ui/Badges'
import { DOCUMENT_TYPE_STYLES } from '@/shared/ui/badgeStyles'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { PageHeader, primaryButton, secondaryButton } from '@/shared/ui/PageHeader'
import { ShareDialog } from '@/features/share/ShareDialog'
import { errorMessage } from '@/shared/api/errorMessage'
import { useCvList } from '@/features/cv-editor/queries'
import { useDocumentActions } from './documentActions'
import { useCoverLetterList } from '@/features/cover-letters/queries'
import { useResignationList } from '@/features/resignation/queries'
import { formatDate } from '@/shared/lib/format'
import {
  DOCUMENT_SUBTABS,
  editPath,
  isDocumentSubtab,
  NEW_CV_PATH,
  NEW_LETTER_PATH,
  NEW_RESIGNATION_PATH,
  type DocumentSubtab,
} from '@/shared/lib/paths'
import { useJobs } from '@/features/jobs/queries'
import { ListSkeleton } from '@/shared/ui/Skeleton'
import { TransitionLink } from '@/shared/ui/TransitionLink'
import { useMenu } from '@/shared/ui/useMenu'
import { useDocTransitionStyle } from '@/shared/lib/viewTransitions'
import { showToast, type ToastTone } from '@/shared/stores/toasts'

type SortKey = 'updated' | 'created' | 'name' | 'type'

const SORTS: SortKey[] = ['updated', 'created', 'name', 'type']

/** The button of an empty list: create the kind of document the tab lists (a CV on "All"). */
const FIRST_DOCUMENT = {
  all: { to: NEW_CV_PATH, label: 'documents.list.createFirst' },
  cvs: { to: NEW_CV_PATH, label: 'documents.list.createFirst' },
  'cover-letters': { to: NEW_LETTER_PATH, label: 'documents.list.createFirstLetter' },
  resignations: { to: NEW_RESIGNATION_PATH, label: 'documents.list.createFirstResignation' },
} as const

/** The confirmation texts of deleting one document, per type. */
const DELETE_TITLE = {
  cv: 'documents.confirm.deleteCvTitle',
  coverLetter: 'documents.confirm.deleteLetterTitle',
  resignation: 'documents.confirm.deleteResignationTitle',
} as const
const DELETE_MESSAGE = {
  cv: 'documents.confirm.deleteCvMessage',
  coverLetter: 'documents.confirm.deleteLetterMessage',
  resignation: 'documents.confirm.deleteResignationMessage',
} as const

/** The document type each tab lists (the "All documents" tab lists every type). */
const DOCUMENT_TYPE_OF_SUBTAB: Record<Exclude<DocumentSubtab, 'all'>, DocumentType> = {
  cvs: 'cv',
  'cover-letters': 'coverLetter',
  resignations: 'resignation',
}

const compare: Record<SortKey, (a: DocumentSummary, b: DocumentSummary) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  type: (a, b) => a.type.localeCompare(b.type) || b.updatedAt.localeCompare(a.updatedAt),
}

function CreateNewButton({ subtab }: { subtab: DocumentSubtab }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { triggerRef, menuRef, onKeyDown } = useMenu(open, setOpen)

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
  if (subtab === 'resignations') {
    return (
      <Link to={NEW_RESIGNATION_PATH} className={primaryButton}>
        <Plus className="size-4" /> {t('documents.createResignation')}
      </Link>
    )
  }
  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={primaryButton}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Plus className="size-4" /> {t('documents.createNew')} <ChevronDown className="size-4" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="glass-menu absolute right-0 z-(--z-dropdown) mt-2 w-menu"
        >
          <Link role="menuitem" to={NEW_CV_PATH} className="menu-item">
            {t('labels.documentType.cv')}
          </Link>
          <Link role="menuitem" to={NEW_LETTER_PATH} className="menu-item">
            {t('labels.documentType.coverLetter')}
          </Link>
          <Link role="menuitem" to={NEW_RESIGNATION_PATH} className="menu-item">
            {t('labels.documentType.resignation')}
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

/**
 * The icon of a row: a CV is a teal page with a person, a cover letter a blue
 * envelope. The opened page shrinks back into it when closed.
 */
function DocumentIcon({ docId, type }: { docId: string; type: DocumentType }) {
  const transitionStyle = useDocTransitionStyle(docId)
  return (
    <span
      data-doc-icon
      data-doc-type={type}
      style={transitionStyle}
      className={`flex h-12 w-9 shrink-0 items-center justify-center rounded-tight border border-line ${DOCUMENT_TYPE_STYLES[type]}`}
    >
      <DocumentTypeIcon type={type} className="size-5" />
    </span>
  )
}

function RowMenu({ doc, actions }: { doc: DocumentSummary; actions: RowActions }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { triggerRef, menuRef, onKeyDown } = useMenu(open, setOpen)
  const item = 'menu-item'
  const run = (action: () => void) => () => {
    setOpen(false)
    // Focus goes back to the button first, so a dialog the action opens returns it there when closed.
    triggerRef.current?.focus()
    action()
  }
  return (
    <div
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={t('documents.actionsFor', { title: doc.title })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="btn-icon p-1.5"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="glass-menu absolute right-0 z-(--z-dropdown) mt-1 w-menu"
        >
          <TransitionLink
            role="menuitem"
            to={editPath(doc)}
            transition="doc-open"
            docId={doc.id}
            transitionSource={(link) =>
              link.closest('li')?.querySelector<HTMLElement>('[data-doc-icon]')
            }
            className={item}
          >
            <DocumentTypeIcon type={doc.type} /> {t('documents.menu.open')}
          </TransitionLink>
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
  const resignations = useResignationList()
  const actions = useDocumentActions()
  const { remove } = actions
  const jobs = useJobs().data ?? []
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('updated')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<DocumentSummary[] | null>(null)
  const [sharing, setSharing] = useState<DocumentSummary | null>(null)

  const documents = useMemo(() => {
    if (!isDocumentSubtab(subtab)) return []
    const all = [...(cvs.data ?? []), ...(letters.data ?? []), ...(resignations.data ?? [])]
    const needle = query.trim().toLowerCase()
    return all
      .filter((doc) => subtab === 'all' || DOCUMENT_TYPE_OF_SUBTAB[subtab] === doc.type)
      .filter((doc) => !needle || doc.title.toLowerCase().includes(needle))
      .sort(compare[sort])
  }, [cvs.data, letters.data, resignations.data, subtab, query, sort])

  if (!isDocumentSubtab(subtab)) return <Navigate to="/documents/all" replace />

  const selectable = documents
  const loading = cvs.isPending || letters.isPending || resignations.isPending
  const loadError = cvs.error ?? letters.error ?? resignations.error
  const selectedDocs = selectable.filter((doc) => selected.has(doc.id))
  const allSelected = selectable.length > 0 && selectedDocs.length === selectable.length
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  // Results show as toasts: failures stay until closed, the rest fade away.
  const say = (tone: ToastTone, message: string) => showToast({ id: 'documents', tone, message })
  const report = (build: (message: string) => string) => (e: unknown) =>
    say('error', build(errorMessage(e)))

  const download = async (doc: DocumentSummary) => {
    try {
      await actions.download(doc)
      say('info', t('documents.messages.printHint'))
    } catch (e) {
      report((message) => t('documents.messages.downloadFailed', { title: doc.title, message }))(e)
    }
  }

  const duplicateMany = async (docs: DocumentSummary[]) => {
    for (const doc of docs) {
      try {
        await actions.duplicate(doc)
      } catch (e) {
        report((message) => t('documents.messages.copyFailed', { title: doc.title, message }))(e)
        return
      }
    }
    say('success', t('documents.messages.copied', { count: docs.length }))
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
                  : 'bg-glass text-fg-soft ring-1 ring-glass-border backdrop-blur-glass hover:bg-glass-strong'
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

      <div className="glass">
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

        {loading && <ListSkeleton label={t('documents.list.loading')} />}
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
            {!query && (
              <div className="mt-3">
                <Link to={FIRST_DOCUMENT[subtab].to} className={primaryButton}>
                  <Plus className="size-4" /> {t(FIRST_DOCUMENT[subtab].label)}
                </Link>
              </div>
            )}
          </div>
        )}

        <ul aria-label={t('documents.list.label')} className="divide-y divide-line">
          {documents.map((doc) => {
            const job = jobs.find((j) => j.id === doc.jobId)
            return (
              <li key={doc.id} className="flex items-center gap-4 px-4 py-3 hover:bg-glass-hover">
                <input
                  type="checkbox"
                  aria-label={t('documents.selection.select', { title: doc.title })}
                  checked={selected.has(doc.id)}
                  onChange={() => toggle(doc.id)}
                />
                <DocumentIcon docId={doc.id} type={doc.type} />
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
                    <TransitionLink
                      to={editPath(doc)}
                      transition="doc-open"
                      docId={doc.id}
                      // The row's icon is what grows into the page.
                      transitionSource={(link) =>
                        link.closest('li')?.querySelector<HTMLElement>('[data-doc-icon]')
                      }
                      className="block truncate font-medium hover:text-brand-fg"
                    >
                      {doc.title}
                    </TransitionLink>
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
              ? t(DELETE_TITLE[toDelete[0]!.type])
              : t('documents.confirm.deleteManyTitle', { count: toDelete.length })
          }
          message={
            toDelete.length === 1
              ? t(DELETE_MESSAGE[toDelete[0]!.type], { title: toDelete[0]!.title })
              : t('documents.confirm.deleteManyMessage')
          }
          confirmLabel={t('common.delete')}
          danger
          busy={remove.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            const ids = toDelete.map((doc) => doc.id)
            remove.mutate(toDelete, {
              onSuccess: () =>
                say('success', t('documents.messages.deleted', { count: ids.length })),
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
