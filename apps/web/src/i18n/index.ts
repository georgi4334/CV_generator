import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { isUiLanguage, UI_LANGUAGES, type UiLanguage } from './languages'
import { en } from './locales/en'
import type { Messages } from './types'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: Messages }
  }
}

const STORAGE_KEY = 'cv-ui-language'

/** Other languages are downloaded only when someone picks them. */
const loaders: Record<Exclude<UiLanguage, 'en'>, () => Promise<Messages>> = {
  bg: () => import('./locales/bg').then((m) => m.bg),
  de: () => import('./locales/de').then((m) => m.de),
}

function storedLanguage(): UiLanguage | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isUiLanguage(value) ? value : null
  } catch {
    return null
  }
}

/** The saved choice, else the browser's preferred languages, else English. */
export function detectLanguage(): UiLanguage {
  const stored = storedLanguage()
  if (stored) return stored
  const preferred =
    typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split('-')[0]
    if (isUiLanguage(base)) return base
  }
  return 'en'
}

/** Switches the interface language in place: no reload, no lost edits. */
export async function setLanguage(language: UiLanguage, { remember = true } = {}) {
  if (language !== 'en' && !i18n.hasResourceBundle(language, 'translation')) {
    i18n.addResourceBundle(language, 'translation', await loaders[language]())
  }
  await i18n.changeLanguage(language)
  if (typeof document !== 'undefined') document.documentElement.lang = language
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // Private mode: the choice lasts for this visit.
    }
  }
}

/** Starts i18n; the chosen language is loaded before the first render (no English flash). */
export async function initI18n(language: UiLanguage = detectLanguage()) {
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: { en: { translation: en } },
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: [...UI_LANGUAGES],
      interpolation: { escapeValue: false },
      initAsync: false,
      returnNull: false,
      // Keep showing the current language while another one downloads.
      react: { useSuspense: false },
    })
  }
  await setLanguage(language, { remember: false })
}

export { i18n }
