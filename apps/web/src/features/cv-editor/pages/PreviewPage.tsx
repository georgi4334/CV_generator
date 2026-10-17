import type { DocumentType } from '@cv/shared'
import { ArrowLeft, Download, Link2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FitToWidth } from '@/shared/ui/FitToWidth'
import { PAGE_SIZE_PX } from '@/renderer/templates/tokens'
import { Link, useParams } from 'react-router'
import { toApiRequestError } from '@/shared/api/client'
import { useCv } from '@/features/cv-editor/queries'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { printCv, printLetter } from '@/features/print/printCv'
import { ShareDialog } from '@/features/share/ShareDialog'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { EditorLoading, LoadError } from '@/shared/ui/LoadStates'
import { PageCanvas } from '@/features/cv-editor/layout/PageCanvas'
import { LetterRenderer } from '@/renderer'
import { useCoverLetter } from '@/features/cover-letters/queries'
import { useLetterEditor } from '@/features/cover-letters/state/letterEditorStore'

function PreviewFrame({
  editTo,
  title,
  actions,
  children,
}: {
  editTo: string
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  // The same floating glass pills as the editor's top bar, over the app's gradient.
  return (
    <div className="app-backdrop min-h-dvh text-fg">
      <header className="pointer-events-none sticky top-0 z-(--z-raised) flex items-center gap-2 px-3 pt-3 pb-1 *:pointer-events-auto md:gap-3 md:px-4">
        <Link
          to={editTo}
          className="glass flex h-10 shrink-0 items-center gap-2 rounded-pill px-3.5 text-sm font-medium text-fg-soft hover:text-fg max-sm:size-10 max-sm:justify-center max-sm:px-0"
          aria-label={t('editor.preview.backToEditing')}
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="max-sm:sr-only">{t('editor.preview.backToEditing')}</span>
        </Link>
        <span className="glass-pill flex h-10 min-w-0 flex-1 items-center px-4 text-sm text-fg-muted md:max-w-xl md:flex-none">
          <span className="truncate">{t('editor.preview.title', { title })}</span>
        </span>
        <div className="ml-auto">{actions}</div>
      </header>
      <div className="px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  )
}

function PreviewActions({ onShare, onDownload }: { onShare: () => void; onDownload: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="glass-pill flex items-center gap-1">
      <button
        type="button"
        onClick={onShare}
        className="pill-item h-8"
        aria-label={t('editor.preview.share')}
      >
        <Link2 className="size-4" aria-hidden />
        <span className="hidden sm:inline">{t('editor.preview.share')}</span>
      </button>
      <button
        type="button"
        onClick={onDownload}
        className="btn btn-primary btn-sm h-8 rounded-pill"
        aria-label={t('editor.preview.downloadPdf')}
        title={t('editor.printTitle')}
      >
        <Download className="size-4" aria-hidden />
        <span className="hidden sm:inline">{t('editor.preview.downloadPdf')}</span>
      </button>
    </div>
  )
}

function CvPreview() {
  const { id } = useParams()
  const query = useCv(id)
  // Coming straight from the editor, show its content even if the last save is still running.
  const editing = useCvEditor((s) => (s.docId === id ? s.cv : null))
  const [sharing, setSharing] = useState(false)

  if (query.isPending) return <EditorLoading />
  if (query.isError) {
    const error = toApiRequestError(query.error)
    if (error.status === 404 || error.status === 400) return <NotFoundPage />
    return <LoadError error={error} onRetry={() => void query.refetch()} />
  }
  const { title } = query.data
  const cv = editing ?? query.data.document
  return (
    <PreviewFrame
      editTo={`/cvs/${query.data.id}/edit`}
      title={title}
      actions={
        <PreviewActions onShare={() => setSharing(true)} onDownload={() => printCv(cv, title)} />
      }
    >
      <FitToWidth width={PAGE_SIZE_PX[cv.design.pageSize].width}>
        <PageCanvas cv={cv} mode="preview" />
      </FitToWidth>
      {sharing && (
        <ShareDialog id={query.data.id} title={title} onClose={() => setSharing(false)} />
      )}
    </PreviewFrame>
  )
}

function CoverLetterPreview() {
  const { id } = useParams()
  const query = useCoverLetter(id)
  // Coming straight from the editor, show its content even if the last save is still running.
  const editing = useLetterEditor((s) => (s.docId === id ? s.letter : null))
  const [sharing, setSharing] = useState(false)

  if (query.isPending) return <EditorLoading />
  if (query.isError) {
    const error = toApiRequestError(query.error)
    if (error.status === 404 || error.status === 400) return <NotFoundPage />
    return <LoadError error={error} onRetry={() => void query.refetch()} />
  }
  const { title } = query.data
  const letter = editing ?? query.data.document
  return (
    <PreviewFrame
      editTo={`/cover-letters/${query.data.id}/edit`}
      title={title}
      actions={
        <PreviewActions
          onShare={() => setSharing(true)}
          onDownload={() => printLetter(letter, title)}
        />
      }
    >
      <FitToWidth width={PAGE_SIZE_PX[letter.design.pageSize].width}>
        <LetterRenderer letter={letter} mode="preview" pageClassName="shadow-paper" />
      </FitToWidth>
      {sharing && (
        <ShareDialog
          type="coverLetter"
          id={query.data.id}
          title={title}
          onClose={() => setSharing(false)}
        />
      )}
    </PreviewFrame>
  )
}

export function PreviewPage({ type }: { type: DocumentType }) {
  return type === 'cv' ? <CvPreview /> : <CoverLetterPreview />
}
