import { z } from 'zod'
import { HexColorSchema, LevelSchema } from './common'

export const TEMPLATE_IDS = [
  'polished',
  'contemporary',
  'creative',
  'timeline',
  'stylish',
  'single-column',
  'compact',
  'multicolumn',
] as const
export const TemplateIdSchema = z.enum(TEMPLATE_IDS)
export type TemplateId = z.infer<typeof TemplateIdSchema>

/** Free Google Fonts that also cover Cyrillic, so Bulgarian CVs render correctly. */
export const FONT_FAMILIES = [
  'Rubik',
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Source Sans 3',
  'PT Sans',
  'Merriweather',
  'Lora',
  'Noto Serif',
] as const
export const FontFamilySchema = z.enum(FONT_FAMILIES)
export type FontFamily = z.infer<typeof FontFamilySchema>

export const PAGE_SIZES = ['A4', 'Letter'] as const
export const PageSizeSchema = z.enum(PAGE_SIZES)
export type PageSize = z.infer<typeof PageSizeSchema>

/** Preset swatches in the Design & Font panel; any #RRGGBB is allowed via the custom picker. */
export const ACCENT_PRESETS = [
  '#1f4e79',
  '#00585a',
  '#c2410c',
  '#6b21a8',
  '#0e7490',
  '#1d4ed8',
] as const

export const CvDesignSchema = z.object({
  templateId: TemplateIdSchema,
  pageSize: PageSizeSchema,
  pageMargins: LevelSchema,
  sectionSpacing: LevelSchema,
  fontSize: LevelSchema,
  lineHeight: LevelSchema,
  accentColor: HexColorSchema,
  fontFamily: FontFamilySchema,
  /** 1–4, matching the Column layout thumbnails in the Design & Font panel. */
  columnLayout: z.number().int().min(1).max(4),
  /** Background pattern id; "none" for a plain page. Patterns are defined in Step 7. */
  background: z.string(),
  showIcons: z.boolean(),
})

export type CvDesign = z.infer<typeof CvDesignSchema>

export const DEFAULT_DESIGN: CvDesign = {
  templateId: 'polished',
  pageSize: 'A4',
  pageMargins: 2,
  sectionSpacing: 2,
  fontSize: 2,
  lineHeight: 2,
  accentColor: '#00585a',
  fontFamily: 'Rubik',
  columnLayout: 4,
  background: 'none',
  showIcons: true,
}
