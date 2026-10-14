import type { DocumentType } from '@cv/shared'
import { useParams } from 'react-router'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { CvEditorPage } from './CvEditorPage'
import { EditorLayout } from './EditorLayout'
import { PageCanvas } from './PageCanvas'
import { useCoverLetterStub } from './useEditorDocument'

function CoverLetterEditorPage() {
  const { id } = useParams()
  const stub = useCoverLetterStub(id)
  if (!stub) return <NotFoundPage />
  return (
    <EditorLayout
      title={<span className="truncate">{stub.title}</span>}
      backTo="/documents/cover-letters"
      previewTo={`/cover-letters/${stub.id}/preview`}
    >
      <PageCanvas cv={null} title={stub.title} mode="edit" />
    </EditorLayout>
  )
}

export function EditorPage({ type }: { type: DocumentType }) {
  return type === 'cv' ? <CvEditorPage /> : <CoverLetterEditorPage />
}
