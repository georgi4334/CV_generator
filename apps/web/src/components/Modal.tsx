import { useEffect, useRef, type ReactNode } from 'react'

const VARIANTS = {
  center: 'm-auto w-full rounded-xl border p-5',
  /** Full height, sliding in from the right edge (e.g. the job details). */
  drawer: 'm-0 ml-auto h-dvh max-h-none w-full max-w-lg border-l p-0',
}

/** A modal `<dialog>`: Escape and the backdrop's Cancel call `onClose`. */
export function Modal({
  labelledBy,
  onClose,
  variant = 'center',
  className = '',
  children,
}: {
  /** Id of the dialog's heading. */
  labelledBy: string
  onClose: () => void
  variant?: keyof typeof VARIANTS
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
      className={`${VARIANTS[variant]} border-slate-200 bg-white text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${className}`}
    >
      {children}
    </dialog>
  )
}
