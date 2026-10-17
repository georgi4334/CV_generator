import { useTranslation } from 'react-i18next'
import { Modal } from './Modal'
import { useModalClose } from './useModalClose'

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
  const { closing, requestClose, closed } = useModalClose(onCancel)
  return (
    <Modal
      labelledBy="confirm-title"
      onClose={closed}
      onCloseRequest={requestClose}
      closing={closing}
      className="max-w-sm"
    >
      <h2 id="confirm-title" className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-sm text-fg-soft">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={requestClose}
          className="rounded-control border border-line-strong px-4 py-2 text-sm"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={onConfirm}
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
