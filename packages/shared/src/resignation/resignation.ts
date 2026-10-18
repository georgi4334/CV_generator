import { z } from 'zod'
import { CvLanguageSchema, type CvLanguage } from '../cv/common'
import { CvDesignSchema, DEFAULT_DESIGN } from '../cv/design'
import type { CvDocument } from '../cv/document'
import { formatLetterDate } from '../cover-letter/coverLetter'

export const RESIGNATION_SCHEMA_VERSION = 1

/**
 * A resignation letter: who is leaving, who they tell, and the letter itself.
 * It looks like a formal business letter; the design is the CV's fonts and colours.
 */
export const ResignationDocumentSchema = z.object({
  schemaVersion: z.literal(RESIGNATION_SCHEMA_VERSION),
  language: CvLanguageSchema,
  /** The person resigning. */
  sender: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    /** Place of residence, e.g. "12 Oak Street, Sofia". */
    residence: z.string(),
  }),
  /** Who receives the letter. */
  employer: z.object({
    company: z.string(),
    contact: z.string(),
    address: z.string(),
    postalCode: z.string(),
    city: z.string(),
  }),
  subject: z.string(),
  /** Written out for the letter, e.g. "15 October 2026". */
  date: z.string(),
  greeting: z.string(),
  /** At least one paragraph; empty ones show a hint while editing. */
  paragraphs: z.array(z.string()).min(1).max(20),
  closing: z.string(),
  signature: z.string(),
  design: CvDesignSchema,
})
export type ResignationDocument = z.infer<typeof ResignationDocumentSchema>

/** Longest values of the letter's text fields; enforced when saving and typing, not when reading. */
export const RESIGNATION_LIMITS = {
  sender: { name: 150, email: 254, phone: 40, residence: 200 },
  employer: { company: 150, contact: 150, address: 200, postalCode: 20, city: 100 },
  subject: 200,
  date: 60,
} as const

/** The longest text a resignation document path accepts while typing, or undefined when it is not limited. */
export function resignationFieldMaxLength(path: string): number | undefined {
  const [group, key] = path.split('.')
  if (group === 'sender' && key && key in RESIGNATION_LIMITS.sender)
    return RESIGNATION_LIMITS.sender[key as keyof typeof RESIGNATION_LIMITS.sender]
  if (group === 'employer' && key && key in RESIGNATION_LIMITS.employer)
    return RESIGNATION_LIMITS.employer[key as keyof typeof RESIGNATION_LIMITS.employer]
  if (group === 'subject') return RESIGNATION_LIMITS.subject
  if (group === 'date') return RESIGNATION_LIMITS.date
  return undefined
}

/** True when no sender, employer, subject or date text is longer than its limit. */
export function resignationWithinLimits(doc: ResignationDocument): boolean {
  const within = (values: Record<string, string>, limits: Record<string, number>) =>
    Object.entries(limits).every(([key, max]) => (values[key] ?? '').length <= max)
  return (
    within(doc.sender, RESIGNATION_LIMITS.sender) &&
    within(doc.employer, RESIGNATION_LIMITS.employer) &&
    doc.subject.length <= RESIGNATION_LIMITS.subject &&
    doc.date.length <= RESIGNATION_LIMITS.date
  )
}

interface ResignationTexts {
  subject: string
  greeting: string
  /** The greeting when the contact person is known. */
  greetingTo: (contact: string) => string
  closing: string
  paragraphs: (company: string) => string[]
}

/** Starting texts of a new resignation letter, per language. */
export const RESIGNATION_DEFAULTS: Record<CvLanguage, ResignationTexts> = {
  'en-US': {
    subject: 'Resignation',
    greeting: 'Dear Sir or Madam,',
    greetingTo: (contact) => `Dear ${contact},`,
    closing: 'Sincerely,',
    paragraphs: (company) => [
      `Please accept this letter as formal notice that I am resigning from my position${company ? ` at ${company}` : ''}, in line with the notice period in my employment contract.`,
      'I am grateful for the opportunities I have had and will do my best to make the handover smooth.',
      'Please let me know if you need anything from me during my notice period.',
    ],
  },
  'en-GB': {
    subject: 'Resignation',
    greeting: 'Dear Sir or Madam,',
    greetingTo: (contact) => `Dear ${contact},`,
    closing: 'Kind regards,',
    paragraphs: (company) => [
      `Please accept this letter as formal notice that I am resigning from my position${company ? ` at ${company}` : ''}, in line with the notice period in my employment contract.`,
      'I am grateful for the opportunities I have had and will do my best to make the handover smooth.',
      'Please let me know if you need anything from me during my notice period.',
    ],
  },
  bg: {
    subject: 'Заявление за напускане',
    greeting: 'Уважаеми г-н/г-жо,',
    greetingTo: (contact) => `Уважаеми г-н/г-жо ${contact},`,
    closing: 'С уважение,',
    paragraphs: (company) => [
      `С настоящото Ви уведомявам, че прекратявам трудовото си правоотношение${company ? ` с ${company}` : ''}, при спазване на срока на предизвестие по трудовия ми договор.`,
      'Благодаря за възможностите и доверието и ще направя всичко възможно предаването на задълженията ми да премине гладко.',
      'Моля, уведомете ме, ако е необходимо да направя нещо през срока на предизвестието.',
    ],
  },
}

/**
 * A new resignation letter. With a CV, the sender's name, email, phone and
 * residence and the design come from it; the texts are the language's defaults,
 * with the company and contact person filled in when known.
 */
export function createResignationLetter({
  cv,
  company = '',
  contact = '',
  language = cv?.language ?? 'en-US',
  today = new Date(),
}: {
  cv?: Pick<CvDocument, 'header' | 'design' | 'language'> | null
  company?: string
  contact?: string
  language?: CvLanguage
  today?: Date
} = {}): ResignationDocument {
  const texts = RESIGNATION_DEFAULTS[language]
  const name = cv?.header.name ?? ''
  return {
    schemaVersion: RESIGNATION_SCHEMA_VERSION,
    language,
    sender: {
      name,
      email: cv?.header.email ?? '',
      phone: cv?.header.phone ?? '',
      residence: cv?.header.location ?? '',
    },
    employer: { company, contact, address: '', postalCode: '', city: '' },
    subject: texts.subject,
    date: formatLetterDate(today, language),
    greeting: contact ? texts.greetingTo(contact) : texts.greeting,
    paragraphs: texts.paragraphs(company),
    closing: texts.closing,
    signature: name,
    design: cv ? { ...cv.design } : { ...DEFAULT_DESIGN },
  }
}
