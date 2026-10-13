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
  document: CvDocumentSchema,
})
export type CvRecord = z.infer<typeof CvRecordSchema>

export const CoverLetterRecordSchema = z.object({
  ...recordBase,
  type: z.literal('coverLetter'),
  cvId: IdSchema.nullable(),
  document: CoverLetterDocumentSchema,
})
export type CoverLetterRecord = z.infer<typeof CoverLetterRecordSchema>

/** One row in Documents → All documents (no full document body). */
export const DocumentSummarySchema = z.object({
  ...recordBase,
  type: DocumentTypeSchema,
})
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>
