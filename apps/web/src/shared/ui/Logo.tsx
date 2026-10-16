import { APP_NAME } from '@cv/shared'

/**
 * The product's mark: a page with a folded corner and a check, a CV that is
 * ready to send. Drawn with the brand tokens, so it follows the theme; the
 * same drawing is the favicon (public/favicon.svg).
 */
export function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="8" className="fill-brand" />
      <path d="M10 6.5h8.5l4.5 4.5v14.5H10z" className="fill-on-brand" />
      <path d="M18.5 6.5V11H23z" className="fill-brand opacity-35" />
      <path
        d="M13.4 16.6l2.7 3.1 4.5-6.3"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-brand"
      />
    </svg>
  )
}

/** Mark and name. `nameClassName` can hide the name where space is short. */
export function Logo({ nameClassName = '' }: { nameClassName?: string }) {
  return (
    <span className="flex items-center gap-2 text-lg font-semibold tracking-tight text-fg">
      <LogoMark />
      <span className={nameClassName}>{APP_NAME}</span>
    </span>
  )
}
