import { describe, expect, it } from 'vitest'
import {
  COVER_LETTER_DEFAULTS,
  CoverLetterDocumentSchema,
  createCoverLetter,
  formatLetterDate,
} from './coverLetter'
import { CV_LANGUAGES } from '../cv/common'
import { createEmptyCv } from '../cv/factories'
import { PROFESSION_IDS } from '../cv/professions'
import { createExampleCv } from '../examples'

const today = new Date(2026, 0, 5)

describe('formatLetterDate', () => {
  it.each([
    ['en-US', new Date(2026, 11, 31), 'December 31, 2026'],
    ['en-GB', new Date(2026, 11, 31), '31 December 2026'],
    ['en-US', new Date(2024, 1, 29), 'February 29, 2024'],
    ['en-GB', new Date(2026, 0, 1), '1 January 2026'],
  ] as const)('writes %s dates as expected', (language, date, expected) => {
    expect(formatLetterDate(date, language)).toBe(expected)
  })

  it.each(CV_LANGUAGES)('includes the year in %s, also for far-away years', (language) => {
    expect(formatLetterDate(new Date(2999, 5, 15), language)).toContain('2999')
    expect(formatLetterDate(new Date(1970, 0, 1), language)).toContain('1970')
  })

  it('throws a RangeError for an invalid date (callers pass a real Date)', () => {
    expect(() => formatLetterDate(new Date(NaN), 'en-US')).toThrow(RangeError)
  })
})

describe('createCoverLetter edge cases', () => {
  it.each(CV_LANGUAGES)(
    'makes a valid, empty-bodied letter in %s that round-trips through JSON',
    (language) => {
      const letter = createCoverLetter({ language, today })
      expect(CoverLetterDocumentSchema.parse(JSON.parse(JSON.stringify(letter)))).toEqual(letter)
      expect(letter.greeting).toBe(COVER_LETTER_DEFAULTS[language].greeting)
      expect(letter.closing).toBe(COVER_LETTER_DEFAULTS[language].closing)
    },
  )

  it('takes the language from the CV unless one is given', () => {
    const cv = createEmptyCv('bg')
    expect(createCoverLetter({ cv, today }).language).toBe('bg')
    expect(createCoverLetter({ cv, language: 'en-GB', today }).language).toBe('en-GB')
  })

  it.each(PROFESSION_IDS)('is valid when made from the %s example', (id) => {
    const letter = createCoverLetter({ cv: createExampleCv(id), today })
    expect(CoverLetterDocumentSchema.safeParse(letter).success).toBe(true)
  })

  it('copies the header so changing the letter never changes the CV', () => {
    const cv = createExampleCv('designer')
    const letter = createCoverLetter({ cv, today })
    letter.header.name = 'Changed'
    letter.design.accentColor = '#000000'
    expect(cv.header.name).not.toBe('Changed')
    expect(cv.design.accentColor).not.toBe('#000000')
  })

  it('does not share the paragraph list or the empty header between letters', () => {
    const a = createCoverLetter({ today })
    const b = createCoverLetter({ today })
    a.paragraphs.push('more')
    a.header.name = 'Someone'
    expect(b.paragraphs).toHaveLength(3)
    expect(b.header.name).toBe('')
  })

  it('keeps unusual company names exactly as given', () => {
    for (const company of ['', 'AT&T', '$& Co', 'Ünïcode GmbH', '公司', 'a'.repeat(5000)])
      expect(createCoverLetter({ company, today }).recipient.company).toBe(company)
  })

  it('uses an empty signature when the CV has no name', () => {
    expect(createCoverLetter({ cv: createEmptyCv(), today }).signature).toBe('')
  })

  it('treats cv: null like no CV', () => {
    expect(createCoverLetter({ cv: null, today }).header.name).toBe('')
  })
})

describe('CoverLetterDocumentSchema edge cases', () => {
  const letter = () => createCoverLetter({ today })

  it('needs 1 to 20 paragraphs', () => {
    expect(CoverLetterDocumentSchema.safeParse({ ...letter(), paragraphs: [] }).success).toBe(false)
    expect(CoverLetterDocumentSchema.safeParse({ ...letter(), paragraphs: [''] }).success).toBe(
      true,
    )
    expect(
      CoverLetterDocumentSchema.safeParse({ ...letter(), paragraphs: Array(20).fill('p') }).success,
    ).toBe(true)
    expect(
      CoverLetterDocumentSchema.safeParse({ ...letter(), paragraphs: Array(21).fill('p') }).success,
    ).toBe(false)
  })

  it.each([null, 'text', [1], [null], {}])('rejects paragraphs = %j', (paragraphs) => {
    expect(CoverLetterDocumentSchema.safeParse({ ...letter(), paragraphs }).success).toBe(false)
  })

  it.each([0, 2, '1', null])('rejects schemaVersion %j', (schemaVersion) => {
    expect(CoverLetterDocumentSchema.safeParse({ ...letter(), schemaVersion }).success).toBe(false)
  })

  it('needs the recipient object and every recipient field', () => {
    const { recipient: _r, ...without } = letter()
    expect(CoverLetterDocumentSchema.safeParse(without).success).toBe(false)
    expect(
      CoverLetterDocumentSchema.safeParse({
        ...letter(),
        recipient: { name: '', title: '', company: '' },
      }).success,
    ).toBe(false)
  })

  it('reads very long texts (limits are applied on save, not on read)', () => {
    const long = { ...letter(), paragraphs: ['x'.repeat(500_000)], greeting: 'g'.repeat(100_000) }
    expect(CoverLetterDocumentSchema.safeParse(long).success).toBe(true)
  })

  it('does not accept a CV as a cover letter, nor the reverse', () => {
    expect(CoverLetterDocumentSchema.safeParse(createEmptyCv()).success).toBe(false)
  })
})
