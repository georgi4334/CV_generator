import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { setLanguage } from '@/i18n'
import { UI_LANGUAGE_NAMES, UI_LANGUAGES, type UiLanguage } from '@/i18n/languages'
import { useUiLanguage } from '@/i18n/useUiLanguage'

/**
 * Interface language picker for headers. Switching keeps the page and any
 * open document. `compact` shows language codes (EN, BG, DE) where space is short.
 */
export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const language = useUiLanguage()
  return (
    <label className="relative flex items-center text-slate-500 dark:text-slate-400">
      <Languages className="pointer-events-none absolute left-2 size-4" aria-hidden />
      <select
        aria-label={t('common.interfaceLanguage')}
        title={t('common.interfaceLanguage')}
        value={language}
        onChange={(e) => void setLanguage(e.target.value as UiLanguage)}
        className="cursor-pointer appearance-none rounded-md border border-transparent bg-transparent py-1.5 pr-2 pl-7 text-sm text-slate-700 hover:bg-slate-100 focus-visible:border-slate-300 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {UI_LANGUAGES.map((code) => (
          <option key={code} value={code} lang={code}>
            {compact ? code.toUpperCase() : UI_LANGUAGE_NAMES[code]}
          </option>
        ))}
      </select>
    </label>
  )
}
