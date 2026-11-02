import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ThemeModule = typeof import('./theme')

/** A fresh copy of the module, so persisted state is read again from localStorage. */
async function freshTheme(): Promise<ThemeModule> {
  vi.resetModules()
  return import('./theme')
}

interface FakeQuery {
  matches: boolean
  addEventListener: ReturnType<typeof vi.fn>
}

function stubSystem(dark: boolean) {
  const query: FakeQuery = { matches: dark, addEventListener: vi.fn() }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  )
  return query
}

const isDark = () => document.documentElement.classList.contains('dark')

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('theme store', () => {
  it('starts in "system" mode', async () => {
    const { useThemeStore } = await freshTheme()
    expect(useThemeStore.getState().mode).toBe('system')
  })

  it('remembers the chosen mode across reloads', async () => {
    const first = await freshTheme()
    first.useThemeStore.getState().setMode('dark')
    const second = await freshTheme()
    expect(second.useThemeStore.getState().mode).toBe('dark')
  })

  it.each(['not json', '{"state":', 'null', '[]', '{"state":{"mode":42}}'])(
    'survives a corrupted saved value (%s) without throwing',
    async (saved) => {
      localStorage.setItem('cv-theme', saved)
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const { useThemeStore, resolveTheme } = await freshTheme()
      expect(() => resolveTheme(useThemeStore.getState().mode)).not.toThrow()
      expect(['light', 'dark', 'system', 42]).toContain(useThemeStore.getState().mode)
    },
  )

  // BUG: a saved mode that is not one of system/light/dark (an old build, or hand-edited storage)
  // is loaded as is. resolveTheme('purple') returns 'purple' (typed 'light' | 'dark') and
  // applyTheme then decides by `=== 'dark'`, so the page silently becomes light, and the theme
  // picker shows no option selected.
  // Repro: localStorage['cv-theme'] = '{"state":{"mode":"purple"},"version":0}'; reload ->
  // useThemeStore.getState().mode === 'purple'. Expected: fall back to 'system'.
  it.fails('falls back to "system" when the saved mode is unknown', async () => {
    localStorage.setItem('cv-theme', JSON.stringify({ state: { mode: 'purple' }, version: 0 }))
    const { useThemeStore } = await freshTheme()
    expect(useThemeStore.getState().mode).toBe('system')
  })

  // BUG: zustand's persist middleware calls localStorage.setItem synchronously inside setMode(),
  // and the storage is not wrapped in a try/catch (unlike the language choice in i18n/index.ts).
  // When storage is full or blocked (Safari private mode, "block all cookies"), choosing a
  // theme throws a QuotaExceededError / SecurityError out of the click handler, which ends up as
  // an uncaught error in monitoring even though the theme itself switches.
  // Repro: make Storage.prototype.setItem throw; useThemeStore.getState().setMode('dark') throws.
  it.fails('setMode does not throw when localStorage refuses to save', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const { useThemeStore } = await freshTheme()
    expect(() => useThemeStore.getState().setMode('dark')).not.toThrow()
    expect(useThemeStore.getState().mode).toBe('dark')
  })

  it('still switches the theme in memory when localStorage refuses to save', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const { useThemeStore } = await freshTheme()
    try {
      useThemeStore.getState().setMode('dark')
    } catch {
      // see the BUG above
    }
    expect(useThemeStore.getState().mode).toBe('dark')
  })
})

describe('resolveTheme without matchMedia', () => {
  it('uses light for "system" when the browser cannot tell', async () => {
    vi.stubGlobal('matchMedia', undefined)
    const { resolveTheme } = await freshTheme()
    expect(resolveTheme('system')).toBe('light')
  })

  it('still honours explicit choices', async () => {
    vi.stubGlobal('matchMedia', undefined)
    const { resolveTheme } = await freshTheme()
    expect(resolveTheme('dark')).toBe('dark')
  })
})

describe('initTheme', () => {
  it('puts the dark class on <html> for a dark system', async () => {
    stubSystem(true)
    const { initTheme } = await freshTheme()
    initTheme()
    expect(isDark()).toBe(true)
  })

  it('follows the store when the user picks another mode, in both directions', async () => {
    stubSystem(false)
    const { initTheme, useThemeStore } = await freshTheme()
    initTheme()
    expect(isDark()).toBe(false)
    useThemeStore.getState().setMode('dark')
    expect(isDark()).toBe(true)
    useThemeStore.getState().setMode('light')
    expect(isDark()).toBe(false)
  })

  it('follows the operating system while in "system" mode, but not after an explicit choice', async () => {
    const query = stubSystem(false)
    const { initTheme, useThemeStore } = await freshTheme()
    initTheme()
    const onChange = query.addEventListener.mock.calls.find(
      (c) => c[0] === 'change',
    )![1] as () => void
    query.matches = true
    onChange()
    expect(isDark()).toBe(true)
    useThemeStore.getState().setMode('light')
    query.matches = true
    onChange()
    expect(isDark()).toBe(false)
  })

  it('toggling the mode 1000 times ends in the right state', async () => {
    stubSystem(false)
    const { initTheme, useThemeStore } = await freshTheme()
    initTheme()
    for (let i = 0; i < 1000; i++) useThemeStore.getState().setMode(i % 2 ? 'light' : 'dark')
    expect(isDark()).toBe(false)
  })

  it('does not fail without matchMedia (old browser, test environment)', async () => {
    vi.stubGlobal('matchMedia', undefined)
    const { initTheme } = await freshTheme()
    expect(() => initTheme()).not.toThrow()
    expect(isDark()).toBe(false)
  })
})
