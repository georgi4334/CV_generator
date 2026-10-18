import { useTranslation } from 'react-i18next'

/** Id of the element the skip link jumps to: put it on the page's `<main>`. */
export const MAIN_CONTENT_ID = 'main-content'

/**
 * The first thing a keyboard user reaches: a link past the header and tabs
 * to the page's content. Hidden until it has focus.
 */
export function SkipLink() {
  const { t } = useTranslation()
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={(event) => {
        // Move focus too (a hash link alone only scrolls in a single-page app).
        const main = document.getElementById(MAIN_CONTENT_ID)
        if (!main) return
        event.preventDefault()
        // Focusing it also scrolls it into view.
        main.focus()
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-toast) focus:rounded-pill focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-fg-strong focus:shadow-overlay"
    >
      {t('nav.skipToContent')}
    </a>
  )
}
