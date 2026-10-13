import type { HealthResponse } from '@cv/shared'

interface ApiStatusProps {
  isLoading: boolean
  isError: boolean
  data?: HealthResponse
}

export function ApiStatus({ isLoading, isError, data }: ApiStatusProps) {
  let label = 'Checking API…'
  let color = 'bg-slate-400'

  if (isError) {
    label = 'API unreachable'
    color = 'bg-red-500'
  } else if (data) {
    label = data.database === 'up' ? 'API and database online' : 'API online, database down'
    color = data.database === 'up' ? 'bg-emerald-500' : 'bg-amber-500'
  } else if (!isLoading) {
    label = 'Unknown'
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
      <span className={`size-2.5 rounded-full ${color}`} aria-hidden />
      {label}
    </span>
  )
}
