import type { DocumentType } from '@cv/shared'

/** The "Create new CV" wizard. */
export const NEW_CV_PATH = '/cvs/new'

export function editPath(doc: { id: string; type: DocumentType }) {
  return doc.type === 'cv' ? `/cvs/${doc.id}/edit` : `/cover-letters/${doc.id}/edit`
}

export const DOCUMENT_SUBTABS = [
  { id: 'all', label: 'All documents' },
  { id: 'cover-letters', label: 'Cover letters' },
  { id: 'cvs', label: 'CVs' },
] as const
export type DocumentSubtab = (typeof DOCUMENT_SUBTABS)[number]['id']

export function isDocumentSubtab(value: string | undefined): value is DocumentSubtab {
  return DOCUMENT_SUBTABS.some((tab) => tab.id === value)
}
