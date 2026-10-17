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
    <label className="relative flex items-center text-fg-muted">
      <Languages className="pointer-events-none absolute left-2 size-4" aria-hidden />
      <select
        aria-label={t('common.interfaceLanguage')}
        title={t('common.interfaceLanguage')}
        value={language}
        onChange={(e) => void setLanguage(e.target.value as UiLanguage)}
        className="cursor-pointer appearance-none rounded-pill border border-transparent bg-transparent py-1.5 pr-2.5 pl-7 text-sm text-fg-soft transition-[background-color,box-shadow] hover:bg-glass-hover hover:shadow-btn-glass focus-visible:border-line-strong"
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
