import { createExampleCv } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { setAtPath } from './documentPath'

describe('setAtPath', () => {
  it('sets header fields', () => {
    const cv = createExampleCv('designer')
    expect(setAtPath(cv, 'header.name', 'Ana')).toBe(true)
    expect(cv.header.name).toBe('Ana')
  })

  it('finds sections and items by id', () => {
    const cv = createExampleCv('software-developer')
    const section = cv.sections.find((s) => s.type === 'experience')!
    if (section.type !== 'experience') throw new Error('expected experience')
    const item = section.items[1]!
    expect(setAtPath(cv, `sections.${section.id}.items.${item.id}.company`, 'Acme')).toBe(true)
    expect(item.company).toBe('Acme')
    expect(setAtPath(cv, `sections.${section.id}.items.${item.id}.bullets.0`, 'New bullet')).toBe(
      true,
    )
    expect(item.bullets[0]).toBe('New bullet')
  })

  it('refuses unknown paths instead of creating them', () => {
    const cv = createExampleCv('software-developer')
    expect(setAtPath(cv, 'sections.nope.text', 'x')).toBe(false)
    expect(setAtPath(cv, 'header.unknown', 'x')).toBe(false)
    expect(setAtPath(cv, `sections.${cv.sections[1]!.id}.items.x.title`, 'x')).toBe(false)
  })

  it('refuses a bullet index out of range', () => {
    const cv = createExampleCv('software-developer')
    const section = cv.sections.find((s) => s.type === 'experience')!
    if (section.type !== 'experience') throw new Error('expected experience')
    const item = section.items[0]!
    expect(setAtPath(cv, `sections.${section.id}.items.${item.id}.bullets.99`, 'x')).toBe(false)
  })
})
