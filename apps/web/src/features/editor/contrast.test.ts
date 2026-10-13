import { describe, expect, it } from 'vitest'
import { contrastWithWhite } from './contrast'

describe('contrastWithWhite', () => {
  it('matches known WCAG ratios', () => {
    expect(contrastWithWhite('#000000')).toBeCloseTo(21, 0)
    expect(contrastWithWhite('#ffffff')).toBeCloseTo(1, 5)
    expect(contrastWithWhite('#00585a')).toBeGreaterThan(7)
    expect(contrastWithWhite('#facc15')).toBeLessThan(2)
  })
})
