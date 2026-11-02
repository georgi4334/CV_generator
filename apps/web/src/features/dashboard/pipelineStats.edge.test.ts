import type { Job, JobStatus } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { FUNNEL_STAGES, pipelineStats } from './pipelineStats'

const jobs = (...statuses: string[]) => statuses.map((status) => ({ status }) as Job)
const many = (count: number, status: JobStatus) =>
  jobs(...Array.from({ length: count }, () => status))

describe('pipelineStats edge cases', () => {
  it('has four funnel steps in a fixed order, even with no jobs', () => {
    expect(pipelineStats([]).funnel.map((s) => s.stage)).toEqual([...FUNNEL_STAGES])
  })

  it('without jobs there are no percentages at all', () => {
    const stats = pipelineStats([])
    expect(stats.responseRate).toBeNull()
    expect(stats.funnel.map((s) => s.ofPrevious)).toEqual([null, null, null, null])
    expect(stats).toMatchObject({ rejected: 0, noAnswer: 0, active: 0, interviews: 0 })
  })

  it('one rejected job: 100% answered, nothing active', () => {
    const stats = pipelineStats(jobs('rejected'))
    expect(stats.responseRate).toBe(100)
    expect(stats.rejected).toBe(1)
    expect(stats.active).toBe(0)
    expect(stats.funnel.map((s) => s.count)).toEqual([1, 1, 0, 0])
  })

  it('jobs with only "no answer" have a 0% response rate, not null', () => {
    const stats = pipelineStats(jobs('no_answer', 'no_answer'))
    expect(stats.responseRate).toBe(0)
    expect(stats.noAnswer).toBe(2)
  })

  it('a job whose status the app does not know yet is ignored, not a crash', () => {
    const stats = pipelineStats(jobs('to_apply', 'ghosted_by_robot'))
    expect(stats.funnel[0]!.count).toBe(1)
    expect(stats.funnel[1]!.count).toBe(0)
  })

  it('a job without a status field does not throw', () => {
    expect(() => pipelineStats([{} as Job])).not.toThrow()
  })

  it('never reports more than 100% in any step or in the response rate', () => {
    const statuses: JobStatus[] = [
      'to_apply',
      'applied',
      'no_answer',
      'rejected',
      'interviewing',
      'negotiating',
      'accepted',
    ]
    for (let a = 0; a < statuses.length; a++) {
      for (let b = 0; b < statuses.length; b++) {
        const stats = pipelineStats(jobs(statuses[a]!, statuses[b]!, statuses[a]!))
        for (const step of stats.funnel) expect(step.ofPrevious ?? 0).toBeLessThanOrEqual(100)
        expect(stats.responseRate ?? 0).toBeLessThanOrEqual(100)
      }
    }
  })

  it('the funnel never grows from one step to the next', () => {
    const stats = pipelineStats(
      jobs('to_apply', 'applied', 'applied', 'interviewing', 'negotiating', 'accepted', 'rejected'),
    )
    const counts = stats.funnel.map((s) => s.count)
    expect([...counts].sort((x, y) => y - x)).toEqual(counts)
  })

  it('rounds percentages to whole numbers (1 of 3 = 33, 2 of 3 = 67)', () => {
    const stats = pipelineStats(jobs('to_apply', 'to_apply', 'applied'))
    expect(stats.funnel[1]!.ofPrevious).toBe(33)
    const stats2 = pipelineStats(jobs('to_apply', 'applied', 'applied'))
    expect(stats2.funnel[1]!.ofPrevious).toBe(67)
  })

  it('counts 50 000 jobs correctly and fast', () => {
    const list = [
      ...many(20_000, 'to_apply'),
      ...many(10_000, 'applied'),
      ...many(10_000, 'rejected'),
      ...many(5_000, 'interviewing'),
      ...many(5_000, 'accepted'),
    ]
    const started = performance.now()
    const stats = pipelineStats(list)
    expect(performance.now() - started).toBeLessThan(1000)
    expect(stats.funnel.map((s) => s.count)).toEqual([50_000, 30_000, 10_000, 5_000])
    expect(stats.responseRate).toBe(67)
    expect(stats.active).toBe(15_000)
  })

  it('does not mutate the jobs it reads', () => {
    const list = Object.freeze(jobs('applied', 'rejected')) as Job[]
    expect(() => pipelineStats(list)).not.toThrow()
  })
})
