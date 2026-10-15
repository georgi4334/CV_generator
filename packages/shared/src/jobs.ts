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

/** Fields of a saved job the user can edit (in the table, the form or the drawer). */
const jobFields = {
  position: z.string().trim().min(1).max(200),
  company: z.string().trim().min(1).max(200),
  status: JobStatusSchema,
  type: JobTypeSchema.nullable(),
  dateApplied: IsoDateSchema.nullable(),
  /** The CV sent for this job. */
  cvId: IdSchema.nullable(),
  /** The cover letter sent (cover letters arrive in Step 13). */
  coverLetterId: IdSchema.nullable(),
  notes: z.string().max(5000),
  location: z.string().trim().max(200),
  salary: z.string().trim().max(100),
  contact: z.string().trim().max(200),
}

/** "+ Add job": position and company are required, everything else has a default. */
export const CreateJobInputSchema = z.object({
  ...jobFields,
  status: jobFields.status.default('to_apply'),
  type: jobFields.type.default(null),
  dateApplied: jobFields.dateApplied.default(null),
  cvId: jobFields.cvId.default(null),
  coverLetterId: jobFields.coverLetterId.default(null),
  notes: jobFields.notes.default(''),
  location: jobFields.location.default(''),
  salary: jobFields.salary.default(''),
  contact: jobFields.contact.default(''),
  /** The user's local date; the server's date (UTC) when left out. */
  dateSaved: IsoDateSchema.optional(),
})
export type CreateJobInput = z.input<typeof CreateJobInputSchema>

/** Inline edits and the drawer send only the fields that changed. */
export const UpdateJobInputSchema = z.object(jobFields).partial()
export type UpdateJobInput = z.infer<typeof UpdateJobInputSchema>

export const JobSchema = z.object({
  ...jobFields,
  id: IdSchema,
  /** Set when the job is added. */
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
