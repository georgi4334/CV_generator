import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

interface PopoverProps {
  anchor: RefObject<HTMLElement | null>
  onClose: () => void
  label: string
  children: ReactNode
}

/** Space kept between the popover and its anchor or the window edge. */
const GAP = 6
const EDGE = 8

/**
 * Below the anchor, or above it when there is no room below, always inside the
 * window. Without the popover's size yet (first paint), just below the anchor.
 */
function popoverPosition(
  anchor: HTMLElement | null,
  size: { width: number; height: number } | null,
) {
  const rect = anchor?.getBoundingClientRect()
  if (!rect) return { top: 0, left: 0 }
  const width = size?.width ?? 0
  const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE))
  if (!size) return { top: rect.bottom + GAP, left }
  const below = rect.bottom + GAP
  const above = rect.top - GAP - size.height
  const fitsBelow = below + size.height <= window.innerHeight - EDGE
  const top =
    fitsBelow || above < EDGE ? Math.min(below, window.innerHeight - size.height - EDGE) : above
  return { top: Math.max(EDGE, top), left }
}

/**
 * A small floating panel under an element of the page. Rendered in a portal
 * because the CV page clips its overflow. Closes on Escape, outside click or scroll.
 */
export function Popover({ anchor, onClose, label, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  // Measure once shown (and when the content changes size, e.g. the year grid opens).
  useLayoutEffect(() => {
    const element = ref.current!
    const measure = () => setSize({ width: element.offsetWidth, height: element.offsetHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

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
      className="fixed z-(--z-dropdown) w-72 rounded-control border border-line bg-surface p-3 text-sm text-fg shadow-overlay"
      style={popoverPosition(anchor.current, size)}
    >
      {children}
    </div>,
    document.body,
  )
}
