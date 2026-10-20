import { describe, expect, it } from 'vitest'
import { CV_LANGUAGES } from '../cv/common'
import { createEmptyCv } from '../cv/factories'
import { PROFESSION_IDS } from '../cv/professions'
import { createExampleCv } from '../examples'
import {
  RESIGNATION_DEFAULTS,
  RESIGNATION_LIMITS,
  ResignationDocumentSchema,
  createResignationLetter,
  resignationFieldMaxLength,
  resignationWithinLimits,
} from './resignation'

const today = new Date(2026, 9, 15)

describe('RESIGNATION_DEFAULTS', () => {
  it.each(CV_LANGUAGES)(
    '%s has non-empty texts, a greeting that names the contact, and 3 paragraphs',
    (language) => {
      const texts = RESIGNATION_DEFAULTS[language]
      expect(texts.subject.trim()).not.toBe('')
      expect(texts.closing.trim()).not.toBe('')
      expect(texts.greetingTo('Jo Smith')).toContain('Jo Smith')
      expect(texts.paragraphs('Acme')).toHaveLength(3)
      expect(texts.paragraphs('')).toHaveLength(3)
    },
  )

  it.each(CV_LANGUAGES)(
    '%s mentions the company in the first paragraph only when there is one',
    (language) => {
      const texts = RESIGNATION_DEFAULTS[language]
      expect(texts.paragraphs('Acme')[0]).toContain('Acme')
      expect(texts.paragraphs('')[0]).not.toMatch(/ at $| с $|\s{2}/)
      expect(texts.paragraphs('')[0]).not.toContain('undefined')
    },
  )
})

describe('createResignationLetter edge cases', () => {
  it.each(PROFESSION_IDS)(
    'is valid and keeps a JSON round trip when made from the %s example',
    (id) => {
      const letter = createResignationLetter({ cv: createExampleCv(id), today })
      expect(ResignationDocumentSchema.parse(JSON.parse(JSON.stringify(letter)))).toEqual(letter)
      expect(resignationWithinLimits(letter)).toBe(true)
    },
  )

  it('works for a CV without any personal details', () => {
    const letter = createResignationLetter({ cv: createEmptyCv(), today })
    expect(letter.sender).toEqual({ name: '', email: '', phone: '', residence: '' })
    expect(ResignationDocumentSchema.safeParse(letter).success).toBe(true)
  })

  it('lets an explicit language win over the CV language', () => {
    const cv = createEmptyCv('bg')
    expect(createResignationLetter({ cv, today }).language).toBe('bg')
    expect(createResignationLetter({ cv, language: 'en-GB', today }).greeting).toBe(
      'Dear Sir or Madam,',
    )
  })

  it('writes a company with $ and regex characters into the text literally', () => {
    const letter = createResignationLetter({ company: '$& (A+B) Ltd', today })
    expect(letter.paragraphs[0]).toContain('at $& (A+B) Ltd,')
  })

  it('uses the generic greeting for a blank contact', () => {
    expect(createResignationLetter({ contact: '', today }).greeting).toBe('Dear Sir or Madam,')
  })

  it('does not share its paragraph list or design between letters', () => {
    const a = createResignationLetter({ today })
    const b = createResignationLetter({ today })
    a.paragraphs.push('x')
    a.design.fontSize = 5
    expect(b.paragraphs).toHaveLength(3)
    expect(b.design.fontSize).not.toBe(5)
  })

  it('does not change the CV it is made from', () => {
    const cv = createExampleCv('academic')
    const before = JSON.stringify(cv)
    createResignationLetter({ cv, today })
    expect(JSON.stringify(cv)).toBe(before)
  })
})

describe('ResignationDocumentSchema edge cases', () => {
  const letter = () => createResignationLetter({ today })

  it('needs 1 to 20 paragraphs', () => {
    expect(ResignationDocumentSchema.safeParse({ ...letter(), paragraphs: [] }).success).toBe(false)
    expect(ResignationDocumentSchema.safeParse({ ...letter(), paragraphs: ['a'] }).success).toBe(
      true,
    )
    expect(
      ResignationDocumentSchema.safeParse({ ...letter(), paragraphs: Array(20).fill('p') }).success,
    ).toBe(true)
    expect(
      ResignationDocumentSchema.safeParse({ ...letter(), paragraphs: Array(21).fill('p') }).success,
    ).toBe(false)
  })

  it.each(['sender', 'employer'] as const)('needs the whole %s object', (key) => {
    const doc = { ...letter() } as Record<string, unknown>
    delete doc[key]
    expect(ResignationDocumentSchema.safeParse(doc).success).toBe(false)
    expect(ResignationDocumentSchema.safeParse({ ...letter(), [key]: {} }).success).toBe(false)
    expect(ResignationDocumentSchema.safeParse({ ...letter(), [key]: null }).success).toBe(false)
  })

  it('strips unknown keys, also inside sender and employer', () => {
    const doc = { ...letter(), extra: 1, sender: { ...letter().sender, ssn: '123' } }
    expect(JSON.stringify(ResignationDocumentSchema.parse(doc))).not.toMatch(/extra|ssn/)
  })

  it('reads texts far beyond the save limits', () => {
    const doc = { ...letter(), subject: 's'.repeat(100_000) }
    expect(ResignationDocumentSchema.safeParse(doc).success).toBe(true)
    expect(resignationWithinLimits(doc)).toBe(false)
  })
})

describe('resignation limits at the boundary', () => {
  const sender = Object.entries(RESIGNATION_LIMITS.sender)
  const employer = Object.entries(RESIGNATION_LIMITS.employer)

  it.each(sender)('sender.%s: exactly %i is fine, one more is not', (key, max) => {
    const doc = createResignationLetter({ today })
    ;(doc.sender as Record<string, string>)[key] = 'x'.repeat(max)
    expect(resignationWithinLimits(doc)).toBe(true)
    ;(doc.sender as Record<string, string>)[key] = 'x'.repeat(max + 1)
    expect(resignationWithinLimits(doc)).toBe(false)
  })

  it.each(employer)('employer.%s: exactly %i is fine, one more is not', (key, max) => {
    const doc = createResignationLetter({ today })
    ;(doc.employer as Record<string, string>)[key] = 'x'.repeat(max)
    expect(resignationWithinLimits(doc)).toBe(true)
    ;(doc.employer as Record<string, string>)[key] = 'x'.repeat(max + 1)
    expect(resignationWithinLimits(doc)).toBe(false)
  })

  it.each([
    ['subject', RESIGNATION_LIMITS.subject],
    ['date', RESIGNATION_LIMITS.date],
  ] as const)('%s: exactly %i is fine, one more is not', (key, max) => {
    const doc = createResignationLetter({ today })
    doc[key] = 'x'.repeat(max)
    expect(resignationWithinLimits(doc)).toBe(true)
    doc[key] = 'x'.repeat(max + 1)
    expect(resignationWithinLimits(doc)).toBe(false)
  })

  it('does not limit the greeting, closing or signature here (the generic text limit does)', () => {
    const doc = createResignationLetter({ today })
    doc.greeting = 'g'.repeat(4000)
    doc.signature = 's'.repeat(4000)
    expect(resignationWithinLimits(doc)).toBe(true)
  })

  it('knows every limited path', () => {
    for (const [key, max] of sender) expect(resignationFieldMaxLength(`sender.${key}`)).toBe(max)
    for (const [key, max] of employer)
      expect(resignationFieldMaxLength(`employer.${key}`)).toBe(max)
    expect(resignationFieldMaxLength('date')).toBe(RESIGNATION_LIMITS.date)
  })

  it.each([
    '',
    'sender',
    'employer',
    'sender.',
    'sender.unknown',
    'employer.name',
    'greeting',
    'closing',
    'signature',
    'Sender.name',
  ])('has no limit for the path %j', (path) => {
    expect(resignationFieldMaxLength(path)).toBeUndefined()
  })

  // BUG: `key in limits` also matches inherited Object.prototype properties, so these paths
  // return a function/object instead of `undefined` (same flaw as fieldMaxLength in header.ts).
  it.fails.each([
    'sender.toString',
    'sender.constructor',
    'employer.hasOwnProperty',
    'employer.__proto__',
  ])('has no limit for the inherited property path %s', (path) => {
    expect(resignationFieldMaxLength(path)).toBeUndefined()
  })
})
