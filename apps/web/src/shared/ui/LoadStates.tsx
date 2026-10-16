import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { ApiRequestError } from '@/shared/api/client'
import { errorMessage } from '@/shared/api/errorMessage'
import { LoadingRegion, PaperSkeleton, Skeleton, SkeletonText } from '@/shared/ui/Skeleton'

/** While a page loads: the outline of the app (header, title, cards), shimmering. */
export function PageLoading({ label }: { label?: string }) {
  return (
    <LoadingRegion label={label} className="flex min-h-dvh flex-col bg-page">
      <div className="border-b border-line bg-surface">
        <div className="page-container flex h-14 items-center gap-4">
          <Skeleton className="size-7" />
          <Skeleton className="h-4 w-24 max-sm:hidden" />
          <div className="ml-auto flex gap-3">
            <Skeleton className="size-8 rounded-pill" />
            <Skeleton className="size-8 rounded-pill" />
          </div>
        </div>
      </div>
      <div className="page-container space-y-section py-section md:py-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="grid-cards">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card space-y-4 p-card">
              <Skeleton className="h-5 w-1/2" />
              <SkeletonText lines={3} />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  )
}

/** While a CV or letter loads: the editor's top bar and a blank page. */
export function EditorLoading({ label }: { label?: string }) {
  return (
    <LoadingRegion label={label} className="flex h-dvh flex-col bg-muted">
      <div className="flex h-14 items-center gap-4 border-b border-line bg-surface px-gutter">
        <Skeleton className="size-6" />
        <Skeleton className="h-4 w-40" />
        <div className="ml-auto flex gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
        </div>
      </div>
      <div className="flex flex-1 justify-center overflow-hidden px-gutter py-section md:py-8">
        <PaperSkeleton />
      </div>
    </LoadingRegion>
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
