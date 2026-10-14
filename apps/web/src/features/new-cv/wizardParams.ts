import { isProfessionId, TEMPLATE_IDS, type ProfessionId, type TemplateId } from '@cv/shared'

/** "Other" in the profession step: a general layout with no example. */
export const OTHER_PROFESSION = 'other'
export type ProfessionChoice = ProfessionId | typeof OTHER_PROFESSION

export interface WizardState {
  profession: ProfessionChoice | null
  /** Only set once a profession is chosen. */
  template: TemplateId | null
}

const isProfession = (value: string | null): value is ProfessionChoice =>
  value === OTHER_PROFESSION || isProfessionId(value)

const isTemplate = (value: string | null): value is TemplateId =>
  TEMPLATE_IDS.includes(value as TemplateId)

/** The wizard keeps its choices in the URL, so the browser's Back button goes back a step. */
export function readWizard(params: URLSearchParams): WizardState {
  const profession = params.get('profession')
  if (!isProfession(profession)) return { profession: null, template: null }
  const template = params.get('template')
  return { profession, template: isTemplate(template) ? template : null }
}

export function wizardParams({ profession, template }: Partial<WizardState>): URLSearchParams {
  const params = new URLSearchParams()
  if (profession) {
    params.set('profession', profession)
    if (template) params.set('template', template)
  }
  return params
}

export const toProfessionId = (choice: ProfessionChoice): ProfessionId | null =>
  choice === OTHER_PROFESSION ? null : choice
