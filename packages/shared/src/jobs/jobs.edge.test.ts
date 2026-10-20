import { describe, expect, it } from 'vitest'
import {
  CreateJobInputSchema,
  IsoDateSchema,
  JOB_NOTES_MAX,
  JOB_SALARY_MAX,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  JOB_TEXT_MAX,
  JOB_TYPES,
  JOB_TYPE_LABELS,
  JobSchema,
  UpdateJobInputSchema,
  withStatus,
} from './jobs'
import { JOB_DESCRIPTION_MAX } from '../ai/ai'

const base = { position: 'Dev', company: 'Acme' }
const create = (extra: Record<string, unknown>) =>
  CreateJobInputSchema.safeParse({ ...base, ...extra })
const uuid = '123e4567-e89b-12d3-a456-426614174000'

describe('job text limits', () => {
  it.each(['position', 'company'])('%s: 1 to 200 characters after trimming', (key) => {
    expect(create({ [key]: 'x'.repeat(JOB_TEXT_MAX) }).success).toBe(true)
    expect(create({ [key]: 'x'.repeat(JOB_TEXT_MAX + 1) }).success).toBe(false)
    expect(create({ [key]: '' }).success).toBe(false)
    expect(create({ [key]: ' \n ' }).success).toBe(false)
    expect(create({ [key]: `  ${'x'.repeat(JOB_TEXT_MAX)}  ` }).success).toBe(true)
  })

  it.each([
    ['location', JOB_TEXT_MAX],
    ['contact', JOB_TEXT_MAX],
    ['salary', JOB_SALARY_MAX],
    ['notes', JOB_NOTES_MAX],
    ['description', JOB_DESCRIPTION_MAX],
  ])('%s: allows empty, exactly %i, and refuses one more', (key, max) => {
    expect(create({ [key]: '' }).success).toBe(true)
    expect(create({ [key]: 'x'.repeat(max) }).success).toBe(true)
    expect(create({ [key]: 'x'.repeat(max + 1) }).success).toBe(false)
  })

  it('does not trim notes (they are free text) but trims location, salary and contact', () => {
    const data = create({
      notes: '  keep  ',
      location: ' Sofia ',
      salary: ' 5k ',
      contact: ' Jo ',
    }).data
    expect(data).toMatchObject({
      notes: '  keep  ',
      location: 'Sofia',
      salary: '5k',
      contact: 'Jo',
    })
  })

  it.each(['position', 'company', 'notes', 'location', 'salary', 'contact', 'description'])(
    'refuses a %s that is not a string',
    (key) => {
      for (const value of [5, null, [], {}, true])
        expect(create({ [key]: value }).success, `${key}=${String(value)}`).toBe(false)
    },
  )

  it('keeps emoji, RTL, Cyrillic and NUL in a position', () => {
    for (const position of ['Dev 👩‍💻', 'مطور', 'Разработчик', 'a\u0000b'])
      expect(create({ position }).data?.position).toBe(position)
  })

  it('refuses a missing company, a missing position and a non-object body', () => {
    expect(CreateJobInputSchema.safeParse({ position: 'x' }).success).toBe(false)
    expect(CreateJobInputSchema.safeParse({ company: 'x' }).success).toBe(false)
    for (const body of [null, undefined, 'job', 5, []])
      expect(CreateJobInputSchema.safeParse(body).success).toBe(false)
  })
})

describe('job status and type', () => {
  it.each(JOB_STATUSES)('accepts the status %s and has a label for it', (status) => {
    expect(create({ status }).success).toBe(true)
    expect(JOB_STATUS_LABELS[status]).toBeTruthy()
  })

  it.each(JOB_TYPES)('accepts the type %s and has a label for it', (type) => {
    expect(create({ type }).success).toBe(true)
    expect(JOB_TYPE_LABELS[type]).toBeTruthy()
  })

  it.each(['done', 'Applied', '', null, 5])('refuses the status %j', (status) => {
    expect(create({ status }).success).toBe(false)
  })

  it.each(['office', 'Remote', '', 5])('refuses the type %j', (type) => {
    expect(create({ type }).success).toBe(false)
  })

  it('allows a null type on create and update', () => {
    expect(create({ type: null }).success).toBe(true)
    expect(UpdateJobInputSchema.safeParse({ type: null }).success).toBe(true)
  })

  it('does not accept a null status on update', () => {
    expect(UpdateJobInputSchema.safeParse({ status: null }).success).toBe(false)
  })
})

describe('job dates', () => {
  it.each(['2026-02-28', '2024-02-29', '2000-01-01', '0001-01-01'])(
    'accepts the date %s',
    (date) => {
      expect(IsoDateSchema.safeParse(date).success).toBe(true)
    },
  )

  it.each([
    '2026-02-30',
    '2025-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-01-32',
    '2026-1-1',
    '26-01-01',
    '2026/01/01',
    '2026-01-01T00:00:00Z',
    ' 2026-01-01',
    '',
    'today',
  ])('rejects the date %j', (date) => {
    expect(IsoDateSchema.safeParse(date).success).toBe(false)
  })

  it('accepts a date applied far in the past and refuses one far in the future', () => {
    expect(create({ dateApplied: '1999-12-31' }).success).toBe(true)
    expect(create({ dateApplied: '9999-12-31' }).success).toBe(false)
  })

  it('refuses an impossible applied date with a null-able schema', () => {
    expect(create({ dateApplied: '2026-02-30' }).success).toBe(false)
    expect(create({ dateApplied: null }).success).toBe(true)
  })

  it('allows a dateSaved to be left out, but validates it when given', () => {
    expect(create({}).data?.dateSaved).toBeUndefined()
    expect(create({ dateSaved: '2026-10-20' }).success).toBe(true)
    expect(create({ dateSaved: 'yesterday' }).success).toBe(false)
  })
})

describe('job references', () => {
  it('requires a uuid or null for cvId and coverLetterId on create and update', () => {
    expect(create({ cvId: uuid, coverLetterId: uuid }).success).toBe(true)
    expect(create({ cvId: null, coverLetterId: null }).success).toBe(true)
    for (const bad of ['', 'abc', '1', `${uuid}0`]) {
      expect(create({ cvId: bad }).success).toBe(false)
      expect(create({ coverLetterId: bad }).success).toBe(false)
      expect(UpdateJobInputSchema.safeParse({ cvId: bad }).success).toBe(false)
    }
  })
})

describe('UpdateJobInputSchema', () => {
  it('accepts an empty update', () => {
    expect(UpdateJobInputSchema.parse({})).toEqual({})
  })

  it('does not fill in defaults for fields that were not sent', () => {
    expect(UpdateJobInputSchema.parse({ salary: '5k' })).toEqual({ salary: '5k' })
  })

  it('applies the same limits as create to the fields it does get', () => {
    expect(UpdateJobInputSchema.safeParse({ position: 'x'.repeat(JOB_TEXT_MAX + 1) }).success).toBe(
      false,
    )
    expect(UpdateJobInputSchema.safeParse({ company: '  ' }).success).toBe(false)
    expect(UpdateJobInputSchema.safeParse({ notes: 'x'.repeat(JOB_NOTES_MAX + 1) }).success).toBe(
      false,
    )
  })

  it('strips fields a client must not set', () => {
    const parsed = UpdateJobInputSchema.parse({
      notes: 'x',
      id: 'other',
      createdAt: '2020-01-01T00:00:00Z',
    })
    expect(parsed).toEqual({ notes: 'x' })
  })

  it('treats explicit undefined as not sent', () => {
    expect(UpdateJobInputSchema.parse({ notes: undefined })).toEqual({})
  })
})

describe('JobSchema', () => {
  const job = {
    id: 'j1',
    position: 'Dev',
    company: 'Acme',
    status: 'applied',
    type: null,
    dateApplied: null,
    cvId: null,
    coverLetterId: null,
    notes: '',
    location: '',
    salary: '',
    contact: '',
    description: '',
    dateSaved: '2026-10-20',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  }

  it('reads a stored job, including a future applied date (reading is lenient)', () => {
    expect(JobSchema.safeParse(job).success).toBe(true)
    expect(JobSchema.safeParse({ ...job, dateApplied: '2999-01-01' }).success).toBe(true)
  })

  it('needs timestamps with a time and an id', () => {
    expect(JobSchema.safeParse({ ...job, createdAt: '2026-10-20' }).success).toBe(false)
    expect(JobSchema.safeParse({ ...job, id: '' }).success).toBe(false)
  })
})

describe('withStatus edge cases', () => {
  const today = '2026-10-20'

  it.each(JOB_STATUSES.filter((s) => s !== 'to_apply'))(
    'stamps the applied date when moving to %s',
    (status) => {
      expect(withStatus({ status: 'to_apply', dateApplied: null }, status, today).dateApplied).toBe(
        today,
      )
    },
  )

  it('does not clear an applied date when moving back to "To apply"', () => {
    expect(
      withStatus({ status: 'applied', dateApplied: '2026-09-01' }, 'to_apply', today).dateApplied,
    ).toBe('2026-09-01')
  })

  it('does not change the job it is given and keeps other fields', () => {
    const job = { status: 'to_apply' as const, dateApplied: null, position: 'Dev' }
    const next = withStatus(job, 'applied', today)
    expect(job).toEqual({ status: 'to_apply', dateApplied: null, position: 'Dev' })
    expect(next.position).toBe('Dev')
    expect(next).not.toBe(job)
  })

  it('is idempotent', () => {
    const once = withStatus({ status: 'to_apply', dateApplied: null }, 'rejected', today)
    expect(withStatus(once, 'rejected', '2030-01-01')).toEqual(once)
  })
})
