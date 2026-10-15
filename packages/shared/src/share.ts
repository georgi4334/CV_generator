import { z } from 'zod'
import { CoverLetterDocumentSchema } from './coverLetter'
import { CvDocumentSchema } from './cv/document'

/** A public, read-only link to a document. Off by default. */
export const ShareLinkSchema = z.object({
  /** Random and unguessable; the link is `/s/<slug>`. */
  slug: z.string(),
  /** Turned off, the link stops working but keeps its address for turning on again. */
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type ShareLink = z.infer<typeof ShareLinkSchema>

/** Answer of the share endpoints: `link` is null until the document is shared once. */
export const ShareStateSchema = z.object({ link: ShareLinkSchema.nullable() })
export type ShareState = z.infer<typeof ShareStateSchema>

export const UpdateShareInputSchema = z.object({ isActive: z.boolean() })
export type UpdateShareInput = z.infer<typeof UpdateShareInputSchema>

/** What a share link shows: the latest saved document, without ids or owner details. */
export const SharedCvSchema = z.object({
  type: z.literal('cv'),
  title: z.string(),
  document: CvDocumentSchema,
  updatedAt: z.iso.datetime(),
})
export type SharedCv = z.infer<typeof SharedCvSchema>

export const SharedCoverLetterSchema = z.object({
  type: z.literal('coverLetter'),
  title: z.string(),
  document: CoverLetterDocumentSchema,
  updatedAt: z.iso.datetime(),
})
export type SharedCoverLetter = z.infer<typeof SharedCoverLetterSchema>

/** Answer of the public share endpoint: a CV or a cover letter. */
export const SharedDocumentSchema = z.discriminatedUnion('type', [
  SharedCvSchema,
  SharedCoverLetterSchema,
])
export type SharedDocument = z.infer<typeof SharedDocumentSchema>

/** Slugs are base64url; anything else cannot be a share link. */
export const SHARE_SLUG_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export const sharePath = (slug: string) => `/s/${slug}`
