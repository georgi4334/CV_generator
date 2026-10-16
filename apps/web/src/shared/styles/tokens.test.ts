// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BREAKPOINTS } from '@/shared/lib/useBreakpoint'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')
const token = (name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim()

describe('design tokens', () => {
  it('TypeScript breakpoints match the CSS tokens', () => {
    for (const [name, width] of Object.entries(BREAKPOINTS)) {
      expect(token(`breakpoint-${name}`), name).toBe(width)
    }
  })

  it('every theme color is defined for light and dark mode', () => {
    const block = (selector: string) => {
      const start = css.indexOf(`${selector} {`)
      return css.slice(start, css.indexOf('}', start))
    }
    const names = (text: string) => [...text.matchAll(/--theme-([\w-]+):/g)].map((m) => m[1]).sort()
    expect(names(block('.dark'))).toEqual(names(block(':root')))
  })
})
