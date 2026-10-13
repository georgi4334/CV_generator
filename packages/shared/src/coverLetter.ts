import { z } from 'zod'
import { CvLanguageSchema } from './cv/common'
import { CvDesignSchema } from './cv/design'
import { CvHeaderSchema } from './cv/header'

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
  paragraphs: z.array(z.string()),
  closing: z.string(),
  signature: z.string(),
  design: CvDesignSchema,
})

export type CoverLetterDocument = z.infer<typeof CoverLetterDocumentSchema>
