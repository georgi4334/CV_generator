import { describe, expect, it } from 'vitest'
import { moveSection } from './sectionOrder'

const doc = [
  { id: 'summary', column: 'main' as const },
  { id: 'experience', column: 'main' as const },
  { id: 'skills', column: 'sidebar' as const },
  { id: 'education', column: 'sidebar' as const },
]
const order = (sections: typeof doc) => sections.map((s) => `${s.column}:${s.id}`)

describe('moveSection', () => {
  it('reorders inside a column', () => {
    expect(order(moveSection(doc, 'summary', 'main', 1))).toEqual([
      'main:experience',
      'main:summary',
      'sidebar:skills',
      'sidebar:education',
    ])
  })

  it('moves a section into the other column at a position', () => {
    expect(order(moveSection(doc, 'experience', 'sidebar', 1))).toEqual([
      'main:summary',
      'sidebar:skills',
      'sidebar:experience',
      'sidebar:education',
    ])
  })

  it('clamps the index to the end of the column', () => {
    expect(order(moveSection(doc, 'skills', 'main', 99))).toEqual([
      'main:summary',
      'main:experience',
      'main:skills',
      'sidebar:education',
    ])
  })

  it('returns the same list for an unknown id', () => {
    expect(moveSection(doc, 'nope', 'main', 0)).toBe(doc)
  })
})
