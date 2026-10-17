import type { Job, JobStatus } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { pipelineStats } from './pipelineStats'

const jobs = (...statuses: JobStatus[]) => statuses.map((status) => ({ status }) as Job)

describe('pipelineStats', () => {
  it('counts how far applications got, step by step', () => {
    const stats = pipelineStats(
      jobs(
        'to_apply',
        'applied',
        'no_answer',
        'rejected',
        'interviewing',
        'negotiating',
        'accepted',
      ),
    )
    expect(stats.funnel.map((s) => [s.stage, s.count, s.ofPrevious])).toEqual([
      ['saved', 7, null],
      ['applied', 6, 86],
      ['interview', 3, 50],
      ['offer', 2, 67],
    ])
    expect(stats).toMatchObject({ rejected: 1, noAnswer: 1, active: 3, interviews: 3 })
    // Interviewing, negotiating, accepted and rejected answered; 4 of 6 applications.
    expect(stats.responseRate).toBe(67)
  })

  it('has no rates before anything was applied for', () => {
    const stats = pipelineStats(jobs('to_apply'))
    expect(stats.responseRate).toBeNull()
    expect(stats.funnel[2]!.ofPrevious).toBeNull()
  })

  it('is all zeros without jobs', () => {
    const stats = pipelineStats([])
    expect(stats.funnel.every((s) => s.count === 0)).toBe(true)
    expect(stats.active).toBe(0)
  })
})
