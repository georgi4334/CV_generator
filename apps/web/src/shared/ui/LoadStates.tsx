import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { ApiRequestError } from '@/shared/api/client'
import { errorMessage } from '@/shared/api/errorMessage'

export function PageLoading({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 bg-muted text-fg-soft">
      <LoaderCircle className="size-5 animate-spin" /> {label ?? t('common.loading')}
    </div>
  )
}

export function LoadError({ error, onRetry }: { error: ApiRequestError; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted px-4 text-center text-fg">
      <h1 className="text-xl font-semibold">{t('nav.load.failedTitle')}</h1>
      <p className="max-w-md text-sm text-fg-muted">{errorMessage(error)}</p>
      <div className="flex gap-3">
        <button type="button" onClick={onRetry} className="btn btn-primary">
          {t('common.tryAgain')}
        </button>
        <Link
          to="/documents"
          className="rounded-control border border-line-strong px-4 py-2 text-sm"
        >
          {t('nav.load.backToDocuments')}
        </Link>
      </div>
    </div>
  )
}
