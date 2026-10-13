import { Monitor, Moon, Sun } from 'lucide-react'
import { useThemeStore, type ThemeMode } from '../stores/theme'

const NEXT: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<ThemeMode, string> = {
  system: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
}
const ICON = { system: Monitor, light: Sun, dark: Moon }

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const Icon = ICON[mode]

  return (
    <button
      type="button"
      onClick={() => setMode(NEXT[mode])}
      title={`${LABEL[mode]} (click to change)`}
      aria-label={LABEL[mode]}
      className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      <Icon className="size-5" />
    </button>
  )
}
