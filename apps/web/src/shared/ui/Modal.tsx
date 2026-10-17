import { useEffect, useRef, type ReactNode } from 'react'

const VARIANTS = {
  /** Centered; on phones it keeps the page gutter on both sides. */
  center: 'm-auto w-[calc(100%-2*var(--spacing-gutter))] rounded-card border p-card',
  /** Full height at the right edge (e.g. the job details); the whole screen on phones. */
  drawer: 'm-0 ml-auto h-dvh max-h-none w-full max-w-full p-0 md:max-w-drawer md:border-l',
  /** A narrow panel at the right edge (e.g. the account menu). */
  side: 'm-0 ml-auto h-dvh max-h-none w-full max-w-side-drawer border-l p-0',
}

/** Drawers slide in from the right and back out; dialogs grow in and shrink away. */
const MOTION = {
  center: { enter: 'animate-dialog-in', leave: 'animate-dialog-out' },
  drawer: { enter: 'animate-drawer-in', leave: 'animate-drawer-out' },
  side: { enter: 'animate-drawer-in', leave: 'animate-drawer-out' },
}

/**
 * A modal `<dialog>`. Escape, the backdrop's Cancel and a click on the dimmed
 * area ask to close
 * (`onCloseRequest`, else `onClose`). With `closing` set, it plays its exit
 * animation and then calls `onClose`.
 */
export function Modal({
  labelledBy,
  onClose,
  onCloseRequest,
  closing = false,
  variant = 'center',
  className = '',
  children,
}: {
  /** Id of the dialog's heading. */
  labelledBy: string
  onClose: () => void
  onCloseRequest?: () => void
  closing?: boolean
  variant?: keyof typeof VARIANTS
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // The latest onClose, so the exit below runs once even if the parent passes a new function.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || dialog.open) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => {
      if (typeof dialog?.close === 'function') dialog.close()
    }
  }, [])

  // Once the exit animation (and the backdrop's fade) has played, really close.
  useEffect(() => {
    const dialog = ref.current
    if (!closing || !dialog) return
    const animations = dialog.getAnimations?.({ subtree: true }) ?? []
    void Promise.allSettled(animations.map((a) => a.finished)).then(() => onCloseRef.current())
  }, [closing])

  // A click on the dimmed area around it (pressed and released there) closes it too.
  const pressedOutside = useRef(false)
  const outside = (event: { clientX: number; clientY: number }) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return false
    const { clientX: x, clientY: y } = event
    return x < box.left || x > box.right || y < box.top || y > box.bottom
  }

  const motion = MOTION[variant]
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onPointerDown={(e) => {
        pressedOutside.current = e.target === e.currentTarget && outside(e)
      }}
      onClick={(e) => {
        if (pressedOutside.current && e.target === e.currentTarget && outside(e)) {
          ;(onCloseRequest ?? onClose)()
        }
        pressedOutside.current = false
      }}
      onCancel={(e) => {
        e.preventDefault()
        ;(onCloseRequest ?? onClose)()
      }}
      className={`${VARIANTS[variant]} ${closing ? `${motion.leave} backdrop:animate-fade-out` : `${motion.enter} backdrop:animate-fade-in`} border-line bg-surface text-fg shadow-overlay backdrop:bg-backdrop motion-reduce:animate-none motion-reduce:backdrop:animate-none ${className}`}
    >
      {children}
    </dialog>
  )
}
