import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import type { ThemeMode } from '@/shared/stores/theme'

/** The themes, in menu order, with their icons. */
export const THEME_MODES: { mode: ThemeMode; icon: LucideIcon }[] = [
  { mode: 'system', icon: Monitor },
  { mode: 'light', icon: Sun },
  { mode: 'dark', icon: Moon },
]
