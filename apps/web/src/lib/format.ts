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

/** Today in the user's time zone, as an ISO date ("2026-10-15"). */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}
