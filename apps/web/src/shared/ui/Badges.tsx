import { DoorOpen, FileUser, Link2, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DOCUMENT_TYPE_STYLES, JOB_STATUS_STYLES } from './badgeStyles'
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
  return (
    <span className={`${pill} ${DOCUMENT_TYPE_STYLES[type]}`}>
      {t(`labels.documentType.${type}`)}
    </span>
  )
}

/**
 * A CV is a page with a person on it (teal); a cover letter is an envelope
 * (sky blue); a resignation letter is an open door (amber). Different in shape and colour, so a list can be scanned at a glance.
 */
export function DocumentTypeIcon({
  type,
  className = 'size-4',
}: {
  type: DocumentType
  className?: string
}) {
  const Icon = { cv: FileUser, coverLetter: Mail, resignation: DoorOpen }[type]
  return <Icon aria-hidden className={className} />
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
