import type { Job, JobStatus } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { NO_ANSWER_AFTER_DAYS, remindersFor, TO_APPLY_AFTER_DAYS } from './reminders'

const job = (fields: Partial<Job> & Pick<Job, 'id' | 'status'>): Job => ({
  position: 'Dev',
  company: 'Acme',
  type: null,
  dateSaved: '2026-10-15',
  dateApplied: null,
  cvId: null,
  coverLetterId: null,
  description: '',
  notes: '',
  location: '',
  salary: '',
  contact: '',
  createdAt: '2026-10-15T09:00:00Z',
  updatedAt: '2026-10-15T09:00:00Z',
  ...fields,
})

const today = '2026-10-15'
const ids = (jobs: Job[], now = today) => remindersFor(jobs, now).map((r) => r.job.id)

describe('remindersFor edge cases', () => {
  it('returns nothing for an empty list', () => {
    expect(remindersFor([], today)).toEqual([])
  })

  it('has exact thresholds: 13 days is quiet, 14 days reminds', () => {
    expect(ids([job({ id: 'a', status: 'applied', dateApplied: '2026-10-02' })])).toEqual([])
    expect(ids([job({ id: 'a', status: 'applied', dateApplied: '2026-10-01' })])).toEqual(['a'])
    expect(NO_ANSWER_AFTER_DAYS).toBe(14)
    expect(TO_APPLY_AFTER_DAYS).toBe(7)
  })

  it.each(['2026-10-16', '2027-01-01', '2999-12-31'])(
    'a date in the future (%s) never reminds',
    (date) => {
      const jobs = [
        job({ id: 'applied', status: 'applied', dateApplied: date }),
        job({ id: 'saved', status: 'to_apply', dateSaved: date }),
      ]
      expect(ids(jobs)).toEqual([])
    },
  )

  it('very old dates remind with a large day count', () => {
    const [reminder] = remindersFor(
      [job({ id: 'old', status: 'applied', dateApplied: '1999-01-01' })],
      today,
    )
    expect(reminder!.days).toBeGreaterThan(9000)
  })

  it.each(['', 'garbage', '2026-13-45', '31/12/2026', 'null'])(
    'a job with the invalid date "%s" is skipped without throwing',
    (date) => {
      const jobs = [
        job({ id: 'applied', status: 'applied', dateApplied: date }),
        job({ id: 'saved', status: 'to_apply', dateSaved: date }),
      ]
      expect(() => remindersFor(jobs, today)).not.toThrow()
      expect(ids(jobs)).toEqual([])
    },
  )

  it('an invalid "today" gives no reminders instead of garbage', () => {
    const jobs = [job({ id: 'a', status: 'to_apply', dateSaved: '2020-01-01' })]
    expect(remindersFor(jobs, 'not a date')).toEqual([])
  })

  it('an applied job falls back to nothing when dateApplied is null, even if saved long ago', () => {
    expect(
      ids([job({ id: 'a', status: 'applied', dateApplied: null, dateSaved: '2020-01-01' })]),
    ).toEqual([])
  })

  it('uses dateApplied (not dateSaved) for applied jobs', () => {
    const jobs = [
      job({ id: 'a', status: 'applied', dateSaved: '2020-01-01', dateApplied: '2026-10-14' }),
    ]
    expect(ids(jobs)).toEqual([])
  })

  it('does not count the days across a daylight-saving change twice', () => {
    // Europe and the US change the clocks in these windows; whole calendar days must not drift.
    const spring = remindersFor(
      [job({ id: 'a', status: 'to_apply', dateSaved: '2026-03-25' })],
      '2026-04-01',
    )
    expect(spring[0]!.days).toBe(7)
    const autumn = remindersFor(
      [job({ id: 'a', status: 'to_apply', dateSaved: '2026-10-25' })],
      '2026-11-01',
    )
    expect(autumn[0]!.days).toBe(7)
    const nzSpring = remindersFor(
      [job({ id: 'a', status: 'applied', dateApplied: '2026-09-20' })],
      '2026-10-04',
    )
    expect(nzSpring[0]!.days).toBe(14)
  })

  it('counts over a leap day and across year ends', () => {
    expect(
      remindersFor(
        [job({ id: 'a', status: 'to_apply', dateSaved: '2028-02-25' })],
        '2028-03-03',
      )[0]!.days,
    ).toBe(7)
    expect(
      remindersFor(
        [job({ id: 'a', status: 'to_apply', dateSaved: '2026-12-28' })],
        '2027-01-04',
      )[0]!.days,
    ).toBe(7)
  })

  it('keeps the input order of jobs that wait equally long', () => {
    const jobs = ['a', 'b', 'c', 'd'].map((id) =>
      job({ id, status: 'to_apply', dateSaved: '2026-10-01' }),
    )
    expect(ids(jobs)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('handles 20 000 jobs quickly and sorts them longest-waiting first', () => {
    const statuses: JobStatus[] = ['to_apply', 'applied', 'rejected', 'no_answer', 'interviewing']
    const jobs = Array.from({ length: 20_000 }, (_, i) => {
      const day = String(1 + (i % 28)).padStart(2, '0')
      return job({
        id: `j${i}`,
        status: statuses[i % statuses.length]!,
        dateSaved: `2026-09-${day}`,
        dateApplied: i % 3 ? `2026-09-${day}` : null,
      })
    })
    const started = performance.now()
    const reminders = remindersFor(jobs, today)
    expect(performance.now() - started).toBeLessThan(1500)
    expect(reminders.length).toBeGreaterThan(1000)
    for (let i = 1; i < reminders.length; i++) {
      expect(reminders[i - 1]!.days).toBeGreaterThanOrEqual(reminders[i]!.days)
    }
  })

  it('does not change the list it is given', () => {
    const jobs = [
      job({ id: 'a', status: 'to_apply', dateSaved: '2026-10-10' }),
      job({ id: 'b', status: 'to_apply', dateSaved: '2026-09-01' }),
    ]
    const copy = [...jobs]
    remindersFor(jobs, today)
    expect(jobs).toEqual(copy)
  })
})
