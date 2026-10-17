import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from '@/shared/stores/theme'
import { THEME_MODES } from './themeModes'

/**
 * Theme picker for headers: a dropdown with System, Light and Dark, each with
 * its icon. `compact` shows only the icon of the current theme where space is short.
 */
export function ThemeSelect({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const current = THEME_MODES.find((m) => m.mode === mode) ?? THEME_MODES[0]!
  const label = `${t('common.theme.label')}: ${t(`common.theme.${mode}`)}`

  useEffect(() => {
    if (!open) return
    // Start on the chosen theme, so Enter keeps it and the arrows move from there.
    menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
      root.current?.querySelector('button')?.focus()
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])]
    const at = items.indexOf(document.activeElement as HTMLElement)
    const step = e.key === 'ArrowDown' ? 1 : -1
    items[(at + step + items.length) % items.length]?.focus()
  }

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-pill border border-transparent px-2.5 py-1.5 text-sm text-fg-soft transition-[background-color,box-shadow] hover:bg-glass-hover hover:shadow-btn-glass focus-visible:border-line-strong"
      >
        <current.icon className="size-4 text-fg-muted" aria-hidden />
        {!compact && <span>{t(`common.theme.${mode}`)}</span>}
        <ChevronDown className="size-3.5 text-fg-muted" aria-hidden />
      </button>
      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label={t('common.theme.label')}
          className="glass-menu absolute right-0 z-(--z-dropdown) mt-1 w-menu"
        >
          {THEME_MODES.map(({ mode: option, icon: Icon }) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === mode}
              onClick={() => {
                setMode(option)
                setOpen(false)
              }}
              className="menu-item gap-3"
            >
              <Icon className="size-4 text-fg-muted" aria-hidden />
              <span className="flex-1">{t(`common.theme.${option}`)}</span>
              {option === mode && <Check className="size-4 text-brand-fg" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
