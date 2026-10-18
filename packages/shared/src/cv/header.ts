import { z } from 'zod'

/** How the photo is cut out: a circle, a rounded square or a square. */
export const PHOTO_SHAPES = ['circle', 'rounded', 'square'] as const
export type PhotoShape = (typeof PHOTO_SHAPES)[number]

/**
 * Where the photo goes: where the template puts it (next to the name), or the
 * top-left or top-right corner (the top of the sidebar when it is on that side).
 */
export const PHOTO_POSITIONS = ['name', 'top-left', 'top-right'] as const
export type PhotoPosition = (typeof PHOTO_POSITIONS)[number]

/**
 * Longest values of the header's text fields: generous for real use, short
 * enough for a page. Enforced when saving and while typing, not when reading,
 * so a document saved before the limits still opens.
 */
export const HEADER_LIMITS = {
  name: 150,
  headline: 300,
  email: 254,
  phone: 40,
  location: 150,
  link: 300,
} as const

/** The longest text a document path accepts while typing, or undefined when it is not limited. */
export function fieldMaxLength(path: string): number | undefined {
  const [root, key] = path.split('.')
  return root === 'header' && key && key in HEADER_LIMITS
    ? HEADER_LIMITS[key as keyof typeof HEADER_LIMITS]
    : undefined
}

/** True when no header text is longer than its limit. */
export const headerWithinLimits = (document: { header: Record<string, unknown> }) =>
  Object.entries(HEADER_LIMITS).every(
    ([key, max]) => String(document.header[key] ?? '').length <= max,
  )

export const CvHeaderSchema = z.object({
  name: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  link: z.string(),
  photoUrl: z.string().nullable(),
  showPhoto: z.boolean(),
  /** Missing in older CVs, which used circles. */
  photoShape: z.enum(PHOTO_SHAPES).default('circle'),
  photoPosition: z.enum(PHOTO_POSITIONS).default('name'),
})

export type CvHeader = z.infer<typeof CvHeaderSchema>
