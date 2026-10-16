import { Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { JOB_STATUS_STYLES } from './badgeStyles'
import { type DocumentType, type JobStatus, type JobType } from '@cv/shared'

const pill = 'pill'

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { t } = useTranslation()
  return (
    <span className={`${pill} ${JOB_STATUS_STYLES[status]}`}>
      {t(`labels.jobStatus.${status}`)}
    </span>
  )
}

export function JobTypeBadge({ type }: { type: JobType | null }) {
  const { t } = useTranslation()
  if (!type) return <span className="text-fg-faint">—</span>
  return (
    <span className={`${pill} border border-line text-fg-soft`}>{t(`labels.jobType.${type}`)}</span>
  )
}

export function DocumentTypeBadge({ type }: { type: DocumentType }) {
  const { t } = useTranslation()
  return type === 'cv' ? (
    <span className={`${pill} bg-brand-soft text-brand-fg-strong`}>
      {t('labels.documentType.cv')}
    </span>
  ) : (
    <span className={`${pill} bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300`}>
      {t('labels.documentType.coverLetter')}
    </span>
  )
}

/** Marks a template that suits the CV's profession. */
export function RecommendedBadge({
  compact = false,
  className = '',
}: {
  /** Smaller, for template thumbnails in the editor panel. */
  compact?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const size = compact ? 'rounded-full px-1.5 py-px text-2xs font-medium' : pill
  return (
    <span className={`${size} bg-warning-soft text-warning-fg shadow-card ${className}`}>
      {t('documents.badges.recommended')}
    </span>
  )
}

/** The document has an active public share link. */
export function SharedBadge() {
  const { t } = useTranslation()
  return (
    <span
      className={`${pill} gap-1 bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300`}
      title={t('documents.badges.sharedHint')}
    >
      <Link2 className="size-3" aria-hidden /> {t('documents.badges.shared')}
    </span>
  )
}
