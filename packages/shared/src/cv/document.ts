import { z } from 'zod'
import { CvLanguageSchema } from './common'
import { CvDesignSchema } from './design'
import { CvHeaderSchema } from './header'
import { SectionSchema } from './sections'

/** Bump when the document shape changes, and add a migration for stored documents. */
export const CV_SCHEMA_VERSION = 1

/**
 * Everything needed to render one CV. Stored as JSONB in the `cvs` table.
 * Content (header + sections) is kept separate from `design`, so switching
 * template or style never touches the text.
 */
export const CvDocumentSchema = z.object({
  schemaVersion: z.literal(CV_SCHEMA_VERSION),
  language: CvLanguageSchema,
  header: CvHeaderSchema,
  /** Order in this array is the order on the page, per column. */
  sections: z.array(SectionSchema),
  design: CvDesignSchema,
})

export type CvDocument = z.infer<typeof CvDocumentSchema>
