import { z } from 'zod'

export const IdSchema = z.string().min(1)

/** "2024" or "2024-05". Dates on a CV rarely need a day. */
export const YearMonthSchema = z
  .string()
  .regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'Expected YYYY or YYYY-MM')
export type YearMonth = z.infer<typeof YearMonthSchema>

/** Start/end of a period. `isCurrent` renders as "Present" and ignores `endDate`. */
export const DateRangeSchema = z.object({
  startDate: YearMonthSchema.nullable(),
  endDate: YearMonthSchema.nullable(),
  isCurrent: z.boolean(),
})

export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB')

/** 1–5 step used by the Design & Font sliders and by skill/language levels. */
export const LevelSchema = z.number().int().min(1).max(5)
export type Level = z.infer<typeof LevelSchema>

export const CV_LANGUAGES = ['en-US', 'en-GB', 'bg'] as const
export const CvLanguageSchema = z.enum(CV_LANGUAGES)
export type CvLanguage = z.infer<typeof CvLanguageSchema>
