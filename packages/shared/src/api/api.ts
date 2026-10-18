import { z } from 'zod'
import { TEXT_MAX, withinTextLimit } from '../common/textLimit'
import { IdSchema } from '../cv/common'
import { CoverLetterDocumentSchema } from '../cover-letter/coverLetter'
import { CvDocumentSchema } from '../cv/document'
import { headerWithinLimits } from '../cv/header'
import { PROFESSION_IDS } from '../cv/professions'
import { ResignationDocumentSchema, resignationWithinLimits } from '../resignation/resignation'

const headerLimitMessage = { message: 'A header field is too long', path: ['header'] }
const textLimitMessage = { message: `A text is longer than ${TEXT_MAX} characters` }
/** A CV as it is saved: its header text and every text within the limits. */
const SaveableCvSchema = CvDocumentSchema.refine(headerWithinLimits, headerLimitMessage).refine(
  (doc) => withinTextLimit(doc),
  textLimitMessage,
)
const SaveableLetterSchema = CoverLetterDocumentSchema.refine(
  headerWithinLimits,
  headerLimitMessage,
).refine((doc) => withinTextLimit(doc), textLimitMessage)
const SaveableResignationSchema = ResignationDocumentSchema.refine(resignationWithinLimits, {
  message: 'A field of the letter is too long',
}).refine((doc) => withinTextLimit(doc), textLimitMessage)

/** Shape of every error response from the API. */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})
export type ApiError = z.infer<typeof ApiErrorSchema>

export const ProfessionIdSchema = z.enum(PROFESSION_IDS)

/** Longest title a CV or cover letter may have. */
export const TITLE_MAX = 200

const TitleSchema = z.string().trim().min(1).max(TITLE_MAX)

export const CreateCvInputSchema = z.object({
  title: TitleSchema.optional(),
  professionId: ProfessionIdSchema.nullable().optional(),
  jobId: IdSchema.nullable().optional(),
  /** Omit for an empty CV in the default layout. */
  document: SaveableCvSchema.optional(),
})
export type CreateCvInput = z.infer<typeof CreateCvInputSchema>

export const UpdateCvInputSchema = z
  .object({
    /**
     * The document revision the client last saw. Required when sending a
     * document; renaming or relinking alone does not need (or change) it.
     */
    revision: z.number().int().positive().optional(),
    title: TitleSchema.optional(),
    professionId: ProfessionIdSchema.nullable().optional(),
    jobId: IdSchema.nullable().optional(),
    document: SaveableCvSchema.optional(),
  })
  .refine((input) => input.document === undefined || input.revision !== undefined, {
    message: 'revision is required when saving the document',
    path: ['revision'],
  })
export type UpdateCvInput = z.infer<typeof UpdateCvInputSchema>

/** Copy a CV; with `jobId`, a copy tailored for that saved job, which then points at it. */
export const DuplicateCvInputSchema = z.object({ jobId: IdSchema.optional() })
export type DuplicateCvInput = z.infer<typeof DuplicateCvInputSchema>

export const CreateCoverLetterInputSchema = z.object({
  title: TitleSchema.optional(),
  cvId: IdSchema.nullable().optional(),
  jobId: IdSchema.nullable().optional(),
  /** Omit for an empty letter (without a CV's header and design). */
  document: SaveableLetterSchema.optional(),
})
export type CreateCoverLetterInput = z.infer<typeof CreateCoverLetterInputSchema>

/** Same rules as a CV: a document save needs the revision it is based on. */
export const UpdateCoverLetterInputSchema = z
  .object({
    revision: z.number().int().positive().optional(),
    title: TitleSchema.optional(),
    cvId: IdSchema.nullable().optional(),
    jobId: IdSchema.nullable().optional(),
    document: SaveableLetterSchema.optional(),
  })
  .refine((input) => input.document === undefined || input.revision !== undefined, {
    message: 'revision is required when saving the document',
    path: ['revision'],
  })
export type UpdateCoverLetterInput = z.infer<typeof UpdateCoverLetterInputSchema>

export const CreateResignationInputSchema = z.object({
  title: TitleSchema.optional(),
  /** Omit for an empty letter (without a CV's details and design). */
  document: SaveableResignationSchema.optional(),
})
export type CreateResignationInput = z.infer<typeof CreateResignationInputSchema>

/** Same rules as a CV: a document save needs the revision it is based on. */
export const UpdateResignationInputSchema = z
  .object({
    revision: z.number().int().positive().optional(),
    title: TitleSchema.optional(),
    document: SaveableResignationSchema.optional(),
  })
  .refine((input) => input.document === undefined || input.revision !== undefined, {
    message: 'revision is required when saving the document',
    path: ['revision'],
  })
export type UpdateResignationInput = z.infer<typeof UpdateResignationInputSchema>

export const CvVersionSummarySchema = z.object({
  id: IdSchema,
  label: z.string().nullable(),
  /** Created automatically while editing (true) or saved by the user (false). */
  auto: z.boolean(),
  createdAt: z.iso.datetime(),
})
export type CvVersionSummary = z.infer<typeof CvVersionSummarySchema>

export const CreateVersionInputSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
})

export const UploadSchema = z.object({
  id: IdSchema,
  /** Path to fetch the file from, relative to the API origin. */
  url: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
})
export type Upload = z.infer<typeof UploadSchema>

export const PLANS = ['free', 'pro'] as const
export type Plan = (typeof PLANS)[number]

/** Per-plan limits, enforced by the API. `null` means unlimited. */
export const PLAN_LIMITS: Record<
  Plan,
  { maxCvs: number | null; maxVersionsPerCv: number; aiRequestsPerDay: number }
> = {
  free: { maxCvs: 20, maxVersionsPerCv: 30, aiRequestsPerDay: 30 },
  pro: { maxCvs: null, maxVersionsPerCv: 200, aiRequestsPerDay: 300 },
}

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024
export const UPLOAD_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
