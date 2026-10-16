import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useThemeStore, type ThemeMode } from '@/shared/stores/theme'

const NEXT: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' }
const ICON = { system: Monitor, light: Sun, dark: Moon }

export function ThemeToggle() {
  const { t } = useTranslation()
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const Icon = ICON[mode]
  const label = t(`common.theme.${mode}`)

  return (
    <button
      type="button"
      onClick={() => setMode(NEXT[mode])}
      title={t('common.theme.hint', { mode: label })}
      aria-label={label}
      className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      <Icon className="size-5" />
    </button>
  )
}
