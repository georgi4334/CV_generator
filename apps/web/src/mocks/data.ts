// Mock data for parts of the UI that are not connected to the API yet (Steps 12–14).
import type { DocumentSummary, Job } from '@cv/shared'

export const MOCK_TODAY = '2026-10-13'

/**
 * Cover letters until their editor exists (Step 13). CVs come from the API.
 */
export const MOCK_COVER_LETTERS: DocumentSummary[] = [
  {
    id: 'cl-1',
    type: 'coverLetter',
    title: 'Cover letter – Northwind Labs',
    jobId: 'job-2',
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

const job = (
  fields: Partial<Job> & Pick<Job, 'id' | 'position' | 'company' | 'dateSaved'>,
): Job => ({
  status: 'to_apply',
  type: null,
  dateApplied: null,
  cvId: null,
  coverLetterId: null,
  notes: '',
  url: '',
  description: '',
  location: '',
  salary: '',
  contact: '',
  createdAt: `${fields.dateSaved}T09:00:00Z`,
  updatedAt: `${fields.dateSaved}T09:00:00Z`,
  ...fields,
})

export const MOCK_JOBS: Job[] = [
  job({
    id: 'job-1',
    position: 'Frontend Engineer',
    company: 'Acme Cloud',
    type: 'remote',
    dateSaved: '2026-10-01',
    notes: 'Referral from Ivan.',
  }),
  job({
    id: 'job-2',
    position: 'Senior React Developer',
    company: 'Northwind Labs',
    status: 'interviewing',
    type: 'hybrid',
    dateSaved: '2026-09-25',
    dateApplied: '2026-09-27',
    cvId: 'cv-2',
    coverLetterId: 'cl-1',
    notes: 'Technical interview on Oct 20.',
  }),
  job({
    id: 'job-3',
    position: 'Full-stack Developer',
    company: 'Blue Harbor',
    status: 'applied',
    type: 'onsite',
    dateSaved: '2026-09-10',
    dateApplied: '2026-09-12',
    cvId: 'cv-1',
  }),
  job({
    id: 'job-4',
    position: 'UI Engineer',
    company: 'Pixel & Pine',
    status: 'negotiating',
    type: 'remote',
    dateSaved: '2026-09-02',
    dateApplied: '2026-09-03',
    cvId: 'cv-1',
    notes: 'Offer expected this week.',
  }),
  job({
    id: 'job-5',
    position: 'Software Engineer',
    company: 'MarketPulse',
    status: 'rejected',
    type: 'hybrid',
    dateSaved: '2026-08-20',
    dateApplied: '2026-08-21',
    cvId: 'cv-1',
  }),
  job({
    id: 'job-6',
    position: 'Frontend Developer',
    company: 'CloudCart Solutions',
    status: 'applied',
    type: 'remote',
    dateSaved: '2026-08-30',
    dateApplied: '2026-09-01',
    cvId: 'cv-1',
  }),
]

/** Titles of the CVs the sample jobs mention (plain text until jobs are real, Step 12). */
export const MOCK_JOB_CV_TITLES: Record<string, string> = {
  'cv-1': 'Software Developer CV',
  'cv-2': 'Software Developer CV – Northwind Labs',
}

export function findDocument(id: string) {
  return MOCK_COVER_LETTERS.find((doc) => doc.id === id)
}
