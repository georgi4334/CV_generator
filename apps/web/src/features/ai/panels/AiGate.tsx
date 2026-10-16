import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useAiStatus } from '@/features/ai/queries'
import { errorMessage } from '@/shared/api/errorMessage'
import { LoadingRegion, Skeleton, SkeletonText } from '@/shared/ui/Skeleton'

export const aiButton = 'btn btn-primary'
export const aiSecondary = 'btn btn-secondary btn-sm'
export const aiField = 'input'

/**
 * Where the AI's answer will appear, while it is being written. The busy
 * button already tells screen readers what is happening, so this is visual only.
 */
export function AiResultSkeleton({ blocks = 2 }: { blocks?: number }) {
  return (
    <div aria-hidden className="space-y-3">
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="space-y-3 rounded-control border border-line p-3">
          <Skeleton className="h-4 w-1/3" />
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  )
}

/** Shows the panel only when AI is set up, with today's remaining requests below it. */
export function AiGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const status = useAiStatus()
  if (status.isPending) {
    return (
      <LoadingRegion label={t('ai.gate.checking')} className="space-y-3">
        <SkeletonText lines={2} />
        <Skeleton className="h-24 w-full rounded-control" />
        <Skeleton className="h-9 w-32 rounded-control" />
      </LoadingRegion>
    )
  }
  if (status.isError) {
    return <AiErrorMessage error={status.error} />
  }
  if (!status.data.enabled) {
    return (
      <div className="space-y-2 text-sm text-fg-soft ">
        <p className="font-medium">{t('ai.gate.notSetUp')}</p>
        <p>
          <Trans i18nKey="ai.gate.setupHint" components={{ key: <code />, env: <code /> }} />
        </p>
      </div>
    )
  }
  const { used, limit } = status.data.usage
  const left = Math.max(0, limit - used)
  return (
    <div className="flex flex-col gap-4">
      {children}
      <p className="border-t border-line pt-3 text-xs text-fg-muted ">
        {t('ai.gate.usage', { left, limit, provider: status.data.provider })}
      </p>
    </div>
  )
}

export function AiErrorMessage({ error }: { error: unknown }) {
  return (
    <p role="alert" className="text-sm text-danger-fg ">
      {errorMessage(error)}
    </p>
  )
}

/** "original → replacement", with the change highlighted. */
export function Change({ original, replacement }: { original: string; replacement: string }) {
  return (
    <p className="text-sm break-words">
      <del className="rounded-tight bg-danger-soft px-0.5 text-danger-fg ">{original}</del> →{' '}
      <ins className="rounded-tight bg-success-soft px-0.5 text-success-fg no-underline">
        {replacement}
      </ins>
    </p>
  )
}
