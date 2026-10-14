import { CvDocumentSchema, DEFAULT_SECTION_LAYOUT, PROFESSIONS } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { buildNewCv } from './buildNewCv'

const layout = (cv: ReturnType<typeof buildNewCv>) => cv.sections.map((s) => [s.type, s.column])

describe('buildNewCv', () => {
  it("starts blank with the profession's usual sections", () => {
    const cv = buildNewCv({
      professionId: 'healthcare',
      templateId: 'timeline',
      startFrom: 'blank',
      language: 'en-US',
    })
    expect(layout(cv)).toEqual(PROFESSIONS.healthcare.sections)
    expect(cv.header.name).toBe('')
    expect(CvDocumentSchema.safeParse(cv).success).toBe(true)
  })

  it("starts from the profession's example", () => {
    const cv = buildNewCv({
      professionId: 'designer',
      templateId: 'creative',
      startFrom: 'example',
      language: 'en-US',
    })
    expect(cv.header.name).not.toBe('')
    expect(cv.sections.some((s) => s.type === 'experience' && s.items.length > 0)).toBe(true)
    expect(CvDocumentSchema.safeParse(cv).success).toBe(true)
  })

  it("applies the chosen template with its suggested look and the example's color", () => {
    const example = buildNewCv({
      professionId: 'designer',
      templateId: 'stylish',
      startFrom: 'example',
      language: 'en-US',
    })
    const blank = buildNewCv({
      professionId: 'designer',
      templateId: 'stylish',
      startFrom: 'blank',
      language: 'en-US',
    })
    for (const cv of [example, blank]) {
      expect(cv.design).toMatchObject({
        templateId: 'stylish',
        fontFamily: 'Lora',
        columnLayout: 3,
        accentColor: '#6b21a8',
      })
    }
  })

  it('uses the chosen language', () => {
    const cv = buildNewCv({
      professionId: 'academic',
      templateId: 'single-column',
      startFrom: 'example',
      language: 'bg',
    })
    expect(cv.language).toBe('bg')
  })

  it('uses the general layout and starts blank without a profession', () => {
    const cv = buildNewCv({
      professionId: null,
      templateId: 'polished',
      startFrom: 'example',
      language: 'en-GB',
    })
    expect(layout(cv)).toEqual(DEFAULT_SECTION_LAYOUT)
    expect(cv.header.name).toBe('')
    expect(cv.language).toBe('en-GB')
  })

  it('gives every new CV its own ids', () => {
    const choice = {
      professionId: 'software-developer',
      templateId: 'polished',
      startFrom: 'example',
      language: 'en-US',
    } as const
    expect(buildNewCv(choice).sections[0]!.id).not.toBe(buildNewCv(choice).sections[0]!.id)
  })
})
