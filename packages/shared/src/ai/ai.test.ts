import { describe, expect, it } from 'vitest'
import {
  applySuggestion,
  containsTerm,
  cvFields,
  FixMistakesInputSchema,
  letterFields,
  matchKeywords,
  TailorInputSchema,
} from './ai'
import { createCoverLetter } from '../cover-letter/coverLetter'
import { createExampleCv } from '../examples'

describe('cvFields', () => {
  it('lists the visible text with editor paths and readable labels', () => {
    const cv = createExampleCv('software-developer')
    const fields = cvFields(cv)
    const summary = cv.sections.find((s) => s.type === 'summary')!
    expect(fields).toContainEqual(
      expect.objectContaining({ path: `sections.${summary.id}.text`, label: 'Summary' }),
    )
    const experience = cv.sections.find((s) => s.type === 'experience')!
    if (experience.type !== 'experience') throw new Error()
    const job = experience.items[0]!
    expect(fields).toContainEqual({
      path: `sections.${experience.id}.items.${job.id}.bullets.0`,
      label: `Experience › ${job.title} at ${job.company} › bullet 1`,
      text: job.bullets[0],
    })
    expect(fields.every((f) => f.text.trim() !== '')).toBe(true)
    expect(fields.some((f) => f.text === cv.header.email)).toBe(false)
  })

  it('leaves out hidden sections', () => {
    const cv = createExampleCv('software-developer')
    const hidden = { ...cv, sections: cv.sections.map((s) => ({ ...s, visible: false })) }
    expect(cvFields(hidden).map((f) => f.path)).toEqual(['header.headline'])
  })
})

describe('letterFields', () => {
  it('lists greeting, paragraphs and closing', () => {
    const letter = createCoverLetter({ cv: null, company: 'Acme', language: 'en-US' })
    const filled = { ...letter, greeting: 'Dear Ms Smith,', paragraphs: ['One.', '', 'Three.'] }
    expect(letterFields(filled).map((f) => f.path)).toEqual([
      'greeting',
      'paragraphs.0',
      'paragraphs.2',
      ...(filled.closing.trim() ? ['closing'] : []),
    ])
  })
})

describe('keywords', () => {
  it('matches whole words and phrases in any case', () => {
    expect(containsTerm('Built apps in React and TypeScript', 'react')).toBe(true)
    expect(containsTerm('Reactive programming', 'React')).toBe(false)
    expect(containsTerm('C++ and Node.js', 'C++')).toBe(true)
    expect(containsTerm('C++ and Node.js', 'node.js')).toBe(true)
    expect(containsTerm('Led a team of five', 'team  of')).toBe(true)
    expect(containsTerm('Опит с управление на проекти', 'управление на проекти')).toBe(true)
    expect(containsTerm('Опит', 'Оп')).toBe(false)
  })

  it('scores important keywords double', () => {
    const fields = [{ path: 'a', label: 'A', text: 'React, SQL' }]
    const result = matchKeywords(fields, [
      { term: 'React', importance: 'high' },
      { term: 'Kubernetes', importance: 'high' },
      { term: 'SQL', importance: 'medium' },
    ])
    expect(result.matched.map((k) => k.term)).toEqual(['React', 'SQL'])
    expect(result.missing.map((k) => k.term)).toEqual(['Kubernetes'])
    expect(result.score).toBe(60)
    expect(matchKeywords(fields, []).score).toBe(0)
  })
})

describe('applySuggestion', () => {
  it('replaces the first occurrence, or says the text changed', () => {
    expect(applySuggestion('I has a cat', { original: 'has', replacement: 'have' })).toBe(
      'I have a cat',
    )
    expect(applySuggestion('I have a cat', { original: 'has', replacement: 'have' })).toBeNull()
  })
})

describe('input limits', () => {
  it('refuses too much text and too short postings', () => {
    const big = Array.from({ length: 10 }, (_, i) => ({
      path: `p${i}`,
      label: '',
      text: 'x'.repeat(3500),
    }))
    expect(FixMistakesInputSchema.safeParse({ language: 'en-US', fields: big }).success).toBe(false)
    expect(
      TailorInputSchema.safeParse({ language: 'en-US', fields: [], jobDescription: 'short' })
        .success,
    ).toBe(false)
  })
})
