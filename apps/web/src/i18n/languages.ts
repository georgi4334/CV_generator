/** Languages of the app's interface (independent of each CV's own language). */
export const UI_LANGUAGES = ['en', 'bg', 'de'] as const
export type UiLanguage = (typeof UI_LANGUAGES)[number]

/** Each language in its own name, as people look for it in a menu. */
export const UI_LANGUAGE_NAMES: Record<UiLanguage, string> = {
  en: 'English',
  bg: 'Български',
  de: 'Deutsch',
}

/** Locale used for dates and numbers in each interface language. */
export const UI_LOCALES: Record<UiLanguage, string> = {
  en: 'en-GB',
  bg: 'bg-BG',
  de: 'de-DE',
}

export const isUiLanguage = (value: unknown): value is UiLanguage =>
  UI_LANGUAGES.includes(value as UiLanguage)
