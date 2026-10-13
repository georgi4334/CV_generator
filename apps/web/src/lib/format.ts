const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "13 Oct 2026" from an ISO date or datetime string. */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  return dateFormat.format(new Date(value))
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}
