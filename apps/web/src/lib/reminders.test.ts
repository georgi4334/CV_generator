import type { Job } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { remindersFor } from './reminders'

const job = (fields: Partial<Job> & Pick<Job, 'id' | 'status'>): Job => ({
  position: 'Dev',
  company: 'Acme',
  type: null,
  dateSaved: '2026-10-15',
  dateApplied: null,
  cvId: null,
  coverLetterId: null,
  notes: '',
  location: '',
  salary: '',
  contact: '',
  createdAt: '2026-10-15T09:00:00Z',
  updatedAt: '2026-10-15T09:00:00Z',
  ...fields,
})

const today = '2026-10-15'

describe('remindersFor', () => {
  it('asks about applied jobs without an answer after 14 days', () => {
    const jobs = [
      job({ id: 'old', status: 'applied', dateApplied: '2026-10-01' }),
      job({ id: 'new', status: 'applied', dateApplied: '2026-10-02' }),
    ]
    expect(remindersFor(jobs, today)).toEqual([{ job: jobs[0], days: 14, kind: 'no-answer' }])
  })

  it('reminds about jobs still "To apply" after 7 days', () => {
    const jobs = [
      job({ id: 'week', status: 'to_apply', dateSaved: '2026-10-08' }),
      job({ id: 'fresh', status: 'to_apply', dateSaved: '2026-10-09' }),
    ]
    expect(remindersFor(jobs, today).map((r) => [r.job.id, r.days, r.kind])).toEqual([
      ['week', 7, 'to-apply'],
    ])
  })

  it('ignores other statuses and applied jobs without a date', () => {
    const jobs = [
      job({ id: '1', status: 'interviewing', dateApplied: '2026-01-01', dateSaved: '2026-01-01' }),
      job({ id: '2', status: 'rejected', dateSaved: '2026-01-01' }),
      job({ id: '3', status: 'applied', dateApplied: null, dateSaved: '2026-01-01' }),
    ]
    expect(remindersFor(jobs, today)).toEqual([])
  })

  it('lists the longest-waiting first', () => {
    const jobs = [
      job({ id: 'a', status: 'to_apply', dateSaved: '2026-10-01' }),
      job({ id: 'b', status: 'applied', dateApplied: '2026-09-01' }),
      job({ id: 'c', status: 'to_apply', dateSaved: '2026-10-05' }),
    ]
    expect(remindersFor(jobs, today).map((r) => r.job.id)).toEqual(['b', 'a', 'c'])
  })
})
