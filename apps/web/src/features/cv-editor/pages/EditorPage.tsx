import type { DocumentType } from '@cv/shared'
import { LetterEditorPage } from '@/features/cover-letters/pages/LetterEditorPage'
import { ResignationEditorPage } from '@/features/resignation/pages/ResignationEditorPage'
import { CvEditorPage } from './CvEditorPage'

export function EditorPage({ type }: { type: DocumentType }) {
  if (type === 'cv') return <CvEditorPage />
  return type === 'coverLetter' ? <LetterEditorPage /> : <ResignationEditorPage />
}
