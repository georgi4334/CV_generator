import { z } from 'zod'

export const CvHeaderSchema = z.object({
  name: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  link: z.string(),
  photoUrl: z.string().nullable(),
  /** Only templates that support a photo show it. */
  showPhoto: z.boolean(),
})

export type CvHeader = z.infer<typeof CvHeaderSchema>
