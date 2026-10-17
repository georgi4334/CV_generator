import { z } from 'zod'

/** How the photo is cut out: a circle, a rounded square or a square. */
export const PHOTO_SHAPES = ['circle', 'rounded', 'square'] as const
export type PhotoShape = (typeof PHOTO_SHAPES)[number]

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
})

export type CvHeader = z.infer<typeof CvHeaderSchema>
