import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { ApiRequestError } from '../../lib/api'
import { errorMessage } from '../../lib/errorMessage'

export function PageLoading({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
      <LoaderCircle className="size-5 animate-spin" /> {label ?? t('common.loading')}
    </div>
  )
}

export function LoadError({ error, onRetry }: { error: ApiRequestError; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 px-4 text-center text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="text-xl font-semibold">{t('nav.load.failedTitle')}</h1>
      <p className="max-w-md text-sm text-slate-500">{errorMessage(error)}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
        >
          {t('common.tryAgain')}
        </button>
        <Link
          to="/documents"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
        >
          {t('nav.load.backToDocuments')}
        </Link>
      </div>
    </div>
  )
}
