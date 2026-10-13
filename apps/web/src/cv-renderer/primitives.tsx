import type { CSSProperties, ReactNode } from 'react'
import { useRender } from './context'

/** A text value, or its grey placeholder while editing. Renders nothing when empty in preview. */
export function Field({
  value,
  placeholder,
  className,
  style,
}: {
  value: string
  placeholder: string
  className?: string
  style?: CSSProperties
}) {
  const { mode } = useRender()
  if (value)
    return (
      <span className={className} style={style}>
        {value}
      </span>
    )
  if (mode === 'preview') return null
  return (
    <span className={className} style={{ ...style, opacity: 0.45 }} data-placeholder>
      {placeholder}
    </span>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { titleVariant } = useRender()
  if (titleVariant === 'accent-rule') {
    return (
      <h2
        className="mb-[0.5em] border-b-2 pb-[0.2em] text-[1.05em] font-semibold tracking-wider uppercase"
        style={{ color: 'var(--cv-accent-text)', borderColor: 'var(--cv-accent-text)' }}
      >
        {children}
      </h2>
    )
  }
  if (titleVariant === 'accent-small') {
    return (
      <h2
        className="mb-[0.4em] text-[0.9em] font-bold tracking-[0.12em] uppercase"
        style={{ color: 'var(--cv-accent-text)' }}
      >
        {children}
      </h2>
    )
  }
  return (
    <h2
      className="mb-[0.6em] border-b pb-[0.35em] text-[1.1em] font-medium uppercase"
      style={{ borderColor: 'var(--cv-rule)' }}
    >
      {children}
    </h2>
  )
}

/** Two pieces of text on one line: left grows, right is muted and right-aligned. */
export function SplitRow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">{left}</div>
      <div className="shrink-0 text-right text-[0.85em]" style={{ color: 'var(--cv-muted)' }}>
        {right}
      </div>
    </div>
  )
}

export function Bullets({ bullets, placeholder }: { bullets: string[]; placeholder: string }) {
  const { mode } = useRender()
  const shown = mode === 'preview' ? bullets.filter((b) => b.trim()) : bullets
  if (shown.length === 0) return null
  return (
    <ul
      className="mt-[0.3em] list-disc space-y-[0.15em] pl-[1.2em] text-[0.92em] marker:text-[0.8em]"
      style={{ color: 'var(--cv-muted-strong)' }}
    >
      {shown.map((bullet, i) => (
        <li key={i}>
          <Field value={bullet} placeholder={placeholder} />
        </li>
      ))}
    </ul>
  )
}

/** Level 1–5 as dots or a bar. */
export function LevelIndicator({ level, display }: { level: number; display: 'dots' | 'bar' }) {
  if (display === 'bar') {
    return (
      <span
        className="block h-[0.35em] w-full overflow-hidden rounded-full"
        style={{ background: 'var(--cv-rule)' }}
        aria-label={`${level} of 5`}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${level * 20}%`, background: 'var(--cv-accent-text)' }}
        />
      </span>
    )
  }
  return (
    <span className="inline-flex gap-[0.25em]" aria-label={`${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="inline-block size-[0.6em] rounded-full"
          style={{ background: n <= level ? 'var(--cv-accent-text)' : 'var(--cv-rule)' }}
        />
      ))}
    </span>
  )
}
