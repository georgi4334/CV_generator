import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * Content of a fixed `width` (e.g. CV pages) drawn at `scale`, taking up the
 * scaled size in the layout so scrolling and centring work at any zoom. The
 * structure stays the same at every scale, so zooming never remounts the page.
 */
export function ScaledBox({
  width,
  scale,
  style,
  aside,
  children,
}: {
  width: number
  scale: number
  /** Extra style for the box, e.g. a view-transition name. */
  style?: CSSProperties
  /** Shown just left of the box, as tall as it (e.g. the editor's rail, sticky inside). */
  aside?: ReactNode
  children: ReactNode
}) {
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const update = () => inner.current && setHeight(inner.current.offsetHeight)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(inner.current!)
    return () => observer.disconnect()
  }, [])

  const scaled = scale !== 1
  return (
    <div
      className="relative mx-auto"
      style={{
        ...style,
        width: Math.round(width * scale),
        height: scaled && height !== null ? Math.ceil(height * scale) : undefined,
      }}
    >
      <div
        ref={inner}
        style={{
          width,
          transform: scaled ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
      {aside && (
        <div className="absolute top-0 right-full bottom-0 flex flex-col justify-end pr-4">
          {aside}
        </div>
      )}
    </div>
  )
}

/** The largest scale (at most 1) at which `width` fits in `available`. */
export const fitScale = (available: number, width: number) => Math.min(1, available / width) || 1

/**
 * Shows content of a fixed `width` at full size when it fits, and scaled down
 * to the available width on narrow screens. `scale` overrides the fitted size
 * (zoom); `onFit` reports the fitted scale, e.g. to show it as a percentage.
 */
export function FitToWidth({
  width,
  scale,
  onFit,
  boxStyle,
  aside,
  children,
}: {
  width: number
  scale?: number | null
  onFit?: (scale: number) => void
  /** Style for the scaled box itself (not the full-width wrapper). */
  boxStyle?: CSSProperties
  /** Shown just left of the box (see ScaledBox). */
  aside?: ReactNode
  children: ReactNode
}) {
  const outer = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  const onFitRef = useRef(onFit)
  useLayoutEffect(() => {
    onFitRef.current = onFit
  })

  useLayoutEffect(() => {
    const update = () => {
      if (!outer.current) return
      const next = fitScale(outer.current.clientWidth, width)
      setFit(next)
      onFitRef.current?.(next)
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(outer.current!)
    return () => observer.disconnect()
  }, [width])

  return (
    <div ref={outer} className="w-full">
      <ScaledBox width={width} scale={scale ?? fit} style={boxStyle} aside={aside}>
        {children}
      </ScaledBox>
    </div>
  )
}
