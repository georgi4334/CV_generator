import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'
import { reportError } from '@/shared/lib/monitoring'

/** Shown instead of a blank screen when a page crashes. */
export function ErrorPage() {
  const { t } = useTranslation()
  const error = useRouteError()
  useEffect(() => {
    console.error(error)
    reportError(error)
  }, [error])
  // A new version was deployed and an old page chunk is gone: reloading fixes it.
  const outdated =
    error instanceof Error &&
    /dynamically imported module|Importing a module script/i.test(error.message)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page px-4 text-center text-fg">
      <h1 className="text-2xl font-semibold">
        {outdated ? t('nav.error.outdatedTitle') : t('nav.error.title')}
      </h1>
      <p className="max-w-md text-sm text-fg-muted">
        {outdated ? t('nav.error.outdatedText') : t('nav.error.text')}
      </p>
      <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
        {t('nav.error.reload')}
      </button>
    </div>
  )
}
