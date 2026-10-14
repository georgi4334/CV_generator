import type { DocumentType } from '@cv/shared'
import { ArrowLeft, Download, Link2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { FitToWidth } from '../../components/FitToWidth'
import { primaryButton, secondaryButton } from '../../components/PageHeader'
import { PAGE_SIZE_PX } from '../../cv-renderer/tokens'
import { Link, useParams } from 'react-router'
import { toApiRequestError } from '../../lib/api'
import { useCv } from '../../lib/cvQueries'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { printCv } from '../print/printCv'
import { ShareDialog } from '../share/ShareDialog'
import { useCvEditor } from './cvEditorStore'
import { LoadError, PageLoading } from './LoadStates'
import { PageCanvas } from './PageCanvas'
import { useCoverLetterStub } from './useEditorDocument'

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
  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-950">
      <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-slate-300 bg-white px-4 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <Link
          to={editTo}
          className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:underline dark:text-teal-300"
        >
          <ArrowLeft className="size-4" /> Back to editing
        </Link>
        <span className="min-w-0 flex-1 truncate text-slate-500">Preview · {title}</span>
        {actions}
      </header>
      <div className="px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
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
        <>
          <button
            type="button"
            onClick={() => setSharing(true)}
            className={secondaryButton}
            aria-label="Share"
          >
            <Link2 className="size-4" aria-hidden />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            type="button"
            onClick={() => printCv(cv, title)}
            className={primaryButton}
            aria-label="Download PDF"
            title="Opens the print dialog: choose “Save as PDF”"
          >
            <Download className="size-4" aria-hidden />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        </>
      }
    >
      <FitToWidth width={PAGE_SIZE_PX[cv.design.pageSize].width}>
        <PageCanvas cv={cv} title={title} mode="preview" />
      </FitToWidth>
      {sharing && (
        <ShareDialog cvId={query.data.id} title={title} onClose={() => setSharing(false)} />
      )}
    </PreviewFrame>
  )
}

function CoverLetterPreview() {
  const { id } = useParams()
  const stub = useCoverLetterStub(id)
  if (!stub) return <NotFoundPage />
  return (
    <PreviewFrame editTo={`/cover-letters/${stub.id}/edit`} title={stub.title}>
      <FitToWidth width={PAGE_SIZE_PX.A4.width}>
        <PageCanvas cv={null} title={stub.title} mode="preview" />
      </FitToWidth>
    </PreviewFrame>
  )
}

export function PreviewPage({ type }: { type: DocumentType }) {
  return type === 'cv' ? <CvPreview /> : <CoverLetterPreview />
}
