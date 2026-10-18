import { z } from 'zod'
import { HexColorSchema, LevelSchema } from './common'

/** Templates that cover and resignation letters can use too. */
export const LETTER_TEMPLATE_IDS = [
  'polished',
  'contemporary',
  'creative',
  'timeline',
  'stylish',
  'single-column',
  'compact',
  'multicolumn',
] as const
export type LetterTemplateId = (typeof LETTER_TEMPLATE_IDS)[number]

export const TEMPLATE_IDS = [
  ...LETTER_TEMPLATE_IDS,
  // CV only.
  'portfolio',
  'elegant',
  'vivid',
  'spotlight',
  'modern',
  'bold',
  'monogram',
  'executive',
] as const
export const TemplateIdSchema = z.enum(TEMPLATE_IDS)
export type TemplateId = z.infer<typeof TemplateIdSchema>

/** The kinds of work the template pickers group templates by. */
export const TEMPLATE_CATEGORIES = ['professional', 'design', 'marketing', 'sales'] as const
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

/** Each template's category (the pickers group by it). */
export const TEMPLATE_CATEGORY: Record<TemplateId, TemplateCategory> = {
  polished: 'professional',
  'single-column': 'professional',
  compact: 'professional',
  multicolumn: 'professional',
  creative: 'design',
  stylish: 'design',
  portfolio: 'design',
  elegant: 'design',
  vivid: 'design',
  contemporary: 'marketing',
  spotlight: 'marketing',
  modern: 'marketing',
  timeline: 'sales',
  bold: 'sales',
  monogram: 'sales',
  executive: 'sales',
}

/** The templates of a category, in the order of TEMPLATE_IDS. */
export const templatesIn = (
  category: TemplateCategory,
  ids: readonly TemplateId[] = TEMPLATE_IDS,
): TemplateId[] => ids.filter((id) => TEMPLATE_CATEGORY[id] === category)

/** The closest letter template for a CV-only one, so a letter made from such a CV still matches it. */
const LETTER_FALLBACK: Record<Exclude<TemplateId, LetterTemplateId>, LetterTemplateId> = {
  portfolio: 'creative',
  elegant: 'stylish',
  vivid: 'contemporary',
  spotlight: 'creative',
  modern: 'polished',
  bold: 'compact',
  monogram: 'polished',
  executive: 'contemporary',
}

export const isLetterTemplate = (id: TemplateId): id is LetterTemplateId =>
  (LETTER_TEMPLATE_IDS as readonly string[]).includes(id)

export const letterTemplateFor = (id: TemplateId): LetterTemplateId =>
  isLetterTemplate(id) ? id : LETTER_FALLBACK[id]

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

/** A CV's design for a letter: the same look, on a template letters can use. */
export const letterDesign = (design: CvDesign): CvDesign => ({
  ...design,
  templateId: letterTemplateFor(design.templateId),
})
