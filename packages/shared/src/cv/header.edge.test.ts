import { describe, expect, it } from 'vitest'
import {
  CvHeaderSchema,
  HEADER_LIMITS,
  PHOTO_POSITIONS,
  PHOTO_SHAPES,
  fieldMaxLength,
  headerWithinLimits,
} from './header'
import { createEmptyCv } from './factories'

const header = () => createEmptyCv().header

describe('CvHeaderSchema', () => {
  it('fills in the photo shape and position for older CVs', () => {
    const { photoShape: _s, photoPosition: _p, ...old } = header()
    expect(CvHeaderSchema.parse(old)).toMatchObject({
      photoShape: 'circle',
      photoPosition: 'name',
    })
  })

  it.each(PHOTO_SHAPES)('accepts the photo shape %s', (photoShape) => {
    expect(CvHeaderSchema.safeParse({ ...header(), photoShape }).success).toBe(true)
  })

  it.each(PHOTO_POSITIONS)('accepts the photo position %s', (photoPosition) => {
    expect(CvHeaderSchema.safeParse({ ...header(), photoPosition }).success).toBe(true)
  })

  it.each(['triangle', '', null, 5, 'Circle'])('rejects the photo shape %j', (photoShape) => {
    expect(CvHeaderSchema.safeParse({ ...header(), photoShape }).success).toBe(false)
  })

  it.each(['center', '', null, 'top'])('rejects the photo position %j', (photoPosition) => {
    expect(CvHeaderSchema.safeParse({ ...header(), photoPosition }).success).toBe(false)
  })

  it.each(['name', 'headline', 'email', 'phone', 'location', 'link'] as const)(
    'rejects a %s that is not a string',
    (key) => {
      for (const value of [null, undefined, 5, NaN, [], {}, true])
        expect(
          CvHeaderSchema.safeParse({ ...header(), [key]: value }).success,
          `${key}=${String(value)}`,
        ).toBe(false)
    },
  )

  it('needs a photoUrl that is a string or null, not missing', () => {
    const { photoUrl: _u, ...without } = header()
    expect(CvHeaderSchema.safeParse(without).success).toBe(false)
    expect(CvHeaderSchema.safeParse({ ...header(), photoUrl: 5 }).success).toBe(false)
    expect(CvHeaderSchema.safeParse({ ...header(), photoUrl: '/uploads/a.png' }).success).toBe(true)
  })

  it('does not check showPhoto against photoUrl (a photo can be hidden, or switched on without one)', () => {
    expect(CvHeaderSchema.safeParse({ ...header(), showPhoto: true, photoUrl: null }).success).toBe(
      true,
    )
  })

  it('strips unknown keys', () => {
    const parsed = CvHeaderSchema.parse({ ...header(), isAdmin: true })
    expect(parsed).not.toHaveProperty('isAdmin')
  })

  it.each([
    ['unicode letters', 'José Ñandú Çelik'],
    ['right-to-left text', 'محمد علي'],
    ['emoji', '🧑‍💻 Dev'],
    ['zero-width characters', 'Ma​ria‍'],
    ['a NUL character', 'Maria\u0000Petrova'],
    ['only whitespace', '   \t\n '],
    ['markup', '<script>alert(1)</script>'],
  ])('reads a name with %s unchanged (schema does not sanitise)', (_label, name) => {
    expect(CvHeaderSchema.parse({ ...header(), name }).name).toBe(name)
  })
})

describe('header limits at the boundary', () => {
  it.each(Object.entries(HEADER_LIMITS))('%s: max is %i', (key, max) => {
    const at = { header: { ...header(), [key]: 'x'.repeat(max) } }
    const over = { header: { ...header(), [key]: 'x'.repeat(max + 1) } }
    const empty = { header: { ...header(), [key]: '' } }
    expect(headerWithinLimits(at)).toBe(true)
    expect(headerWithinLimits(over)).toBe(false)
    expect(headerWithinLimits(empty)).toBe(true)
  })

  it('counts an emoji as two characters', () => {
    const name = '😀'.repeat(HEADER_LIMITS.name / 2)
    expect(headerWithinLimits({ header: { ...header(), name } })).toBe(true)
    expect(headerWithinLimits({ header: { ...header(), name: name + '😀' } })).toBe(false)
  })

  it('ignores header keys that are missing or not limited', () => {
    expect(headerWithinLimits({ header: {} })).toBe(true)
    expect(headerWithinLimits({ header: { photoUrl: 'x'.repeat(100_000) } })).toBe(true)
  })

  it('does not throw for non-string values in a limited key', () => {
    expect(headerWithinLimits({ header: { name: 12345 } })).toBe(true)
    expect(headerWithinLimits({ header: { name: null } })).toBe(true)
  })
})

describe('fieldMaxLength', () => {
  it.each(Object.entries(HEADER_LIMITS))('knows header.%s', (key, max) => {
    expect(fieldMaxLength(`header.${key}`)).toBe(max)
  })

  it.each(['', 'header', 'header.', 'name', 'sections.header.name', 'Header.name', 'header.NAME'])(
    'has no limit for the path %j',
    (path) => {
      expect(fieldMaxLength(path)).toBeUndefined()
    },
  )

  it('only looks at the first two parts of a path', () => {
    expect(fieldMaxLength('header.name.x.y')).toBe(HEADER_LIMITS.name)
  })

  // BUG: `key in HEADER_LIMITS` also matches inherited properties of Object.prototype, so these
  // paths return a function/object instead of `undefined`.
  it.fails.each([
    'header.toString',
    'header.constructor',
    'header.__proto__',
    'header.hasOwnProperty',
  ])('has no limit for the inherited property path %s', (path) => {
    expect(fieldMaxLength(path)).toBeUndefined()
  })
})
