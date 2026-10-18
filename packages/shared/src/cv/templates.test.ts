import { describe, expect, it } from 'vitest'
import { createCoverLetter } from '../cover-letter/coverLetter'
import { createResignationLetter } from '../resignation/resignation'
import { createEmptyCv } from './factories'
import {
  LETTER_TEMPLATE_IDS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY,
  TEMPLATE_IDS,
  isLetterTemplate,
  letterTemplateFor,
  templatesIn,
} from './design'

describe('template categories', () => {
  it('puts every template in exactly one category, each category in use', () => {
    expect(Object.keys(TEMPLATE_CATEGORY).sort()).toEqual([...TEMPLATE_IDS].sort())
    const grouped = TEMPLATE_CATEGORIES.flatMap((category) => templatesIn(category))
    expect(grouped.sort()).toEqual([...TEMPLATE_IDS].sort())
    for (const category of TEMPLATE_CATEGORIES)
      expect(templatesIn(category).length).toBeGreaterThan(0)
  })

  it('filters a given list of templates', () => {
    expect(templatesIn('design', LETTER_TEMPLATE_IDS)).toEqual(['creative', 'stylish'])
  })
})

describe('letter templates', () => {
  it('keeps letter templates and maps CV-only ones to a letter template', () => {
    for (const id of LETTER_TEMPLATE_IDS) expect(letterTemplateFor(id)).toBe(id)
    for (const id of TEMPLATE_IDS.filter((id) => !isLetterTemplate(id))) {
      expect(LETTER_TEMPLATE_IDS).toContain(letterTemplateFor(id))
    }
  })

  it('gives a letter made from a CV with a CV-only template the closest letter template', () => {
    const cv = createEmptyCv()
    cv.design = { ...cv.design, templateId: 'portfolio', accentColor: '#6b21a8' }
    expect(createCoverLetter({ cv }).design).toMatchObject({
      templateId: 'creative',
      accentColor: '#6b21a8',
    })
    expect(createResignationLetter({ cv }).design.templateId).toBe('creative')
    // The CV itself is not changed.
    expect(cv.design.templateId).toBe('portfolio')
  })
})
