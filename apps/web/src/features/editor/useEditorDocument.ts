import { useMemo } from 'react'
import { findDocument } from '../../mocks/data'

export interface CoverLetterStub {
  id: string
  title: string
}

/** Cover letters are still mock data; their editor is built in Step 13. */
export function useCoverLetterStub(id: string | undefined): CoverLetterStub | null {
  return useMemo(() => {
    if (!id) return null
    if (id === 'new') return { id, title: 'Untitled cover letter' }
    const summary = findDocument(id)
    return summary?.type === 'coverLetter' ? { id, title: summary.title } : null
  }, [id])
}
