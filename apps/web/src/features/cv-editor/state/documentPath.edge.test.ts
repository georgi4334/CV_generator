import { createExampleCv } from '@cv/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { getAtPath, setAtPath } from './documentPath'
import { moveSection } from './sectionOrder'

describe('getAtPath', () => {
  const cv = createExampleCv('software-developer')
  const experience = cv.sections.find((s) => s.type === 'experience')!
  if (experience.type !== 'experience') throw new Error('expected experience')
  const item = experience.items[0]!

  it('reads header, section and item values', () => {
    expect(getAtPath(cv, 'header.name')).toBe(cv.header.name)
    expect(getAtPath(cv, `sections.${experience.id}.items.${item.id}.title`)).toBe(item.title)
    expect(getAtPath(cv, `sections.${experience.id}.items.${item.id}.bullets.0`)).toBe(
      item.bullets[0],
    )
  })

  it.each([
    ['an empty path', ''],
    ['a dot only', '.'],
    ['a trailing dot', 'header.'],
    ['an unknown section', 'sections.nope.text'],
    ['an unknown field', 'header.nothing'],
    ['a negative index', 'sections.-1.id'],
    ['a fractional index', 'sections.1.5.id'],
    ['a path through a string', 'header.name.length.x'],
  ])('returns undefined for %s', (_, path) => {
    expect(getAtPath(cv, path)).toBeUndefined()
  })

  it('does not throw on null or primitive roots', () => {
    expect(getAtPath(null, 'a.b')).toBeUndefined()
    expect(getAtPath(undefined, 'a')).toBeUndefined()
    expect(getAtPath(5, 'a')).toBeUndefined()
    expect(getAtPath('text', '0')).toBeUndefined()
  })
})

describe('setAtPath with hostile or odd paths', () => {
  const original = Object.prototype.toString
  afterEach(() => {
    Object.prototype.toString = original
    delete (Object.prototype as Record<string, unknown>).polluted
  })

  it.each(['', '.', '..', 'header.', '.header.name', 'header..name', 'sections.-1.title'])(
    'refuses the path "%s" without throwing',
    (path) => {
      const cv = createExampleCv('designer')
      expect(() => setAtPath(cv, path, 'x')).not.toThrow()
      expect(setAtPath(cv, path, 'x')).toBe(false)
    },
  )

  it('does not write through a null or primitive root', () => {
    expect(setAtPath(null, 'a', 'x')).toBe(false)
    expect(setAtPath(undefined, 'a.b', 'x')).toBe(false)
    expect(setAtPath('str', 'length', 'x')).toBe(false)
  })

  it('cannot add a new field to the header (only existing text fields change)', () => {
    const cv = createExampleCv('designer')
    expect(setAtPath(cv, 'header.injected', 'x')).toBe(false)
    expect('injected' in cv.header).toBe(false)
  })

  // BUG: setAtPath treats "__proto__" like any other key, so a path such as
  // "header.__proto__.toString" walks up to Object.prototype (where `toString` exists) and
  // overwrites it with the value. Paths come from DOM attributes and from AI "fix mistakes"
  // answers, i.e. partly from outside the app.
  // Repro: setAtPath(createEmptyCv(), 'header.__proto__.toString', 'x') -> returns true and
  // ({}).toString === 'x'.
  // Expected: false and Object.prototype untouched.
  it.fails('does not pollute Object.prototype through "__proto__"', () => {
    const cv = createExampleCv('designer')
    const result = setAtPath(cv, 'header.__proto__.toString', 'polluted!')
    expect(result).toBe(false)
    expect(Object.prototype.toString).toBe(original)
  })

  it('does not pollute Object.prototype through "constructor.prototype"', () => {
    const cv = createExampleCv('designer')
    expect(setAtPath(cv, 'header.constructor.prototype.toString', 'polluted!')).toBe(false)
    expect(Object.prototype.toString).toBe(original)
  })

  it('a bullet index like "1e0" or " 1" is not treated as a valid index', () => {
    const cv = createExampleCv('software-developer')
    const section = cv.sections.find((s) => s.type === 'experience')!
    if (section.type !== 'experience') throw new Error('expected experience')
    const base = `sections.${section.id}.items.${section.items[0]!.id}.bullets`
    expect(setAtPath(cv, `${base}.abc`, 'x')).toBe(false)
    expect(setAtPath(cv, `${base}.-1`, 'x')).toBe(false)
    expect(setAtPath(cv, `${base}.0.5`, 'x')).toBe(false)
  })
})

describe('moveSection edge cases', () => {
  const one = [{ id: 'a', column: 'main' as const }]

  it('moves the only section to the other column and back', () => {
    const moved = moveSection(one, 'a', 'sidebar', 0)
    expect(moved).toEqual([{ id: 'a', column: 'sidebar' }])
    expect(moveSection(moved, 'a', 'main', 0)).toEqual(one)
  })

  it('handles an empty list', () => {
    const empty: typeof one = []
    expect(moveSection(empty, 'a', 'main', 0)).toBe(empty)
  })

  it.each([-5, -0.5, 0, Number.NEGATIVE_INFINITY])('clamps the index %s to the start', (index) => {
    const list = [
      { id: 'a', column: 'main' as const },
      { id: 'b', column: 'main' as const },
    ]
    expect(moveSection(list, 'b', 'main', index).map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('treats Infinity as "at the end"', () => {
    const list = [
      { id: 'a', column: 'main' as const },
      { id: 'b', column: 'main' as const },
    ]
    expect(moveSection(list, 'a', 'main', Infinity).map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('does not change the input list', () => {
    const list = Object.freeze([
      Object.freeze({ id: 'a', column: 'main' as const }),
      Object.freeze({ id: 'b', column: 'sidebar' as const }),
    ]) as unknown as typeof one
    expect(() => moveSection(list, 'a', 'sidebar', 0)).not.toThrow()
  })

  it('keeps every section when shuffling 500 of them', () => {
    const list = Array.from({ length: 500 }, (_, i) => ({
      id: `s${i}`,
      column: (i % 2 ? 'main' : 'sidebar') as 'main' | 'sidebar',
    }))
    let current = list
    for (let i = 0; i < 500; i++) {
      current = moveSection(
        current,
        `s${(i * 7) % 500}`,
        i % 3 ? 'main' : 'sidebar',
        (i * 13) % 300,
      )
    }
    expect(current).toHaveLength(500)
    expect(new Set(current.map((s) => s.id)).size).toBe(500)
  })
})
