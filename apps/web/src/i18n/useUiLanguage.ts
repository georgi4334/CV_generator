import { useTranslation } from 'react-i18next'
import { isUiLanguage, UI_LOCALES, type UiLanguage } from './languages'

/** The current interface language; components using it re-render when it changes. */
export function useUiLanguage(): UiLanguage {
  const { i18n } = useTranslation()
  return isUiLanguage(i18n.language) ? i18n.language : 'en'
}

/** The locale for dates and numbers in the current interface language. */
export function useLocale(): string {
  return UI_LOCALES[useUiLanguage()]
}
