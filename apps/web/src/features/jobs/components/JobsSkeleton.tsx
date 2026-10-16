import { useTranslation } from 'react-i18next'
import { LoadingRegion, Skeleton } from '@/shared/ui/Skeleton'

/** Placeholder rows (or cards on phones) shown while the jobs load. */
const PLACEHOLDER_ROWS = 4
/** Table columns drawn as placeholders: position, company, status, date, location. */
const PLACEHOLDER_COLUMNS = ['w-2/3', 'w-1/2', 'w-20 rounded-pill', 'w-16', 'w-1/2'] as const

/** While the jobs load: the table on wide screens, cards on phones. */
export function JobsSkeleton({ wide }: { wide: boolean }) {
  const { t } = useTranslation()
  const rows = Array.from({ length: PLACEHOLDER_ROWS }, (_, i) => i)
  return (
    <LoadingRegion label={t('jobs.loading')}>
      {wide ? (
        <div className="card overflow-hidden">
          <div className="flex gap-6 border-b border-line px-3 py-3">
            {PLACEHOLDER_COLUMNS.map((_, i) => (
              <Skeleton key={i} className="h-3 flex-1" />
            ))}
          </div>
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row} className="flex items-center gap-6 px-3 py-3">
                {PLACEHOLDER_COLUMNS.map((width, i) => (
                  <div key={i} className="flex-1">
                    <Skeleton className={`h-4 ${width}`} />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row} className="card space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-20 rounded-pill" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </LoadingRegion>
  )
}
