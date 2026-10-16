import { describe, expect, it } from 'vitest'
import { CvDocumentSchema } from '../cv/document'
import { PROFESSION_IDS, PROFESSIONS } from '../cv/professions'
import { createExampleCv } from './index'

describe.each(PROFESSION_IDS)('example CV: %s', (professionId) => {
  const profession = PROFESSIONS[professionId]

  it('is a valid document', () => {
    expect(CvDocumentSchema.safeParse(createExampleCv(professionId)).success).toBe(true)
  })

  it("follows the profession's section layout", () => {
    const cv = createExampleCv(professionId)
    expect(cv.sections.map((s) => [s.type, s.column])).toEqual(profession.sections)
  })

  it("uses the profession's default template", () => {
    expect(createExampleCv(professionId).design.templateId).toBe(profession.recommendedTemplates[0])
  })

  it('gets fresh ids on every call', () => {
    const a = createExampleCv(professionId)
    const b = createExampleCv(professionId)
    expect(a.sections[0]!.id).not.toBe(b.sections[0]!.id)
  })
})
