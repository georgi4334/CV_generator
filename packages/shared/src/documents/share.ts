import { z } from 'zod'
import { CoverLetterDocumentSchema, type CoverLetterDocument } from '../cover-letter/coverLetter'
import { CvDocumentSchema, type CvDocument } from '../cv/document'
import { ResignationDocumentSchema, type ResignationDocument } from '../resignation/resignation'
import type { CvHeader } from '../cv/header'

/** A public, read-only link to a document. Off by default. */
export const ShareLinkSchema = z.object({
  /** Random and unguessable; the link is `/s/<slug>`. */
  slug: z.string(),
  /** Turned off, the link stops working but keeps its address for turning on again. */
  isActive: z.boolean(),
  /** The link shows stand-ins for the name, photo and contact details (for public feedback). */
  hidePersonal: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type ShareLink = z.infer<typeof ShareLinkSchema>

/** Answer of the share endpoints: `link` is null until the document is shared once. */
export const ShareStateSchema = z.object({ link: ShareLinkSchema.nullable() })
export type ShareState = z.infer<typeof ShareStateSchema>

/** Turn the link on or off and/or hide personal details; at least one of them. */
export const UpdateShareInputSchema = z
  .object({ isActive: z.boolean().optional(), hidePersonal: z.boolean().optional() })
  .refine((input) => input.isActive !== undefined || input.hidePersonal !== undefined, {
    message: 'Nothing to change',
  })
export type UpdateShareInput = z.infer<typeof UpdateShareInputSchema>

/** What a share link shows: the latest saved document, without ids or owner details. */
export const SharedCvSchema = z.object({
  type: z.literal('cv'),
  /** Empty when personal details are hidden: titles often hold the owner's name. */
  title: z.string(),
  document: CvDocumentSchema,
  /** Personal details were replaced with stand-ins on the server; the page blurs them. */
  hidePersonal: z.boolean(),
  updatedAt: z.iso.datetime(),
})
export type SharedCv = z.infer<typeof SharedCvSchema>

export const SharedCoverLetterSchema = z.object({
  type: z.literal('coverLetter'),
  title: z.string(),
  document: CoverLetterDocumentSchema,
  hidePersonal: z.boolean(),
  updatedAt: z.iso.datetime(),
})
export type SharedCoverLetter = z.infer<typeof SharedCoverLetterSchema>

export const SharedResignationSchema = z.object({
  type: z.literal('resignation'),
  title: z.string(),
  document: ResignationDocumentSchema,
  hidePersonal: z.boolean(),
  updatedAt: z.iso.datetime(),
})
export type SharedResignation = z.infer<typeof SharedResignationSchema>

/** Answer of the public share endpoint: a CV, a cover letter or a resignation letter. */
export const SharedDocumentSchema = z.discriminatedUnion('type', [
  SharedCvSchema,
  SharedCoverLetterSchema,
  SharedResignationSchema,
])
export type SharedDocument = z.infer<typeof SharedDocumentSchema>

/** Slugs are base64url; anything else cannot be a share link. */
export const SHARE_SLUG_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export const sharePath = (slug: string) => `/s/${slug}`

/**
 * Stand-ins for hidden personal details. They look like the real thing once
 * blurred, and read as obviously masked if copied, in any language.
 */
export const HIDDEN_PERSONAL = {
  name: 'Xxxxx Xxxxxxx',
  email: 'xxxxx@xxxxx.xxx',
  phone: '+00 000 000 000',
  link: 'xxxxxxx.xxx/xxxxx',
  location: 'Xxxxxx',
  /** Resignation letters also hide who they are sent to. */
  company: 'Xxxxx Xxxxx',
  address: 'Xxxxxx xx',
  postalCode: '0000',
} as const

/** Document paths of the fields that hold stand-ins when personal details are hidden. */
export const HIDDEN_PERSONAL_PATHS: ReadonlySet<string> = new Set([
  'header.name',
  'header.email',
  'header.phone',
  'header.link',
  'header.location',
  'signature',
  'sender.name',
  'sender.email',
  'sender.phone',
  'sender.residence',
  'employer.company',
  'employer.contact',
  'employer.address',
  'employer.postalCode',
  'employer.city',
])

/** The header with stand-ins for the name and contact details, and no photo. Empty fields stay empty. */
function hideHeader(header: CvHeader): CvHeader {
  const mask = (key: 'name' | 'email' | 'phone' | 'link' | 'location') =>
    header[key].trim() ? HIDDEN_PERSONAL[key] : ''
  return {
    ...header,
    name: mask('name'),
    email: mask('email'),
    phone: mask('phone'),
    link: mask('link'),
    location: mask('location'),
    photoUrl: null,
    showPhoto: false,
  }
}

/**
 * A CV or letter for a share link that hides personal details. Runs on the
 * server, so the real details never reach the visitor's browser.
 */
export function hidePersonalDetails(doc: CvDocument): CvDocument
export function hidePersonalDetails(doc: CoverLetterDocument): CoverLetterDocument
export function hidePersonalDetails(doc: ResignationDocument): ResignationDocument
export function hidePersonalDetails(
  doc: CvDocument | CoverLetterDocument | ResignationDocument,
): CvDocument | CoverLetterDocument | ResignationDocument {
  if ('sender' in doc) {
    const mask = (value: string, stand: string) => (value.trim() ? stand : '')
    // The letter's own text names the company and the people: swap those words too.
    const replacements: Array<[string, string]> = [
      [doc.employer.company, HIDDEN_PERSONAL.company],
      [doc.employer.contact, HIDDEN_PERSONAL.name],
      [doc.sender.name, HIDDEN_PERSONAL.name],
      [doc.sender.email, HIDDEN_PERSONAL.email],
      [doc.sender.phone, HIDDEN_PERSONAL.phone],
      [doc.sender.residence, HIDDEN_PERSONAL.location],
      [doc.employer.address, HIDDEN_PERSONAL.address],
      [doc.employer.city, HIDDEN_PERSONAL.location],
    ]
    const scrub = (text: string) =>
      replacements.reduce(
        (result, [real, stand]) => (real.trim() ? result.split(real.trim()).join(stand) : result),
        text,
      )
    return {
      ...doc,
      subject: scrub(doc.subject),
      greeting: scrub(doc.greeting),
      paragraphs: doc.paragraphs.map(scrub),
      closing: scrub(doc.closing),
      sender: {
        name: mask(doc.sender.name, HIDDEN_PERSONAL.name),
        email: mask(doc.sender.email, HIDDEN_PERSONAL.email),
        phone: mask(doc.sender.phone, HIDDEN_PERSONAL.phone),
        residence: mask(doc.sender.residence, HIDDEN_PERSONAL.location),
      },
      employer: {
        company: mask(doc.employer.company, HIDDEN_PERSONAL.company),
        contact: mask(doc.employer.contact, HIDDEN_PERSONAL.name),
        address: mask(doc.employer.address, HIDDEN_PERSONAL.address),
        postalCode: mask(doc.employer.postalCode, HIDDEN_PERSONAL.postalCode),
        city: mask(doc.employer.city, HIDDEN_PERSONAL.location),
      },
      signature: mask(doc.signature, HIDDEN_PERSONAL.name),
    }
  }
  if ('signature' in doc) {
    return {
      ...doc,
      header: hideHeader(doc.header),
      signature: doc.signature.trim() ? HIDDEN_PERSONAL.name : '',
    }
  }
  return { ...doc, header: hideHeader(doc.header) }
}
