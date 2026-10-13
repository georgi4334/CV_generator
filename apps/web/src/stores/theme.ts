import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const THEME_STORAGE_KEY = 'cv-theme'

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    { name: THEME_STORAGE_KEY, storage: createJSONStorage(() => localStorage) },
  ),
)

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)')

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return darkQuery()?.matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', resolveTheme(mode) === 'dark')
}

/** Keeps the `dark` class on <html> in sync with the chosen mode and the OS setting. */
export function initTheme() {
  applyTheme(useThemeStore.getState().mode)
  useThemeStore.subscribe((state) => applyTheme(state.mode))
  darkQuery()?.addEventListener('change', () => applyTheme(useThemeStore.getState().mode))
}
