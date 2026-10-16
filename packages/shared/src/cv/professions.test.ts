import { describe, expect, it } from 'vitest'
import { TEMPLATE_IDS } from './design'
import { isProfessionId, PROFESSION_IDS, PROFESSIONS } from './professions'

describe('professions', () => {
  it('recognizes the offered professions only', () => {
    for (const id of PROFESSION_IDS) expect(isProfessionId(id)).toBe(true)
    for (const value of ['other', 'astronaut', '', null, undefined, 42]) {
      expect(isProfessionId(value)).toBe(false)
    }
  })

  it.each(PROFESSION_IDS)('%s recommends 3 different, existing templates', (id) => {
    const { recommendedTemplates, name, description } = PROFESSIONS[id]
    expect(new Set(recommendedTemplates).size).toBe(3)
    for (const t of recommendedTemplates) expect(TEMPLATE_IDS).toContain(t)
    expect(name && description).toBeTruthy()
  })
})
