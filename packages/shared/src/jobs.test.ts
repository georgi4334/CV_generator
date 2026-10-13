import { describe, expect, it } from 'vitest'
import { JobInputSchema, withStatus } from './jobs'

describe('JobInputSchema', () => {
  it('defaults new jobs to "To apply"', () => {
    const job = JobInputSchema.parse({ position: 'Frontend Engineer', company: 'Acme' })
    expect(job.status).toBe('to_apply')
    expect(job.dateApplied).toBeNull()
  })

  it('requires position and company', () => {
    expect(JobInputSchema.safeParse({ position: '', company: 'Acme' }).success).toBe(false)
  })

  it('rejects an unknown job type', () => {
    const result = JobInputSchema.safeParse({ position: 'Dev', company: 'Acme', type: 'office' })
    expect(result.success).toBe(false)
  })
})

describe('withStatus', () => {
  const today = '2026-10-13'

  it('sets "Date applied" when a job leaves "To apply"', () => {
    const job = withStatus({ status: 'to_apply', dateApplied: null }, 'applied', today)
    expect(job).toEqual({ status: 'applied', dateApplied: today })
  })

  it('keeps an existing "Date applied"', () => {
    const job = withStatus({ status: 'applied', dateApplied: '2026-09-01' }, 'interviewing', today)
    expect(job.dateApplied).toBe('2026-09-01')
  })

  it('leaves "Date applied" empty while still "To apply"', () => {
    const job = withStatus({ status: 'to_apply', dateApplied: null }, 'to_apply', today)
    expect(job.dateApplied).toBeNull()
  })
})
