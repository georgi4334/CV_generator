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
  'recipient.name',
  'recipient.company',
  'recipient.address',
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

const maskText = (value: string, stand: string) => (value.trim() ? stand : '')

/** The stand-in for a single word of a hidden name. */
const NAME_WORD = 'Xxxxx'

/** What to swap for each real word or phrase that names a person or place. */
type Swaps = Array<[real: string, stand: string]>

/**
 * The words of a name (3 letters or more) as swaps for a stand-in word, so a
 * first name on its own ("Thanks, Maria") is hidden too.
 */
const nameWords = (name: string): Swaps =>
  name
    .split(/\s+/)
    .filter((word) => word.replace(/[^\p{L}]/gu, '').length >= 3)
    .map((word) => [word, NAME_WORD])

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Replaces whole-word occurrences of the real values in a text (any case,
 * longest first), so "Pixel & Pine Ltd" goes before "Pine" and "Ana" does not
 * touch "Analytics".
 */
function scrubber(swaps: Swaps): (text: string) => string {
  const active = swaps
    .map(([real, stand]) => [real.trim(), stand] as const)
    .filter(([real]) => real.length >= 2)
    .sort((a, b) => b[0].length - a[0].length)
  if (active.length === 0) return (text) => text
  const stands = new Map(active.map(([real, stand]) => [real.toLowerCase(), stand]))
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${active.map(([real]) => escapeRegExp(real)).join('|')})(?![\\p{L}\\p{N}])`,
    'giu',
  )
  return (text) => text.replace(pattern, (found) => stands.get(found.toLowerCase()) ?? found)
}

/** The same swap in every text of a document (arrays and objects are copied, other values kept). */
function scrubTexts<T>(value: T, scrub: (text: string) => string): T {
  if (typeof value === 'string') return scrub(value) as T
  if (Array.isArray(value)) return value.map((item) => scrubTexts(item, scrub)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === 'id' ? item : scrubTexts(item, scrub),
      ]),
    ) as T
  }
  return value
}

/** Swaps for the person whose CV or letter it is: the name and contact details. */
const personSwaps = (header: CvHeader): Swaps => [
  [header.name, HIDDEN_PERSONAL.name],
  ...nameWords(header.name),
  [header.email, HIDDEN_PERSONAL.email],
  [header.phone, HIDDEN_PERSONAL.phone],
  [header.link, HIDDEN_PERSONAL.link],
]

/**
 * A CV or letter for a share link that hides personal details. Runs on the
 * server, so the real details never reach the visitor's browser. The name and
 * contacts are also swapped wherever the text mentions them; other words
 * (cities, employers) are the author's to check.
 */
export function hidePersonalDetails(doc: CvDocument): CvDocument
export function hidePersonalDetails(doc: CoverLetterDocument): CoverLetterDocument
export function hidePersonalDetails(doc: ResignationDocument): ResignationDocument
export function hidePersonalDetails(
  doc: CvDocument | CoverLetterDocument | ResignationDocument,
): CvDocument | CoverLetterDocument | ResignationDocument {
  const mask = maskText
  if ('sender' in doc) {
    // The letter's own text names the company and the people: swap those words too.
    const scrub = scrubber([
      [doc.employer.company, HIDDEN_PERSONAL.company],
      [doc.employer.contact, HIDDEN_PERSONAL.name],
      ...nameWords(doc.employer.contact),
      [doc.sender.name, HIDDEN_PERSONAL.name],
      ...nameWords(doc.sender.name),
      [doc.sender.email, HIDDEN_PERSONAL.email],
      [doc.sender.phone, HIDDEN_PERSONAL.phone],
      [doc.sender.residence, HIDDEN_PERSONAL.location],
      [doc.employer.address, HIDDEN_PERSONAL.address],
      [doc.employer.city, HIDDEN_PERSONAL.location],
    ])
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
    // The recipient is a person and a company too, and the text may name them.
    const scrub = scrubber([
      ...personSwaps(doc.header),
      [doc.signature, HIDDEN_PERSONAL.name],
      ...nameWords(doc.signature),
      [doc.recipient.name, HIDDEN_PERSONAL.name],
      ...nameWords(doc.recipient.name),
      [doc.recipient.company, HIDDEN_PERSONAL.company],
      [doc.recipient.address, HIDDEN_PERSONAL.address],
    ])
    return {
      ...doc,
      header: hideHeader(doc.header),
      recipient: {
        name: mask(doc.recipient.name, HIDDEN_PERSONAL.name),
        title: doc.recipient.title,
        company: mask(doc.recipient.company, HIDDEN_PERSONAL.company),
        address: mask(doc.recipient.address, HIDDEN_PERSONAL.address),
      },
      greeting: scrub(doc.greeting),
      paragraphs: doc.paragraphs.map(scrub),
      closing: scrub(doc.closing),
      signature: mask(doc.signature, HIDDEN_PERSONAL.name),
    }
  }
  const scrub = scrubber(personSwaps(doc.header))
  return {
    ...doc,
    header: hideHeader({ ...doc.header, headline: scrub(doc.header.headline) }),
    sections: scrubTexts(doc.sections, scrub),
  }
}
