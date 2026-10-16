import { i18n } from '../i18n'
import { isUiLanguage, UI_LOCALES } from '../i18n/languages'

const formats = new Map<string, Intl.DateTimeFormat>()

/**
 * "13 Oct 2026" (or "13. Okt. 2026", "13.10.2026 г." …) in the interface
 * language. Components calling it use `useTranslation`, so they re-render
 * when the language changes.
 */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  const locale = UI_LOCALES[isUiLanguage(i18n.language) ? i18n.language : 'en']
  let format = formats.get(locale)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    formats.set(locale, format)
  }
  return format.format(new Date(value))
}

/** Today in the user's time zone, as an ISO date ("2026-10-15"). */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}
