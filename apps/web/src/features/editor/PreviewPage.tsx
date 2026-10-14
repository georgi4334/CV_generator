import type { DocumentType } from '@cv/shared'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { toApiRequestError } from '../../lib/api'
import { useCv } from '../../lib/cvQueries'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { useCvEditor } from './cvEditorStore'
import { LoadError, PageLoading } from './LoadStates'
import { PageCanvas } from './PageCanvas'
import { useCoverLetterStub } from './useEditorDocument'

function PreviewFrame({
  editTo,
  title,
  children,
}: {
  editTo: string
  title: string
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
        <span className="text-slate-500">Preview · {title}</span>
      </header>
      <div className="flex justify-center overflow-auto px-6 py-8">{children}</div>
    </div>
  )
}

function CvPreview() {
  const { id } = useParams()
  const query = useCv(id)
  // Coming straight from the editor, show its content even if the last save is still running.
  const editing = useCvEditor((s) => (s.docId === id ? s.cv : null))

  if (query.isPending) return <PageLoading />
  if (query.isError) {
    const error = toApiRequestError(query.error)
    if (error.status === 404 || error.status === 400) return <NotFoundPage />
    return <LoadError error={error} onRetry={() => void query.refetch()} />
  }
  return (
    <PreviewFrame editTo={`/cvs/${query.data.id}/edit`} title={query.data.title}>
      <PageCanvas cv={editing ?? query.data.document} title={query.data.title} mode="preview" />
    </PreviewFrame>
  )
}

function CoverLetterPreview() {
  const { id } = useParams()
  const stub = useCoverLetterStub(id)
  if (!stub) return <NotFoundPage />
  return (
    <PreviewFrame editTo={`/cover-letters/${stub.id}/edit`} title={stub.title}>
      <PageCanvas cv={null} title={stub.title} mode="preview" />
    </PreviewFrame>
  )
}

export function PreviewPage({ type }: { type: DocumentType }) {
  return type === 'cv' ? <CvPreview /> : <CoverLetterPreview />
}
