import { describe, expect, it } from 'vitest'
import { CvDocumentSchema } from './document'
import { createEmptyCv, createSection } from './factories'
import { UpdateCvInputSchema } from '../api/api'
import { fieldMaxLength, HEADER_LIMITS } from './header'
import { getSectionTitle } from './i18n'
import { SECTION_TYPES } from './sections'

describe('createEmptyCv', () => {
  it('produces a valid document with the reference layout', () => {
    const cv = createEmptyCv()
    expect(CvDocumentSchema.parse(cv)).toEqual(cv)
    expect(cv.sections.map((s) => [s.type, s.column])).toEqual([
      ['summary', 'main'],
      ['experience', 'main'],
      ['achievements', 'sidebar'],
      ['skills', 'sidebar'],
      ['courses', 'sidebar'],
      ['education', 'sidebar'],
    ])
  })

  it('does not share the design object between documents', () => {
    const a = createEmptyCv()
    const b = createEmptyCv()
    a.design.accentColor = '#000000'
    expect(b.design.accentColor).not.toBe('#000000')
  })
})

describe('createSection', () => {
  it.each(SECTION_TYPES)('creates a valid %s section', (type) => {
    const cv = { ...createEmptyCv(), sections: [createSection(type, 'main')] }
    expect(CvDocumentSchema.safeParse(cv).success).toBe(true)
  })
})

describe('CvDocumentSchema', () => {
  it('rejects an invalid date', () => {
    const cv = createEmptyCv()
    const experience = cv.sections.find((s) => s.type === 'experience')!
    if (experience.type === 'experience') experience.items[0]!.startDate = '2024-13'
    expect(CvDocumentSchema.safeParse(cv).success).toBe(false)
  })

  it('rejects an invalid accent color', () => {
    const cv = createEmptyCv()
    cv.design.accentColor = 'teal'
    expect(CvDocumentSchema.safeParse(cv).success).toBe(false)
  })

  it('rejects an unknown section type', () => {
    const cv = createEmptyCv() as unknown as { sections: Array<{ type: string }> }
    cv.sections[0]!.type = 'hobbies'
    expect(CvDocumentSchema.safeParse(cv).success).toBe(false)
  })
})

describe('getSectionTitle', () => {
  it('uses the language default when the title is not customised', () => {
    const section = createSection('experience', 'main')
    expect(getSectionTitle(section, 'en-US')).toBe('Experience')
    expect(getSectionTitle(section, 'bg')).toBe('Професионален опит')
  })

  it('prefers a custom title', () => {
    const section = { ...createSection('experience', 'main'), title: 'Work History' }
    expect(getSectionTitle(section, 'bg')).toBe('Work History')
  })
})

describe('header limits', () => {
  it('refuses to save header text longer than its limit, but still reads it', () => {
    const cv = createEmptyCv()
    expect(UpdateCvInputSchema.safeParse({ revision: 1, document: cv }).success).toBe(true)
    for (const key of Object.keys(HEADER_LIMITS) as Array<keyof typeof HEADER_LIMITS>) {
      const long = { ...cv, header: { ...cv.header, [key]: 'x'.repeat(HEADER_LIMITS[key] + 1) } }
      expect(UpdateCvInputSchema.safeParse({ revision: 1, document: long }).success, key).toBe(
        false,
      )
      expect(CvDocumentSchema.safeParse(long).success, `${key} still readable`).toBe(true)
      const atLimit = { ...cv, header: { ...cv.header, [key]: 'x'.repeat(HEADER_LIMITS[key]) } }
      expect(UpdateCvInputSchema.safeParse({ revision: 1, document: atLimit }).success, key).toBe(
        true,
      )
    }
  })

  it('knows the limit of a header path, and no other', () => {
    expect(fieldMaxLength('header.phone')).toBe(HEADER_LIMITS.phone)
    expect(fieldMaxLength('header.photoUrl')).toBeUndefined()
    expect(fieldMaxLength('sections.0.items.0.name')).toBeUndefined()
  })
})
