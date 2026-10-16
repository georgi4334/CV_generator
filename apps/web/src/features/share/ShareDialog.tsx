import type { DocumentType } from '@cv/shared'
import { Check, Copy, ExternalLink, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Modal } from '../../components/Modal'
import { primaryButton, secondaryButton } from '../../components/PageHeader'
import { toApiRequestError } from '../../lib/api'
import { useDocumentShare, useUpdateDocumentShare } from '../../lib/shareQueries'
import { shareUrl } from './shareUrl'

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
          Share “{title}”
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="size-4" />
        </button>
      </div>

      {share.isPending ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <span>
              <span id={switchId} className="block text-sm font-medium">
                Share a read-only link
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                Anyone with the link can view and download it, without an account.
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
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                active ? 'bg-teal-700' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
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
                  aria-label="Share link"
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <button type="button" onClick={() => void copy()} className={secondaryButton}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline dark:text-teal-300"
                >
                  <ExternalLink className="size-4" /> Open link
                </a>
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={() => {
                    setCopied(false)
                    update.mutate('reset')
                  }}
                  className="text-slate-600 hover:underline disabled:opacity-60 dark:text-slate-300"
                >
                  Replace link
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The link always shows your latest saved changes, including your contact details.
                Replace link gives it a new address; the old one stops working.
              </p>
            </div>
          )}
          {!active && link && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              The link is turned off and shows nothing. Turning it on again brings back the same
              address.
            </p>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {toApiRequestError(error).message}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className={primaryButton}>
          Done
        </button>
      </div>
    </Modal>
  )
}
