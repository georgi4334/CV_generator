import { withStatus, type Job, type JobStatus, type UpdateJobInput } from '@cv/shared'
import { localToday } from '@/shared/lib/format'

export const inputClass = 'input input-sm w-auto'

/** A status change; the first move past "To apply" also fills in "Date applied". */
export function statusChange(job: Pick<Job, 'status' | 'dateApplied'>, status: JobStatus) {
  const next = withStatus(job, status, localToday())
  return { status: next.status, dateApplied: next.dateApplied } satisfies UpdateJobInput
}
