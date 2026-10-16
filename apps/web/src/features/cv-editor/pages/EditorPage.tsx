import type { DocumentType } from '@cv/shared'
import { LetterEditorPage } from '@/features/cover-letters/pages/LetterEditorPage'
import { CvEditorPage } from './CvEditorPage'

export function EditorPage({ type }: { type: DocumentType }) {
  return type === 'cv' ? <CvEditorPage /> : <LetterEditorPage />
}
