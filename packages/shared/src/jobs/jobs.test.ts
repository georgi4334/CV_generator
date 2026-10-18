import { describe, expect, it } from 'vitest'
import { CreateJobInputSchema, UpdateJobInputSchema, withStatus } from './jobs'

describe('CreateJobInputSchema', () => {
  it('defaults new jobs to "To apply" with empty details', () => {
    const job = CreateJobInputSchema.parse({ position: 'Frontend Engineer', company: 'Acme' })
    expect(job).toMatchObject({
      status: 'to_apply',
      dateApplied: null,
      type: null,
      cvId: null,
      notes: '',
      location: '',
      salary: '',
      contact: '',
    })
  })

  it('requires position and company', () => {
    expect(CreateJobInputSchema.safeParse({ position: ' ', company: 'Acme' }).success).toBe(false)
    expect(CreateJobInputSchema.safeParse({ position: 'Dev' }).success).toBe(false)
  })

  it('rejects an unknown job type', () => {
    const result = CreateJobInputSchema.safeParse({
      position: 'Dev',
      company: 'Acme',
      type: 'office',
    })
    expect(result.success).toBe(false)
  })
})

describe('UpdateJobInputSchema', () => {
  it('accepts a single changed field without filling in the others', () => {
    expect(UpdateJobInputSchema.parse({ notes: 'Call back' })).toEqual({ notes: 'Call back' })
  })

  it('does not allow clearing the position', () => {
    expect(UpdateJobInputSchema.safeParse({ position: '' }).success).toBe(false)
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

describe('applied dates', () => {
  const tomorrow = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

  it('accepts a past date, also from before the job was saved', () => {
    const input = { position: 'Dev', company: 'Acme', dateApplied: '2020-01-01' }
    expect(CreateJobInputSchema.safeParse(input).success).toBe(true)
    expect(UpdateJobInputSchema.safeParse({ dateApplied: '2020-01-01' }).success).toBe(true)
  })

  it('rejects an applied date in the future, but allows a time zone ahead', () => {
    const create = (dateApplied: string) =>
      CreateJobInputSchema.safeParse({ position: 'Dev', company: 'Acme', dateApplied }).success
    expect(create(tomorrow(1))).toBe(true)
    expect(create(tomorrow(3))).toBe(false)
    expect(UpdateJobInputSchema.safeParse({ dateApplied: tomorrow(30) }).success).toBe(false)
  })
})
