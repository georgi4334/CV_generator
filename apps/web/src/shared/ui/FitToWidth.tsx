import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Shows content of a fixed `width` (e.g. CV pages) at full size when it fits,
 * and scaled down to the available width on narrow screens.
 */
export function FitToWidth({ width, children }: { width: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<{ scale: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const update = () => {
      if (!outer.current || !inner.current) return
      const scale = Math.min(1, outer.current.clientWidth / width) || 1
      const height = Math.ceil(inner.current.offsetHeight * scale)
      setFit((prev) => (prev?.scale === scale && prev.height === height ? prev : { scale, height }))
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(outer.current!)
    observer.observe(inner.current!)
    return () => observer.disconnect()
  }, [width])

  const scaled = fit !== null && fit.scale < 1
  return (
    <div ref={outer} className="w-full" style={scaled ? { height: fit.height } : undefined}>
      <div
        ref={inner}
        className={scaled ? undefined : 'mx-auto'}
        style={{
          width,
          ...(scaled && { transform: `scale(${fit.scale})`, transformOrigin: 'top left' }),
        }}
      >
        {children}
      </div>
    </div>
  )
}
