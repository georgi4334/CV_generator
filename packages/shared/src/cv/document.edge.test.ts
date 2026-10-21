import { describe, expect, it } from 'vitest'
import { CvDocumentSchema } from './document'
import { createEmptyCv, createItem, createSection } from './factories'
import { SECTION_TYPES, SectionSchema, SkillItemSchema, type Section } from './sections'
import { CertificateItemSchema } from './sections'
import { createId } from '../common/id'

const skill = (name = 'TypeScript') => ({ id: createId(), name, level: 3 })

const withSections = (sections: unknown[]) => ({ ...createEmptyCv(), sections })

describe('CvDocumentSchema top level', () => {
  it.each([0, 2, -1, 1.5, '1', null, undefined, NaN])(
    'rejects schemaVersion %j',
    (schemaVersion) => {
      expect(CvDocumentSchema.safeParse({ ...createEmptyCv(), schemaVersion }).success).toBe(false)
    },
  )

  it.each(['en', 'de', '', null, undefined])('rejects language %j', (language) => {
    expect(CvDocumentSchema.safeParse({ ...createEmptyCv(), language }).success).toBe(false)
  })

  it.each([null, undefined, 'cv', 42, [], true])('rejects a document that is %j', (value) => {
    expect(CvDocumentSchema.safeParse(value).success).toBe(false)
  })

  it('accepts a CV without any sections', () => {
    expect(CvDocumentSchema.safeParse(withSections([])).success).toBe(true)
  })

  it.each([null, undefined, {}, 'sections', 5])('rejects sections = %j', (sections) => {
    expect(CvDocumentSchema.safeParse({ ...createEmptyCv(), sections }).success).toBe(false)
  })

  it('strips unknown keys at every level instead of keeping them', () => {
    const cv = createEmptyCv() as unknown as Record<string, unknown>
    cv.extra = 'x'
    ;(cv.header as Record<string, unknown>).extra = 'x'
    ;(cv.design as Record<string, unknown>).extra = 'x'
    ;(cv.sections as Array<Record<string, unknown>>)[0]!.extra = 'x'
    const parsed = CvDocumentSchema.parse(cv)
    expect(JSON.stringify(parsed)).not.toContain('"extra"')
  })

  it('does not pollute Object.prototype from a JSON body with __proto__ keys', () => {
    const body = JSON.parse(
      JSON.stringify(createEmptyCv()).replace(
        '"schemaVersion":1',
        '"schemaVersion":1,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}',
      ),
    )
    const parsed = CvDocumentSchema.parse(body)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(Object.keys(parsed)).not.toContain('__proto__')
  })

  it('does not change the object it validates', () => {
    const cv = createEmptyCv()
    const before = JSON.stringify(cv)
    CvDocumentSchema.parse(cv)
    expect(JSON.stringify(cv)).toBe(before)
  })

  it('survives a JSON round trip unchanged', () => {
    const cv = createEmptyCv('bg')
    expect(CvDocumentSchema.parse(JSON.parse(JSON.stringify(cv)))).toEqual(cv)
  })
})

describe('SectionSchema', () => {
  it.each(SECTION_TYPES)('every %s section survives parse -> parse', (type) => {
    const section = createSection(type, 'sidebar')
    const once = SectionSchema.parse(section)
    expect(SectionSchema.parse(once)).toEqual(once)
  })

  it('needs a type, and the type decides the shape', () => {
    const { type: _type, ...noType } = createSection('skills', 'main')
    expect(SectionSchema.safeParse(noType).success).toBe(false)
    expect(
      SectionSchema.safeParse({ ...createSection('skills', 'main'), type: 'summary' }).success,
    ).toBe(false)
  })

  it.each(['Skills', 'SKILLS', '', null, 5, 'constructor', '__proto__'])(
    'rejects the type %j',
    (type) => {
      expect(SectionSchema.safeParse({ ...createSection('skills', 'main'), type }).success).toBe(
        false,
      )
    },
  )

  it.each(['left', 'Main', '', null])('rejects the column %j', (column) => {
    expect(SectionSchema.safeParse({ ...createSection('skills', 'main'), column }).success).toBe(
      false,
    )
  })

  it('rejects an empty section id and a missing one', () => {
    expect(SectionSchema.safeParse({ ...createSection('skills', 'main'), id: '' }).success).toBe(
      false,
    )
    const { id: _id, ...noId } = createSection('skills', 'main')
    expect(SectionSchema.safeParse(noId).success).toBe(false)
  })

  it('accepts a null or empty custom title but not a number', () => {
    expect(
      SectionSchema.safeParse({ ...createSection('skills', 'main'), title: null }).success,
    ).toBe(true)
    expect(SectionSchema.safeParse({ ...createSection('skills', 'main'), title: '' }).success).toBe(
      true,
    )
    expect(SectionSchema.safeParse({ ...createSection('skills', 'main'), title: 7 }).success).toBe(
      false,
    )
  })

  it.each(['visible', 'column'] as const)('requires %s', (key) => {
    const section = { ...createSection('skills', 'main') } as Record<string, unknown>
    delete section[key]
    expect(SectionSchema.safeParse(section).success).toBe(false)
  })

  it.each([null, 'items', {}, 5])('rejects items = %j', (items) => {
    expect(SectionSchema.safeParse({ ...createSection('skills', 'main'), items }).success).toBe(
      false,
    )
  })

  it.each(['pills', 'bullets', 'bar', 'dots', 'none'])(
    'allows the skills display %s',
    (levelDisplay) => {
      expect(
        SectionSchema.safeParse({ ...createSection('skills', 'main'), levelDisplay }).success,
      ).toBe(true)
    },
  )

  it('allows "text" levels for languages but not for skills', () => {
    expect(
      SectionSchema.safeParse({ ...createSection('languages', 'main'), levelDisplay: 'text' })
        .success,
    ).toBe(true)
    expect(
      SectionSchema.safeParse({ ...createSection('skills', 'main'), levelDisplay: 'text' }).success,
    ).toBe(false)
    expect(
      SectionSchema.safeParse({ ...createSection('languages', 'main'), levelDisplay: 'pills' })
        .success,
    ).toBe(false)
  })
})

describe('items', () => {
  it('lets a skill have no level, but not level 0 or 6', () => {
    expect(SkillItemSchema.safeParse({ ...skill(), level: null }).success).toBe(true)
    expect(SkillItemSchema.safeParse({ ...skill(), level: 0 }).success).toBe(false)
    expect(SkillItemSchema.safeParse({ ...skill(), level: 6 }).success).toBe(false)
    expect(SkillItemSchema.safeParse({ id: 'a', name: 'x' }).success).toBe(false)
  })

  it('defaults a missing certificate expiry to null, and keeps an explicit null or date', () => {
    const base = { id: 'a', name: 'AWS', issuer: 'Amazon', date: '2023-01', link: '' }
    expect(CertificateItemSchema.parse(base).expiryDate).toBeNull()
    expect(CertificateItemSchema.parse({ ...base, expiryDate: '2026' }).expiryDate).toBe('2026')
    expect(CertificateItemSchema.safeParse({ ...base, expiryDate: '2026-13' }).success).toBe(false)
  })

  it.each([
    ['experience', 'startDate', '2024-13'],
    ['experience', 'endDate', '24-01'],
    ['education', 'startDate', 'now'],
    ['projects', 'endDate', '2024-1'],
    ['courses', 'date', '2024-00'],
    ['certificates', 'date', '99999'],
  ] as const)('rejects a bad date in %s.%s (%s)', (type, key, value) => {
    const section = createSection(type, 'main') as Section & {
      items: Array<Record<string, unknown>>
    }
    section.items[0]![key] = value
    expect(SectionSchema.safeParse(section).success).toBe(false)
  })

  it('keeps a free-text date on custom items (it is not a YearMonth)', () => {
    const section = createSection('custom', 'main')
    section.items[0]!.date = 'Spring 2020 (sic)'
    expect(SectionSchema.safeParse(section).success).toBe(true)
  })

  it('accepts bullets that are empty, whitespace, emoji or RTL text', () => {
    const section = createItem('experience')
    section.bullets = ['', '   ', '🚀 Shipped', 'هذا اختبار', 'a\u0000b']
    expect(
      CvDocumentSchema.safeParse(
        withSections([{ ...createSection('experience', 'main'), items: [section] }]),
      ).success,
    ).toBe(true)
  })

  it.each([[null], [5], [{}], [[1]], [[null]]])('rejects bullets = %j', (bullets) => {
    const item = { ...createItem('experience'), bullets }
    expect(
      SectionSchema.safeParse({ ...createSection('experience', 'main'), items: [item] }).success,
    ).toBe(false)
  })
})

describe('abuse: very large documents', () => {
  it('validates 2,000 sections of 20 skills each within a second and without throwing', () => {
    const sections = Array.from({ length: 2000 }, () => ({
      ...createSection('skills', 'sidebar'),
      items: Array.from({ length: 20 }, () => skill()),
    }))
    const started = Date.now()
    const result = CvDocumentSchema.safeParse(withSections(sections))
    expect(result.success).toBe(true)
    expect(Date.now() - started).toBeLessThan(1500)
  })

  it('validates one experience with 10,000 bullets', () => {
    const item = {
      ...createItem('experience'),
      bullets: Array.from({ length: 10_000 }, (_, i) => `bullet ${i}`),
    }
    const result = CvDocumentSchema.safeParse(
      withSections([{ ...createSection('experience', 'main'), items: [item] }]),
    )
    expect(result.success).toBe(true)
  })

  it('validates a single 1 MB bullet (length is limited on save, not on read)', () => {
    const item = { ...createItem('experience'), bullets: ['y'.repeat(1_000_000)] }
    expect(
      CvDocumentSchema.safeParse(
        withSections([{ ...createSection('experience', 'main'), items: [item] }]),
      ).success,
    ).toBe(true)
  })

  it('fails with a Zod error, not an exception, on 1,000 invalid sections', () => {
    const sections = Array.from({ length: 1000 }, () => ({ type: 'nope' }))
    let result: ReturnType<typeof CvDocumentSchema.safeParse> | undefined
    expect(() => {
      result = CvDocumentSchema.safeParse(withSections(sections))
    }).not.toThrow()
    expect(result?.success).toBe(false)
  })

  it('rejects deeply nested junk quickly and without a stack overflow', () => {
    let deep: unknown = 'leaf'
    for (let i = 0; i < 5000; i++) deep = [deep]
    expect(() => CvDocumentSchema.safeParse(withSections([deep]))).not.toThrow()
    expect(CvDocumentSchema.safeParse(withSections([deep])).success).toBe(false)
    expect(CvDocumentSchema.safeParse({ ...createEmptyCv(), header: deep }).success).toBe(false)
  })

  it('does not crash on a circular object', () => {
    const loop: Record<string, unknown> = { type: 'skills' }
    loop.self = loop
    expect(() => CvDocumentSchema.safeParse(withSections([loop]))).not.toThrow()
  })

  it("accepts the same item id used twice (uniqueness is the editor's job)", () => {
    const item = skill()
    const section = { ...createSection('skills', 'main'), items: [item, item] }
    expect(CvDocumentSchema.safeParse(withSections([section])).success).toBe(true)
  })
})
