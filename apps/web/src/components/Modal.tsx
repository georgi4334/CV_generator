import { useEffect, useRef, type ReactNode } from 'react'

/** A modal `<dialog>`: Escape and the backdrop's Cancel call `onClose`. */
export function Modal({
  labelledBy,
  onClose,
  className = '',
  children,
}: {
  /** Id of the dialog's heading. */
  labelledBy: string
  onClose: () => void
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || dialog.open) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => {
      if (typeof dialog?.close === 'function') dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className={`m-auto w-full rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${className}`}
    >
      {children}
    </dialog>
  )
}
