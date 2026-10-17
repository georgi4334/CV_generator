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
