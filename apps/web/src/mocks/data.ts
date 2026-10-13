// Mock data for the UI until the API exists (Steps 8–9).
import {
  createExampleCv,
  PROFESSIONS,
  type CvDocument,
  type DocumentSummary,
  type Job,
  type ProfessionId,
} from '@cv/shared'

export const MOCK_TODAY = '2026-10-13'

const cvSeeds: Array<{
  id: string
  professionId: ProfessionId
  updatedAt: string
  jobId: string | null
}> = [
  {
    id: 'cv-1',
    professionId: 'software-developer',
    updatedAt: '2026-10-12T16:20:00Z',
    jobId: null,
  },
  {
    id: 'cv-2',
    professionId: 'software-developer',
    updatedAt: '2026-10-10T09:05:00Z',
    jobId: 'job-2',
  },
  { id: 'cv-3', professionId: 'designer', updatedAt: '2026-10-02T11:40:00Z', jobId: null },
  { id: 'cv-4', professionId: 'sales-marketing', updatedAt: '2026-09-21T14:00:00Z', jobId: null },
  { id: 'cv-5', professionId: 'healthcare', updatedAt: '2026-09-05T08:30:00Z', jobId: null },
  { id: 'cv-6', professionId: 'academic', updatedAt: '2026-08-28T17:45:00Z', jobId: null },
]

export const MOCK_CV_DOCUMENTS: Record<string, CvDocument> = Object.fromEntries(
  cvSeeds.map((seed) => [seed.id, createExampleCv(seed.professionId)]),
)

export const MOCK_DOCUMENTS: DocumentSummary[] = [
  ...cvSeeds.map((seed) => ({
    id: seed.id,
    type: 'cv' as const,
    title:
      seed.jobId === null
        ? `${PROFESSIONS[seed.professionId].name} CV`
        : `${PROFESSIONS[seed.professionId].name} CV – Northwind Labs`,
    jobId: seed.jobId,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: seed.updatedAt,
  })),
  {
    id: 'cl-1',
    type: 'coverLetter',
    title: 'Cover letter – Northwind Labs',
    jobId: 'job-2',
    createdAt: '2026-10-10T09:30:00Z',
    updatedAt: '2026-10-11T18:10:00Z',
  },
  {
    id: 'cl-2',
    type: 'coverLetter',
    title: 'Cover letter – general',
    jobId: null,
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

export function findDocument(id: string) {
  return MOCK_DOCUMENTS.find((doc) => doc.id === id)
}
