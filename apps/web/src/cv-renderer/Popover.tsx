import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

interface PopoverProps {
  anchor: RefObject<HTMLElement | null>
  onClose: () => void
  label: string
  children: ReactNode
}

/** Just below the anchor, kept inside the window. */
function popoverPosition(anchor: HTMLElement | null) {
  const rect = anchor?.getBoundingClientRect()
  if (!rect) return { top: 0, left: 0 }
  return { top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)) }
}

/**
 * A small floating panel under an element of the page. Rendered in a portal
 * because the CV page clips its overflow. Closes on Escape, outside click or scroll.
 */
export function Popover({ anchor, onClose, label, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!ref.current?.contains(target) && !anchor.current?.contains(target)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onScroll = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [anchor, onClose])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="fixed z-50 w-72 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      style={popoverPosition(anchor.current)}
    >
      {children}
    </div>,
    document.body,
  )
}
