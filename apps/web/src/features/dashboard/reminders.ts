import type { Job } from '@cv/shared'
import { daysBetween } from '@/shared/lib/format'

/** An applied job with no answer after this many days gets a reminder. */
export const NO_ANSWER_AFTER_DAYS = 14
/** A saved job still "To apply" after this many days gets a reminder. */
export const TO_APPLY_AFTER_DAYS = 7

export interface Reminder {
  job: Job
  days: number
  kind: 'no-answer' | 'to-apply'
}

/** Jobs that need a nudge, the longest-waiting first. `today` is an ISO date. */
export function remindersFor(jobs: Job[], today: string): Reminder[] {
  const reminders: Reminder[] = []
  for (const job of jobs) {
    if (job.status === 'applied' && job.dateApplied) {
      const days = daysBetween(job.dateApplied, today)
      if (days >= NO_ANSWER_AFTER_DAYS) reminders.push({ job, days, kind: 'no-answer' })
    } else if (job.status === 'to_apply') {
      const days = daysBetween(job.dateSaved, today)
      if (days >= TO_APPLY_AFTER_DAYS) reminders.push({ job, days, kind: 'to-apply' })
    }
  }
  return reminders.sort((a, b) => b.days - a.days)
}
