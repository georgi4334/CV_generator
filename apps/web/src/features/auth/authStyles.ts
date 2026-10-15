export const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800'

/** Where to go after signing in: the page that asked for it, never another site. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export const linkClass = 'text-teal-700 hover:underline dark:text-teal-300'
