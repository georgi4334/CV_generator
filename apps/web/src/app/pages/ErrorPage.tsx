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
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="text-2xl font-semibold">
        {outdated ? t('nav.error.outdatedTitle') : t('nav.error.title')}
      </h1>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
        {outdated ? t('nav.error.outdatedText') : t('nav.error.text')}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
      >
        {t('nav.error.reload')}
      </button>
    </div>
  )
}
