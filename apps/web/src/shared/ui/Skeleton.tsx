import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Placeholders in the shape of content that is still loading. Colours and the
 * shimmer come from the design tokens (`--theme-skeleton*`, `animate-shimmer`),
 * so they follow the light and dark theme; the shimmer stops for people who
 * prefer reduced motion.
 */
export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={`skeleton ${className}`} style={style} />
}

/**
 * Wraps skeletons: screen readers hear `label` ("Loading your jobs…") once,
 * instead of a list of empty shapes.
 */
export function LoadingRegion({
  label,
  className = '',
  children,
}: {
  label?: string
  className?: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label ?? t('common.loading')}</span>
      {children}
    </div>
  )
}

/** Lines of text; the last one is shorter, like the end of a paragraph. */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

/** Rows of a list: an icon, a title and a detail line (documents, versions, jobs on phones). */
export function ListSkeleton({
  rows = 3,
  label,
  icon = true,
  className = '',
}: {
  rows?: number
  label?: string
  icon?: boolean
  className?: string
}) {
  return (
    <LoadingRegion label={label} className={className}>
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3">
            {icon && <Skeleton className="h-12 w-9 shrink-0" />}
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </LoadingRegion>
  )
}

/** A blank page in the shape of the CV or letter being loaded. */
export function PaperSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`aspect-paper w-full max-w-paper space-y-6 rounded-tight bg-surface p-card shadow-paper md:p-gutter-wide ${className}`}
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-4 w-1/4" />
          <SkeletonText lines={3} />
        </div>
      ))}
    </div>
  )
}
