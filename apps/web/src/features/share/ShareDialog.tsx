import type { DocumentType } from '@cv/shared'
import { Check, Copy, ExternalLink, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/shared/ui/Modal'
import { primaryButton, secondaryButton } from '@/shared/ui/PageHeader'
import { errorMessage } from '@/shared/api/errorMessage'
import { useDocumentShare, useUpdateDocumentShare } from './queries'
import { shareUrl } from './shareUrl'
import { LoadingRegion, Skeleton } from '@/shared/ui/Skeleton'

/** Turn a CV's public read-only link on or off, copy it, or replace it. */
export function ShareDialog({
  type = 'cv',
  id,
  title,
  onClose,
}: {
  type?: DocumentType
  id: string
  title: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const headingId = useId()
  const switchId = useId()
  const share = useDocumentShare(type, id)
  const update = useUpdateDocumentShare(type, id)
  const input = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  const link = share.data?.link ?? null
  const active = link?.isActive ?? false
  const url = link ? shareUrl(link.slug) : ''
  const error = update.error ?? share.error

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // No clipboard access (e.g. not HTTPS): select the text so Ctrl+C works.
      input.current?.select()
    }
  }

  return (
    <Modal labelledBy={headingId} onClose={onClose} className="max-w-md">
      <div className="flex items-start justify-between gap-4">
        <h2 id={headingId} className="text-lg font-semibold break-words">
          {t('share.dialog.heading', { title })}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="rounded-tight p-1 text-fg-muted hover:bg-muted "
        >
          <X className="size-4" />
        </button>
      </div>

      {share.isPending ? (
        <LoadingRegion className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-control border border-line p-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-6 w-11 rounded-pill" />
          </div>
          <Skeleton className="h-9 w-full rounded-control" />
        </LoadingRegion>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-control border border-line p-3 ">
            <span>
              <span id={switchId} className="block text-sm font-medium">
                {t('share.dialog.switchLabel')}
              </span>
              <span className="mt-0.5 block text-xs text-fg-muted ">
                {t('share.dialog.switchHint')}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-labelledby={switchId}
              disabled={update.isPending || share.isError}
              onClick={() => {
                setCopied(false)
                update.mutate({ isActive: !active })
              }}
              className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors disabled:opacity-60 ${
                active ? 'bg-brand' : 'bg-line-strong'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-5 rounded-pill bg-surface shadow transition-transform ${
                  active ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {active && link && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <input
                  ref={input}
                  aria-label={t('share.dialog.linkLabel')}
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-control border border-line-strong bg-page px-3 py-2 text-sm "
                />
                <button type="button" onClick={() => void copy()} className={secondaryButton}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? t('share.dialog.copied') : t('share.dialog.copy')}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand-fg hover:underline "
                >
                  <ExternalLink className="size-4" /> {t('share.dialog.open')}
                </a>
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={() => {
                    setCopied(false)
                    update.mutate('reset')
                  }}
                  className="text-fg-soft hover:underline disabled:opacity-60 "
                >
                  {t('share.dialog.replace')}
                </button>
              </div>
              <p className="text-xs text-fg-muted ">{t('share.dialog.activeNote')}</p>
            </div>
          )}
          {!active && link && (
            <p className="mt-3 text-xs text-fg-muted ">{t('share.dialog.inactiveNote')}</p>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-fg ">
          {errorMessage(error)}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className={primaryButton}>
          {t('share.dialog.done')}
        </button>
      </div>
    </Modal>
  )
}
