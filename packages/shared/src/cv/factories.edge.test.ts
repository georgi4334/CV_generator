import { describe, expect, it } from 'vitest'
import { CV_LANGUAGES } from './common'
import {
  ACCENT_PRESETS,
  CvDesignSchema,
  DEFAULT_DESIGN,
  FONT_FAMILIES,
  PAGE_SIZES,
  TEMPLATE_IDS,
  letterDesign,
} from './design'
import { CvDocumentSchema } from './document'
import { DEFAULT_SECTION_LAYOUT, createEmptyCv, createItem, createSection } from './factories'
import { PROFESSION_IDS, PROFESSIONS } from './professions'
import { SECTION_TYPES, type SectionType } from './sections'

const ITEM_TYPES = SECTION_TYPES.filter((type) => type !== 'summary')

describe('createItem', () => {
  it.each(ITEM_TYPES)('creates a %s item with a fresh id', (type) => {
    const a = createItem(type as Exclude<SectionType, 'summary'>)
    const b = createItem(type as Exclude<SectionType, 'summary'>)
    expect(a.id).not.toBe(b.id)
    expect(a.id.length).toBeGreaterThan(0)
  })

  it('does not share the bullets array between two items', () => {
    const a = createItem('experience')
    const b = createItem('experience')
    a.bullets.push('x')
    expect(b.bullets).toEqual([''])
  })
})

describe('createSection', () => {
  it.each(SECTION_TYPES)(
    'creates %s in both columns, visible and with the default title',
    (type) => {
      for (const column of ['main', 'sidebar'] as const) {
        const section = createSection(type, column)
        expect(section).toMatchObject({ type, column, visible: true, title: null })
      }
    },
  )

  it('creates a different section id each time', () => {
    expect(createSection('custom', 'main').id).not.toBe(createSection('custom', 'main').id)
  })
})

describe('createEmptyCv', () => {
  it.each(CV_LANGUAGES)('is valid in %s', (language) => {
    const cv = createEmptyCv(language)
    expect(cv.language).toBe(language)
    expect(CvDocumentSchema.safeParse(cv).success).toBe(true)
  })

  it('supports an empty layout', () => {
    const cv = createEmptyCv('en-US', [])
    expect(cv.sections).toEqual([])
    expect(CvDocumentSchema.safeParse(cv).success).toBe(true)
  })

  it('supports a layout that repeats a section type, with distinct ids', () => {
    const cv = createEmptyCv('en-US', [
      ['custom', 'main'],
      ['custom', 'main'],
      ['custom', 'sidebar'],
    ])
    expect(new Set(cv.sections.map((s) => s.id)).size).toBe(3)
    expect(CvDocumentSchema.safeParse(cv).success).toBe(true)
  })

  it('supports a layout with every section type', () => {
    const cv = createEmptyCv(
      'bg',
      SECTION_TYPES.map((type) => [type, 'main'] as [SectionType, 'main']),
    )
    expect(cv.sections.map((s) => s.type)).toEqual([...SECTION_TYPES])
    expect(CvDocumentSchema.safeParse(cv).success).toBe(true)
  })

  it.each(PROFESSION_IDS)('is valid with the layout of the %s profession', (id) => {
    const cv = createEmptyCv('en-GB', PROFESSIONS[id].sections)
    expect(CvDocumentSchema.safeParse(cv).success).toBe(true)
    expect(cv.sections.map((s) => [s.type, s.column])).toEqual(PROFESSIONS[id].sections)
  })

  it('does not change the default layout constant', () => {
    const before = JSON.stringify(DEFAULT_SECTION_LAYOUT)
    createEmptyCv()
    createEmptyCv('bg')
    expect(JSON.stringify(DEFAULT_SECTION_LAYOUT)).toBe(before)
  })

  it('starts with no personal details and no photo', () => {
    const { header } = createEmptyCv()
    expect(header).toMatchObject({
      name: '',
      email: '',
      phone: '',
      photoUrl: null,
      showPhoto: false,
    })
  })

  it('survives a JSON round trip', () => {
    const cv = createEmptyCv('bg')
    expect(JSON.parse(JSON.stringify(cv))).toEqual(cv)
  })
})

describe('CvDesignSchema', () => {
  it('accepts the default design, every template, font, page size and accent preset', () => {
    expect(CvDesignSchema.safeParse(DEFAULT_DESIGN).success).toBe(true)
    for (const templateId of TEMPLATE_IDS)
      expect(CvDesignSchema.safeParse({ ...DEFAULT_DESIGN, templateId }).success, templateId).toBe(
        true,
      )
    for (const fontFamily of FONT_FAMILIES)
      expect(CvDesignSchema.safeParse({ ...DEFAULT_DESIGN, fontFamily }).success, fontFamily).toBe(
        true,
      )
    for (const pageSize of PAGE_SIZES)
      expect(CvDesignSchema.safeParse({ ...DEFAULT_DESIGN, pageSize }).success, pageSize).toBe(true)
    for (const accentColor of ACCENT_PRESETS)
      expect(
        CvDesignSchema.safeParse({ ...DEFAULT_DESIGN, accentColor }).success,
        accentColor,
      ).toBe(true)
  })

  it.each([
    ['templateId', 'fancy'],
    ['templateId', 'Polished'],
    ['pageSize', 'A3'],
    ['pageSize', 'a4'],
    ['fontFamily', 'Comic Sans'],
    ['fontFamily', ''],
    ['pageMargins', 0],
    ['pageMargins', 6],
    ['sectionSpacing', 2.5],
    ['fontSize', NaN],
    ['lineHeight', Infinity],
    ['columnLayout', 0],
    ['columnLayout', 5],
    ['columnLayout', 1.5],
    ['columnLayout', '2'],
    ['accentColor', '#fff'],
    ['background', null],
    ['background', 3],
    ['showIcons', 'yes'],
  ])('rejects %s = %j', (key, value) => {
    expect(CvDesignSchema.safeParse({ ...DEFAULT_DESIGN, [key]: value }).success).toBe(false)
  })

  it.each([1, 2, 3, 4])('accepts columnLayout %i', (columnLayout) => {
    expect(CvDesignSchema.safeParse({ ...DEFAULT_DESIGN, columnLayout }).success).toBe(true)
  })

  it('accepts any background string, including an empty one (patterns are not validated here)', () => {
    expect(CvDesignSchema.safeParse({ ...DEFAULT_DESIGN, background: '' }).success).toBe(true)
    expect(
      CvDesignSchema.safeParse({ ...DEFAULT_DESIGN, background: 'x'.repeat(10_000) }).success,
    ).toBe(true)
  })

  it('makes every key required', () => {
    for (const key of Object.keys(DEFAULT_DESIGN)) {
      const { [key as keyof typeof DEFAULT_DESIGN]: _removed, ...rest } = DEFAULT_DESIGN
      expect(CvDesignSchema.safeParse(rest).success, key).toBe(false)
    }
  })
})

describe('letterDesign', () => {
  it.each(TEMPLATE_IDS)(
    'keeps everything but the template for %s, and stays valid',
    (templateId) => {
      const design = { ...DEFAULT_DESIGN, templateId, accentColor: '#123456', columnLayout: 2 }
      const letter = letterDesign(design)
      expect(CvDesignSchema.safeParse(letter).success).toBe(true)
      expect({ ...letter, templateId: 'x' }).toEqual({ ...design, templateId: 'x' })
    },
  )

  it('does not change the design it is given', () => {
    const design = { ...DEFAULT_DESIGN, templateId: 'executive' as const }
    letterDesign(design)
    expect(design.templateId).toBe('executive')
  })
})
