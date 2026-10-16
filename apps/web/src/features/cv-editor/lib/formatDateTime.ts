import { i18n } from '@/i18n'
import { isUiLanguage, UI_LOCALES } from '@/i18n/languages'

/** "13 Oct 2026, 14:05" in the interface language (callers use `useTranslation`). */
export function formatDateTime(value: string): string {
  const locale = UI_LOCALES[isUiLanguage(i18n.language) ? i18n.language : 'en']
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}
