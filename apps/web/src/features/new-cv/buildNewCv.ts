import {
  createEmptyCv,
  createExampleCv,
  DEFAULT_SECTION_LAYOUT,
  PROFESSIONS,
  type CvDocument,
  type CvLanguage,
  type ProfessionId,
  type TemplateId,
} from '@cv/shared'
import { withTemplate } from '@/renderer'

export type StartFrom = 'example' | 'blank'

export interface NewCvChoice {
  /** `null` when the user picked "Other": general layout, no example. */
  professionId: ProfessionId | null
  templateId: TemplateId
  startFrom: StartFrom
  language: CvLanguage
}

/** Whose example previews the templates when no profession was chosen. */
export const FALLBACK_EXAMPLE: ProfessionId = 'sales-marketing'

/**
 * The document a new CV starts with: the profession's example or its usual
 * sections left blank, in the chosen template with that template's suggested look.
 */
export function buildNewCv({
  professionId,
  templateId,
  startFrom,
  language,
}: NewCvChoice): CvDocument {
  const example = professionId ? createExampleCv(professionId) : null
  const base =
    startFrom === 'example' && example
      ? example
      : createEmptyCv(
          language,
          professionId ? PROFESSIONS[professionId].sections : DEFAULT_SECTION_LAYOUT,
        )
  // A blank CV keeps the example's color, so both starting points look alike.
  const accentColor = example?.design.accentColor ?? base.design.accentColor
  return withTemplate({ ...base, language, design: { ...base.design, accentColor } }, templateId)
}
