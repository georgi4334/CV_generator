import { useTranslation } from 'react-i18next'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** A small modal asking the user to confirm (e.g. before deleting). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  return (
    <Modal labelledBy="confirm-title" onClose={onCancel} className="max-w-sm">
      <h2 id="confirm-title" className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-700 hover:bg-teal-800'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
