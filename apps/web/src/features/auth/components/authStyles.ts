export const field = 'input'

/** Where to go after signing in: the page that asked for it, never another site. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export const linkClass = 'link'
