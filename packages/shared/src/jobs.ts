import { z } from 'zod'
import { IdSchema } from './cv/common'

export const JOB_STATUSES = [
  'to_apply',
  'applied',
  'interviewing',
  'negotiating',
  'accepted',
  'rejected',
  'no_answer',
] as const
export const JobStatusSchema = z.enum(JOB_STATUSES)
export type JobStatus = z.infer<typeof JobStatusSchema>

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  to_apply: 'To apply',
  applied: 'Applied',
  interviewing: 'Interviewing',
  negotiating: 'Negotiating',
  accepted: 'Accepted',
  rejected: 'Rejected',
  no_answer: 'No answer',
}

export const JOB_TYPES = ['remote', 'onsite', 'hybrid'] as const
export const JobTypeSchema = z.enum(JOB_TYPES)
export type JobType = z.infer<typeof JobTypeSchema>

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  remote: 'Remote',
  onsite: 'On-site',
  hybrid: 'Hybrid',
}

/** Calendar date without time, e.g. "2026-10-13". */
export const IsoDateSchema = z.iso.date()

/** Editable fields of a saved job (what the "Add job" form and inline edits send). */
export const JobInputSchema = z.object({
  position: z.string().min(1),
  company: z.string().min(1),
  status: JobStatusSchema.default('to_apply'),
  type: JobTypeSchema.nullable().default(null),
  dateApplied: IsoDateSchema.nullable().default(null),
  cvId: IdSchema.nullable().default(null),
  coverLetterId: IdSchema.nullable().default(null),
  notes: z.string().default(''),
  url: z.string().default(''),
  description: z.string().default(''),
  location: z.string().default(''),
  salary: z.string().default(''),
  contact: z.string().default(''),
})
export type JobInput = z.input<typeof JobInputSchema>

export const JobSchema = JobInputSchema.extend({
  id: IdSchema,
  dateSaved: IsoDateSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type Job = z.infer<typeof JobSchema>

/**
 * Applies a status change and fills in "Date applied" the first time a job
 * moves past "To apply", unless the user already set it.
 */
export function withStatus<T extends Pick<Job, 'status' | 'dateApplied'>>(
  job: T,
  status: JobStatus,
  today: string,
): T {
  const dateApplied = job.dateApplied ?? (status !== 'to_apply' ? today : null)
  return { ...job, status, dateApplied }
}
