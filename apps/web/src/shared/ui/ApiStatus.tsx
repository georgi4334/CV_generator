import type { HealthResponse } from '@cv/shared'
import { useTranslation } from 'react-i18next'

interface ApiStatusProps {
  isLoading: boolean
  isError: boolean
  data?: HealthResponse
}

export function ApiStatus({ isLoading, isError, data }: ApiStatusProps) {
  const { t } = useTranslation()
  let label = t('nav.api.checking')
  let color = 'bg-fg-faint'

  if (isError) {
    label = t('nav.api.unreachable')
    color = 'bg-danger'
  } else if (data) {
    label = data.database === 'up' ? t('nav.api.online') : t('nav.api.databaseDown')
    color = data.database === 'up' ? 'bg-success' : 'bg-warning'
  } else if (!isLoading) {
    label = t('nav.api.unknown')
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm text-fg-soft">
      <span className={`size-2.5 rounded-pill ${color}`} aria-hidden />
      {label}
    </span>
  )
}
