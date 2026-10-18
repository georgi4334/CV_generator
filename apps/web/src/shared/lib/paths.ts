import type { DocumentType } from '@cv/shared'

/** The "Create new CV" wizard. */
export const NEW_CV_PATH = '/cvs/new'

/** "Create a cover letter"; add `?cvId=` / `?jobId=` to preselect them. */
export const NEW_LETTER_PATH = '/cover-letters/new'

/** "Create a resignation letter": offered from Documents only. */
export const NEW_RESIGNATION_PATH = '/resignations/new'

export function editPath(doc: { id: string; type: DocumentType }) {
  if (doc.type === 'cv') return `/cvs/${doc.id}/edit`
  return doc.type === 'coverLetter'
    ? `/cover-letters/${doc.id}/edit`
    : `/resignations/${doc.id}/edit`
}

export const DOCUMENT_SUBTABS = [
  { id: 'all', label: 'All documents' },
  { id: 'cover-letters', label: 'Cover letters' },
  { id: 'cvs', label: 'CVs' },
  { id: 'resignations', label: 'Resignation letters' },
] as const
export type DocumentSubtab = (typeof DOCUMENT_SUBTABS)[number]['id']

export function isDocumentSubtab(value: string | undefined): value is DocumentSubtab {
  return DOCUMENT_SUBTABS.some((tab) => tab.id === value)
}
