import { describe, expect, it } from 'vitest'
import { UpdateCvInputSchema } from '../api/api'
import { withinTextLimit } from '../common/textLimit'
import { TEMPLATE_IDS } from '../cv/design'
import { CvDocumentSchema } from '../cv/document'
import { headerWithinLimits } from '../cv/header'
import { PROFESSION_IDS, PROFESSIONS } from '../cv/professions'
import { SECTION_TYPES } from '../cv/sections'
import { formatDateRange } from '../cv/i18n'
import { buildExample, range } from './build'
import { createExampleCv } from './index'

describe.each(PROFESSION_IDS)('example CV (edge cases): %s', (professionId) => {
  it('survives a JSON round trip unchanged', () => {
    const cv = createExampleCv(professionId)
    expect(CvDocumentSchema.parse(JSON.parse(JSON.stringify(cv)))).toEqual(cv)
  })

  it('can be saved as it is (within header and text limits)', () => {
    const cv = createExampleCv(professionId)
    expect(headerWithinLimits(cv)).toBe(true)
    expect(withinTextLimit(cv)).toBe(true)
    expect(UpdateCvInputSchema.safeParse({ revision: 1, document: cv }).success).toBe(true)
  })

  it('stays valid with every template applied', () => {
    for (const templateId of TEMPLATE_IDS) {
      const cv = createExampleCv(professionId)
      cv.design.templateId = templateId
      expect(CvDocumentSchema.safeParse(cv).success, templateId).toBe(true)
    }
  })

  it('stays valid in every language', () => {
    for (const language of ['en-US', 'en-GB', 'bg'] as const) {
      const cv = { ...createExampleCv(professionId), language }
      expect(CvDocumentSchema.safeParse(cv).success, language).toBe(true)
    }
  })

  it('has a name, a headline, contacts and no photo', () => {
    const { header } = createExampleCv(professionId)
    expect(header.name.trim()).not.toBe('')
    expect(header.headline.trim()).not.toBe('')
    expect(header.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
    expect(header.photoUrl).toBeNull()
    expect(header.showPhoto).toBe(false)
  })

  it('uses an example domain for the email, never a real company', () => {
    expect(createExampleCv(professionId).header.email).toMatch(/@example\.[a-z]+$/)
  })

  it('has ids that are unique across the whole document', () => {
    const cv = createExampleCv(professionId)
    const ids: string[] = []
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk)
      else if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>
        if (typeof record.id === 'string') ids.push(record.id)
        Object.values(record).forEach(walk)
      }
    }
    walk(cv.sections)
    expect(ids.length).toBeGreaterThan(cv.sections.length)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('shares no ids between two copies', () => {
    const idsOf = (cv: ReturnType<typeof createExampleCv>) =>
      cv.sections.flatMap((s) => [s.id, ...('items' in s ? s.items.map((i) => i.id) : [])])
    const a = new Set(idsOf(createExampleCv(professionId)))
    expect(idsOf(createExampleCv(professionId)).some((id) => a.has(id))).toBe(false)
  })

  it('shares no mutable state between two copies', () => {
    const a = createExampleCv(professionId)
    const b = createExampleCv(professionId)
    a.design.accentColor = '#000001'
    a.header.name = 'Changed'
    a.sections.pop()
    expect(b.design.accentColor).not.toBe('#000001')
    expect(b.header.name).not.toBe('Changed')
    expect(b.sections.length).toBe(PROFESSIONS[professionId].sections.length)
  })

  it('has visible sections with the default (null) titles', () => {
    for (const section of createExampleCv(professionId).sections) {
      expect(section.visible).toBe(true)
      expect(section.title).toBeNull()
    }
  })

  it('has a non-empty summary and at least one filled item in every other section', () => {
    for (const section of createExampleCv(professionId).sections) {
      if (section.type === 'summary') expect(section.text.trim().length).toBeGreaterThan(20)
      else expect(section.items.length, section.type).toBeGreaterThan(0)
    }
  })

  it('has no blank bullets and no blank item titles', () => {
    for (const section of createExampleCv(professionId).sections) {
      if (section.type === 'summary') continue
      for (const item of section.items) {
        if ('bullets' in item) for (const bullet of item.bullets) expect(bullet.trim()).not.toBe('')
        const label =
          'title' in item
            ? item.title
            : 'name' in item
              ? item.name
              : 'degree' in item
                ? item.degree
                : 'x'
        expect(label.trim(), section.type).not.toBe('')
      }
    }
  })

  it('has date ranges that format without "undefined" or "NaN" and never run backwards', () => {
    for (const section of createExampleCv(professionId).sections) {
      if (
        section.type !== 'experience' &&
        section.type !== 'education' &&
        section.type !== 'projects'
      )
        continue
      for (const item of section.items) {
        const text = formatDateRange(item, 'en-US')
        expect(text).not.toMatch(/undefined|NaN/)
        if (item.startDate && item.endDate && !item.isCurrent)
          expect(item.endDate >= item.startDate).toBe(true)
      }
    }
  })

  it('has skill and language levels from 1 to 5', () => {
    for (const section of createExampleCv(professionId).sections) {
      if (section.type !== 'skills' && section.type !== 'languages') continue
      for (const item of section.items)
        if (item.level !== null) expect([1, 2, 3, 4, 5]).toContain(item.level)
    }
  })

  it('only uses known section types', () => {
    for (const section of createExampleCv(professionId).sections)
      expect(SECTION_TYPES).toContain(section.type)
  })
})

describe('createExampleCv', () => {
  it('throws for a profession that does not exist (callers check with isProfessionId first)', () => {
    expect(() => createExampleCv('astronaut' as never)).toThrow()
  })

  it('is fast enough to call for every profession in a loop of 200', () => {
    const started = Date.now()
    for (let i = 0; i < 200; i++) for (const id of PROFESSION_IDS) createExampleCv(id)
    expect(Date.now() - started).toBeLessThan(3000)
  })
})

describe('buildExample and range', () => {
  const header = {
    name: 'N',
    headline: 'H',
    email: 'n@example.com',
    phone: '',
    location: '',
    link: '',
  }

  it('builds a valid empty example', () => {
    const cv = buildExample(header, [])
    expect(cv.sections).toEqual([])
    expect(CvDocumentSchema.safeParse(cv).success).toBe(true)
  })

  it('gives sections without items none, and sections with items fresh ids', () => {
    const cv = buildExample(header, [
      { type: 'summary', column: 'main', text: 'Hi' },
      {
        type: 'skills',
        column: 'sidebar',
        levelDisplay: 'none',
        items: [
          { name: 'A', level: null },
          { name: 'B', level: 2 },
        ],
      },
    ])
    const skills = cv.sections[1]!
    if (skills.type !== 'skills') throw new Error('expected skills')
    expect(skills.items.map((i) => i.id)).toHaveLength(2)
    expect(new Set([cv.sections[0]!.id, skills.id, ...skills.items.map((i) => i.id)]).size).toBe(4)
    expect(CvDocumentSchema.safeParse(cv).success).toBe(true)
  })

  it('applies a partial design over the default one', () => {
    const cv = buildExample(header, [], { templateId: 'bold', fontSize: 4 })
    expect(cv.design).toMatchObject({ templateId: 'bold', fontSize: 4, pageSize: 'A4' })
  })

  it('does not change the shared default design', () => {
    const a = buildExample(header, [])
    a.design.accentColor = '#000002'
    expect(buildExample(header, []).design.accentColor).not.toBe('#000002')
  })

  it('range() is current when there is no end date, and closed with one', () => {
    expect(range('2020')).toEqual({ startDate: '2020', endDate: null, isCurrent: true })
    expect(range('2020', '2021-06')).toEqual({
      startDate: '2020',
      endDate: '2021-06',
      isCurrent: false,
    })
    expect(range(null)).toEqual({ startDate: null, endDate: null, isCurrent: true })
  })
})
