import { describe, expect, it } from 'vitest'
import { TEXT_MAX, withinTextLimit } from './textLimit'
import {
  UpdateCvInputSchema,
  UpdateCoverLetterInputSchema,
  UpdateResignationInputSchema,
} from '../api/api'
import { createCoverLetter } from '../cover-letter/coverLetter'
import { createEmptyCv } from '../cv/factories'
import { createResignationLetter } from '../resignation/resignation'

describe('withinTextLimit', () => {
  it('looks at every text, however deep', () => {
    expect(withinTextLimit('a'.repeat(TEXT_MAX))).toBe(true)
    expect(withinTextLimit('a'.repeat(TEXT_MAX + 1))).toBe(false)
    expect(withinTextLimit({ a: [{ b: ['x', 'y'.repeat(11)] }], n: 5, ok: null }, 10)).toBe(false)
    expect(withinTextLimit({ a: [{ b: ['x', 'y'.repeat(10)] }], n: 5, ok: null }, 10)).toBe(true)
  })
})

describe('saving a document with a very long text', () => {
  const long = 'w'.repeat(TEXT_MAX + 1)

  it('refuses it for a CV, a cover letter and a resignation letter, but still reads it', () => {
    const cv = createEmptyCv()
    const summary = cv.sections.find((section) => section.type === 'summary')!
    if (summary.type !== 'summary') throw new Error('expected a summary')
    summary.text = long
    expect(UpdateCvInputSchema.safeParse({ revision: 1, document: cv }).success).toBe(false)

    const letter = createCoverLetter()
    letter.paragraphs = [long]
    expect(UpdateCoverLetterInputSchema.safeParse({ revision: 1, document: letter }).success).toBe(
      false,
    )

    const resignation = createResignationLetter()
    resignation.paragraphs = [long]
    expect(
      UpdateResignationInputSchema.safeParse({ revision: 1, document: resignation }).success,
    ).toBe(false)
  })

  it('accepts a text at the limit', () => {
    const resignation = createResignationLetter()
    resignation.paragraphs = ['w'.repeat(TEXT_MAX)]
    expect(
      UpdateResignationInputSchema.safeParse({ revision: 1, document: resignation }).success,
    ).toBe(true)
  })
})
