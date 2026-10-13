import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveTheme } from './theme'

function mockSystemDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: dark && query.includes('dark') }))
}

afterEach(() => vi.unstubAllGlobals())

describe('resolveTheme', () => {
  it('uses an explicit choice', () => {
    mockSystemDark(true)
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('follows the system setting in "system" mode', () => {
    mockSystemDark(true)
    expect(resolveTheme('system')).toBe('dark')
    mockSystemDark(false)
    expect(resolveTheme('system')).toBe('light')
  })
})
