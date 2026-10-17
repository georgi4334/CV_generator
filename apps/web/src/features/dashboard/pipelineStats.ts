import type { Job, JobStatus } from '@cv/shared'

/** The stages of the application funnel, in order. */
export const FUNNEL_STAGES = ['saved', 'applied', 'interview', 'offer'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

/** The furthest stage each status shows a job reached (rejected and no answer: applied). */
const REACHED: Record<JobStatus, number> = {
  to_apply: 0,
  applied: 1,
  no_answer: 1,
  rejected: 1,
  interviewing: 2,
  negotiating: 3,
  accepted: 3,
}

/** Statuses that count as an answer from the employer. */
const ANSWERED: readonly JobStatus[] = ['interviewing', 'negotiating', 'accepted', 'rejected']
/** Applications still in progress. */
const ACTIVE: readonly JobStatus[] = ['applied', 'interviewing', 'negotiating']

export interface FunnelStep {
  stage: FunnelStage
  count: number
  /** Share of the step before, 0–100 (null for the first step or when the step before is empty). */
  ofPrevious: number | null
}

export interface PipelineStats {
  funnel: FunnelStep[]
  rejected: number
  noAnswer: number
  /** Applications still in progress. */
  active: number
  /** Answers (interviews, offers, rejections) per application, 0–100; null before any application. */
  responseRate: number | null
  /** Jobs that reached an interview or further. */
  interviews: number
}

const percent = (part: number, whole: number) =>
  whole === 0 ? null : Math.round((part / whole) * 100)

/**
 * The numbers behind the dashboard's funnel and stat tiles: how far
 * applications get, and how many get an answer.
 */
export function pipelineStats(jobs: Job[]): PipelineStats {
  const reached = (stage: number) => jobs.filter((job) => REACHED[job.status] >= stage).length
  const counts = FUNNEL_STAGES.map((_, index) => reached(index))
  const count = (statuses: readonly JobStatus[]) =>
    jobs.filter((job) => statuses.includes(job.status)).length
  const applied = counts[1]!
  return {
    funnel: FUNNEL_STAGES.map((stage, index) => ({
      stage,
      count: counts[index]!,
      ofPrevious: index === 0 ? null : percent(counts[index]!, counts[index - 1]!),
    })),
    rejected: count(['rejected']),
    noAnswer: count(['no_answer']),
    active: count(ACTIVE),
    responseRate: percent(count(ANSWERED), applied),
    interviews: counts[2]!,
  }
}
