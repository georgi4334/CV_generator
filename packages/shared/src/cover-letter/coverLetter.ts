import { z } from 'zod'
import { CvLanguageSchema, type CvLanguage } from '../cv/common'
import { CvDesignSchema, DEFAULT_DESIGN } from '../cv/design'
import type { CvDocument } from '../cv/document'
import { CvHeaderSchema, type CvHeader } from '../cv/header'

export const COVER_LETTER_SCHEMA_VERSION = 1

export const CoverLetterDocumentSchema = z.object({
  schemaVersion: z.literal(COVER_LETTER_SCHEMA_VERSION),
  language: CvLanguageSchema,
  /** Usually copied from the linked CV so the letter and CV match. */
  header: CvHeaderSchema,
  recipient: z.object({
    name: z.string(),
    title: z.string(),
    company: z.string(),
    address: z.string(),
  }),
  date: z.string(),
  greeting: z.string(),
  /** At least one paragraph; empty ones show a hint while editing. */
  paragraphs: z.array(z.string()).min(1).max(20),
  closing: z.string(),
  signature: z.string(),
  design: CvDesignSchema,
})

export type CoverLetterDocument = z.infer<typeof CoverLetterDocumentSchema>

/** Starting texts of a new letter, per CV language. */
export const COVER_LETTER_DEFAULTS: Record<
  CvLanguage,
  { greeting: string; closing: string; dateLocale: string }
> = {
  'en-US': { greeting: 'Dear Hiring Manager,', closing: 'Sincerely,', dateLocale: 'en-US' },
  'en-GB': { greeting: 'Dear Hiring Manager,', closing: 'Kind regards,', dateLocale: 'en-GB' },
  bg: { greeting: 'Уважаеми г-н/г-жо,', closing: 'С уважение,', dateLocale: 'bg-BG' },
}

/** Today's date written out for a letter, e.g. "15 October 2026". */
export function formatLetterDate(date: Date, language: CvLanguage): string {
  return new Intl.DateTimeFormat(COVER_LETTER_DEFAULTS[language].dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const EMPTY_HEADER: CvHeader = {
  name: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  link: '',
  photoUrl: null,
  showPhoto: false,
}

/**
 * A new cover letter. With a CV, it takes the CV's header (name, contacts) and
 * design so letter and CV match; with a job, the company is filled in.
 */
export function createCoverLetter({
  cv,
  company = '',
  language = cv?.language ?? 'en-US',
  today = new Date(),
}: {
  cv?: Pick<CvDocument, 'header' | 'design' | 'language'> | null
  company?: string
  language?: CvLanguage
  today?: Date
} = {}): CoverLetterDocument {
  const header = cv ? { ...cv.header } : { ...EMPTY_HEADER }
  return {
    schemaVersion: COVER_LETTER_SCHEMA_VERSION,
    language,
    header,
    recipient: { name: '', title: '', company, address: '' },
    date: formatLetterDate(today, language),
    greeting: COVER_LETTER_DEFAULTS[language].greeting,
    paragraphs: ['', '', ''],
    closing: COVER_LETTER_DEFAULTS[language].closing,
    signature: header.name,
    design: cv ? { ...cv.design } : { ...DEFAULT_DESIGN },
  }
}
