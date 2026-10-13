import type { DocumentType } from '@cv/shared'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { PageCanvas } from './PageCanvas'
import { useEditorDocument } from './useEditorDocument'

export function PreviewPage({ type }: { type: DocumentType }) {
  const { id } = useParams()
  const doc = useEditorDocument(type, id)
  if (!doc) return <NotFoundPage />

  const base = type === 'cv' ? '/cvs' : '/cover-letters'

  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-950">
      <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-slate-300 bg-white px-4 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <Link
          to={`${base}/${doc.id}/edit`}
          className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:underline dark:text-teal-300"
        >
          <ArrowLeft className="size-4" /> Back to editing
        </Link>
        <span className="text-slate-500">Preview · {doc.title}</span>
      </header>
      <div className="flex justify-center overflow-auto px-6 py-8">
        <PageCanvas cv={doc.cv} title={doc.title} mode="preview" />
      </div>
    </div>
  )
}
