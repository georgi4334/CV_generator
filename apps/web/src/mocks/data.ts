// Sample data for the part of the UI that is not connected to the API yet (Step 13).
import type { DocumentSummary } from '@cv/shared'

/**
 * Cover letters until their editor exists (Step 13). CVs come from the API.
 */
export const MOCK_COVER_LETTERS: DocumentSummary[] = [
  {
    id: 'cl-1',
    type: 'coverLetter',
    title: 'Cover letter – Northwind Labs',
    jobId: null,
    shared: false,
    createdAt: '2026-10-10T09:30:00Z',
    updatedAt: '2026-10-11T18:10:00Z',
  },
  {
    id: 'cl-2',
    type: 'coverLetter',
    title: 'Cover letter – general',
    jobId: null,
    shared: false,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-15T12:00:00Z',
  },
]

export function findDocument(id: string) {
  return MOCK_COVER_LETTERS.find((doc) => doc.id === id)
}
