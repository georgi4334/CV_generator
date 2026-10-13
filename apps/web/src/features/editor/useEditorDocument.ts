import { createEmptyCv, type CvDocument, type DocumentType } from '@cv/shared'
import { useMemo } from 'react'
import { findDocument, MOCK_CV_DOCUMENTS } from '../../mocks/data'

export interface EditorDocument {
  id: string
  type: DocumentType
  title: string
  /** Only set for CVs; the cover letter editor is built in Step 13. */
  cv: CvDocument | null
}

/** Loads the document for the editor from mock data (the API replaces this in Step 9). */
export function useEditorDocument(
  type: DocumentType,
  id: string | undefined,
): EditorDocument | null {
  return useMemo(() => {
    if (!id) return null
    if (id === 'new') {
      return type === 'cv'
        ? { id, type, title: 'Untitled CV', cv: createEmptyCv() }
        : { id, type, title: 'Untitled cover letter', cv: null }
    }
    const summary = findDocument(id)
    if (!summary || summary.type !== type) return null
    return {
      id,
      type,
      title: summary.title,
      cv: type === 'cv' ? (MOCK_CV_DOCUMENTS[id] ?? null) : null,
    }
  }, [type, id])
}
