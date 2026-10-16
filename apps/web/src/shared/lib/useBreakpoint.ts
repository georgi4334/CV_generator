import { useMediaQuery } from './useMediaQuery'

/**
 * Screen widths where layouts change. The same values are the --breakpoint-*
 * tokens in shared/styles/tokens.css (Tailwind's sm:, md: …); a unit test
 * keeps the two in step. TypeScript needs its own copy because the first
 * render can happen before the stylesheet has loaded.
 */
export const BREAKPOINTS = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
  '2xl': '96rem',
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/**
 * True when the screen is at least as wide as the breakpoint (like Tailwind's `md:`).
 * Prefer CSS (`md:hidden` …) for looks; use this only when the markup itself differs.
 * Where media queries are unavailable (unit tests) it reports a wide screen.
 */
export function useBreakpoint(name: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[name]})`, true)
}
