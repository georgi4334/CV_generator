import type { DocumentType } from '@cv/shared'
import { ArrowLeft, Download, Link2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FitToWidth } from '../../components/FitToWidth'
import { primaryButton, secondaryButton } from '../../components/PageHeader'
import { PAGE_SIZE_PX } from '../../cv-renderer/tokens'
import { Link, useParams } from 'react-router'
import { toApiRequestError } from '../../lib/api'
import { useCv } from '../../lib/cvQueries'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { printCv, printLetter } from '../print/printCv'
import { ShareDialog } from '../share/ShareDialog'
import { useCvEditor } from './cvEditorStore'
import { LoadError, PageLoading } from './LoadStates'
import { PageCanvas } from './PageCanvas'
import { LetterRenderer } from '../../cv-renderer'
import { useCoverLetter } from '../../lib/letterQueries'
import { useLetterEditor } from '../letter/letterEditorStore'

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
  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-950">
      <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-slate-300 bg-white px-4 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <Link
          to={editTo}
          className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:underline dark:text-teal-300"
        >
          <ArrowLeft className="size-4" /> {t('editor.preview.backToEditing')}
        </Link>
        <span className="min-w-0 flex-1 truncate text-slate-500">
          {t('editor.preview.title', { title })}
        </span>
        {actions}
      </header>
      <div className="px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  )
}

function PreviewActions({ onShare, onDownload }: { onShare: () => void; onDownload: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <button
        type="button"
        onClick={onShare}
        className={secondaryButton}
        aria-label={t('editor.preview.share')}
      >
        <Link2 className="size-4" aria-hidden />
        <span className="hidden sm:inline">{t('editor.preview.share')}</span>
      </button>
      <button
        type="button"
        onClick={onDownload}
        className={primaryButton}
        aria-label={t('editor.preview.downloadPdf')}
        title={t('editor.printTitle')}
      >
        <Download className="size-4" aria-hidden />
        <span className="hidden sm:inline">{t('editor.preview.downloadPdf')}</span>
      </button>
    </>
  )
}

function CvPreview() {
  const { id } = useParams()
  const query = useCv(id)
  // Coming straight from the editor, show its content even if the last save is still running.
  const editing = useCvEditor((s) => (s.docId === id ? s.cv : null))
  const [sharing, setSharing] = useState(false)

  if (query.isPending) return <PageLoading />
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

  if (query.isPending) return <PageLoading />
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
        <LetterRenderer letter={letter} mode="preview" pageClassName="shadow-lg" />
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
