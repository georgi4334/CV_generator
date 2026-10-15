import { z } from 'zod'
import { CoverLetterDocumentSchema } from './coverLetter'
import { IdSchema } from './cv/common'
import { CvDocumentSchema } from './cv/document'

export const DocumentTypeSchema = z.enum(['cv', 'coverLetter'])
export type DocumentType = z.infer<typeof DocumentTypeSchema>

const recordBase = {
  id: IdSchema,
  title: z.string(),
  /** Set when this is a tailored copy made for a saved job. */
  jobId: IdSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}

export const CvRecordSchema = z.object({
  ...recordBase,
  type: z.literal('cv'),
  professionId: z.string().nullable(),
  /** Increases on every save; a save based on an older revision is rejected (409). */
  revision: z.number().int().positive(),
  document: CvDocumentSchema,
})
export type CvRecord = z.infer<typeof CvRecordSchema>

export const CoverLetterRecordSchema = z.object({
  ...recordBase,
  type: z.literal('coverLetter'),
  /** The CV this letter goes with; its header and design can be copied again. */
  cvId: IdSchema.nullable(),
  /** Increases on every save of the document, like a CV's revision. */
  revision: z.number().int().positive(),
  document: CoverLetterDocumentSchema,
})
export type CoverLetterRecord = z.infer<typeof CoverLetterRecordSchema>

/** One row in Documents → All documents (no full document body). */
export const DocumentSummarySchema = z.object({
  ...recordBase,
  type: DocumentTypeSchema,
  /** A share link is turned on, so anyone with the link can see it. */
  shared: z.boolean(),
})
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>
