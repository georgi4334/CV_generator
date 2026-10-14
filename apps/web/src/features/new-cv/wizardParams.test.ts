import { describe, expect, it } from 'vitest'
import { readWizard, wizardParams } from './wizardParams'

const read = (query: string) => readWizard(new URLSearchParams(query))

describe('wizard params', () => {
  it('reads the choices from the URL', () => {
    expect(read('')).toEqual({ profession: null, template: null })
    expect(read('profession=designer')).toEqual({ profession: 'designer', template: null })
    expect(read('profession=other&template=timeline')).toEqual({
      profession: 'other',
      template: 'timeline',
    })
  })

  it('ignores unknown values and a template without a profession', () => {
    expect(read('profession=astronaut&template=timeline')).toEqual({
      profession: null,
      template: null,
    })
    expect(read('profession=designer&template=fancy')).toEqual({
      profession: 'designer',
      template: null,
    })
  })

  it('writes the choices back', () => {
    expect(wizardParams({}).toString()).toBe('')
    expect(wizardParams({ profession: 'healthcare', template: 'compact' }).toString()).toBe(
      'profession=healthcare&template=compact',
    )
    expect(wizardParams({ template: 'compact' }).toString()).toBe('')
  })
})
