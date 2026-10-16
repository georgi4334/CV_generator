import { useEffect, useRef, type ReactNode } from 'react'

const VARIANTS = {
  /** Centered; on phones it keeps the page gutter on both sides. */
  center: 'm-auto w-[calc(100%-2*var(--spacing-gutter))] rounded-card border p-card',
  /** Full height at the right edge (e.g. the job details); the whole screen on phones. */
  drawer: 'm-0 ml-auto h-dvh max-h-none w-full max-w-full p-0 md:max-w-drawer md:border-l',
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
      className={`${VARIANTS[variant]} border-line bg-surface text-fg shadow-overlay backdrop:bg-backdrop ${className}`}
    >
      {children}
    </dialog>
  )
}
