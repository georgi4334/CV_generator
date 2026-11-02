import { JOB_STATUSES } from '@cv/shared'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { jobs } from '../../src/db/schema/index'
import { apiCaller, countBy, inParallel, unknownId } from '../support/api'
import { dbAvailable, useTestApp } from '../support/context'

describe.skipIf(!dbAvailable)('jobs: odd input, limits and ownership', () => {
  const ctx = useTestApp()
  const call = apiCaller(ctx)
  const base = { position: 'Frontend Engineer', company: 'Acme' }
  const add = async (extra: object = {}) => {
    const res = await call('POST', '/jobs', { ...base, ...extra })
    expect(res.statusCode).toBe(201)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return res.json() as { id: string; [key: string]: any }
  }

  describe('creating', () => {
    it.each([
      ['position', { position: 'x'.repeat(201) }],
      ['company', { company: 'x'.repeat(201) }],
      ['location', { location: 'x'.repeat(201) }],
      ['contact', { contact: 'x'.repeat(201) }],
      ['salary', { salary: 'x'.repeat(101) }],
      ['notes', { notes: 'x'.repeat(5001) }],
      ['description', { description: 'x'.repeat(20_001) }],
    ])('refuses a %s that is one character too long', async (_name, extra) => {
      const res = await call('POST', '/jobs', { ...base, ...extra })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('validation_error')
      expect(await ctx.database.db.select().from(jobs)).toEqual([])
    })

    it('accepts every text at exactly its longest size', async () => {
      const job = await add({
        position: 'p'.repeat(200),
        company: 'c'.repeat(200),
        location: 'l'.repeat(200),
        contact: 'k'.repeat(200),
        salary: 's'.repeat(100),
        notes: 'n'.repeat(5000),
        description: 'd'.repeat(20_000),
      })
      expect(job.notes).toHaveLength(5000)
      expect(job.description).toHaveLength(20_000)
    })

    it.each([
      ['position is empty', { position: '' }],
      ['position is only spaces', { position: '   ' }],
      ['company is missing', { company: undefined }],
      ['position is a number', { position: 5 }],
      ['company is an array', { company: ['Acme'] }],
      ['status is unknown', { status: 'hired' }],
      ['status is null', { status: null }],
      ['status has another case', { status: 'APPLIED' }],
      ['type is unknown', { type: 'office' }],
      ['cvId is a number', { cvId: 5 }],
      ['coverLetterId is not an id', { coverLetterId: 'nope' }],
      ['notes is a number', { notes: 5 }],
    ])('refuses a job when the %s', async (_name, extra) => {
      expect((await call('POST', '/jobs', { ...base, ...extra })).statusCode).toBe(400)
    })

    it.each([
      ['an impossible day', '2026-02-30'],
      ['an impossible month', '2026-13-01'],
      ['a word', 'yesterday'],
      ['an empty string', ''],
      ['a number', 20260101],
      ['no zero padding', '2026-1-1'],
      ['a date with a time', '2026-01-01T00:00:00Z'],
      ['an American date', '01/02/2026'],
      ['SQL', "2026-01-01'; drop table jobs;--"],
    ])('refuses an applied date that is %s', async (_name, dateApplied) => {
      expect((await call('POST', '/jobs', { ...base, dateApplied })).statusCode).toBe(400)
    })

    it('refuses a saved date that is not a date, and keeps a given one', async () => {
      expect((await call('POST', '/jobs', { ...base, dateSaved: 'soon' })).statusCode).toBe(400)
      expect((await add({ dateSaved: '2020-02-29' })).dateSaved).toBe('2020-02-29')
      expect((await call('POST', '/jobs', { ...base, dateSaved: '2021-02-29' })).statusCode).toBe(
        400,
      )
    })

    it.each(JOB_STATUSES)('accepts the status %s', async (status) => {
      expect((await add({ status })).status).toBe(status)
    })

    it('trims spaces but keeps inner ones, and keeps notes exactly as typed', async () => {
      const job = await add({ position: '  Senior   Dev  ', notes: '  line 1\n\nline 3  ' })
      expect(job.position).toBe('Senior   Dev')
      expect(job.notes).toBe('  line 1\n\nline 3  ')
    })

    it('stores emoji, markup, SQL and path text unchanged', async () => {
      const strange = [
        "O'Brien & Sons 🙂",
        '<script>alert(1)</script>',
        "'; drop table jobs;--",
        '../../etc/passwd',
        '日本語 العربية',
      ]
      for (const company of strange) expect((await add({ company })).company).toBe(company)
      expect((await call('GET', '/jobs')).json()).toHaveLength(strange.length)
    })

    it('ignores fields it does not know, including an owner, an id and creation times', async () => {
      const other = await ctx.signUp('other@example.com')
      const job = await add({
        userId: other.userId,
        id: unknownId(),
        createdAt: '2000-01-01T00:00:00Z',
        isAdmin: true,
      })
      expect(job.createdAt.startsWith('2000')).toBe(false)
      expect((await call('GET', `/jobs/${job.id}`)).statusCode).toBe(200)
      expect((await call('GET', '/jobs', undefined, other.cookie)).json()).toEqual([])
    })

    it('links a CV and a cover letter of its own, and nothing of another account', async () => {
      const other = await ctx.signUp('other@example.com')
      const theirCv = (await call('POST', '/cvs', {}, other.cookie)).json()
      const theirLetter = (await call('POST', '/cover-letters', {}, other.cookie)).json()
      const cv = (await call('POST', '/cvs', {})).json()
      const letter = (await call('POST', '/cover-letters', {})).json()
      expect((await add({ cvId: cv.id, coverLetterId: letter.id })).cvId).toBe(cv.id)
      expect((await call('POST', '/jobs', { ...base, cvId: theirCv.id })).statusCode).toBe(404)
      expect(
        (await call('POST', '/jobs', { ...base, coverLetterId: theirLetter.id })).statusCode,
      ).toBe(404)
      expect((await call('POST', '/jobs', { ...base, cvId: unknownId() })).statusCode).toBe(404)
    })

    it('creates 40 jobs at once and lists them all, newest saved first', async () => {
      const results = await inParallel(40, (i) =>
        call('POST', '/jobs', {
          ...base,
          company: `Company ${i}`,
          dateSaved: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
        }),
      )
      expect(countBy(results, (r) => r.statusCode)).toEqual({ '201': 40 })
      const list = (await call('GET', '/jobs')).json() as { dateSaved: string }[]
      expect(list).toHaveLength(40)
      const dates = list.map((j) => j.dateSaved)
      expect(dates).toEqual([...dates].sort().reverse())
    })

    it('lists 300 jobs in one answer', async () => {
      await ctx.database.db.insert(jobs).values(
        Array.from({ length: 300 }, (_, i) => ({
          userId: ctx.userId,
          position: `Job ${i}`,
          company: 'Acme',
          dateSaved: '2026-01-01',
        })),
      )
      const started = Date.now()
      const res = await call('GET', '/jobs')
      expect(res.json()).toHaveLength(300)
      expect(Date.now() - started).toBeLessThan(3000)
    })
  })

  describe('changing', () => {
    it('keeps everything when the change is empty', async () => {
      const job = await add({ notes: 'keep me' })
      const res = await call('PATCH', `/jobs/${job.id}`, {})
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ position: base.position, notes: 'keep me' })
    })

    it('treats a missing body like an empty change', async () => {
      const job = await add()
      expect((await call('PATCH', `/jobs/${job.id}`)).statusCode).toBe(200)
    })

    it('cannot move a job to another account or change its id or creation time', async () => {
      const other = await ctx.signUp('other@example.com')
      const job = await add()
      const res = await call('PATCH', `/jobs/${job.id}`, {
        userId: other.userId,
        id: unknownId(),
        createdAt: '2000-01-01T00:00:00Z',
        notes: 'x',
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().id).toBe(job.id)
      expect(res.json().createdAt).toBe(job.createdAt)
      expect((await call('GET', `/jobs/${job.id}`, undefined, other.cookie)).statusCode).toBe(404)
      const [row] = await ctx.database.db.select().from(jobs).where(eq(jobs.id, job.id))
      expect(row!.userId).toBe(ctx.userId)
    })

    it.each([
      ['an empty position', { position: '' }],
      ['an empty company', { company: ' ' }],
      ['a null position', { position: null }],
      ['a status that does not exist', { status: 'hired' }],
      ['a null status', { status: null }],
      ['a null notes', { notes: null }],
      ['a date in the far future', { dateApplied: '2999-01-01' }],
      ['a malformed date', { dateApplied: '2026-02-30' }],
      ['a long salary', { salary: 'x'.repeat(101) }],
    ])('refuses %s without changing anything', async (_name, change) => {
      const job = await add({ notes: 'before' })
      expect((await call('PATCH', `/jobs/${job.id}`, change)).statusCode).toBe(400)
      expect((await call('GET', `/jobs/${job.id}`)).json()).toMatchObject({
        position: base.position,
        notes: 'before',
        status: 'to_apply',
      })
    })

    it('clears the optional fields with null', async () => {
      const cv = (await call('POST', '/cvs', {})).json()
      const job = await add({ cvId: cv.id, type: 'remote', dateApplied: '2026-01-01' })
      const res = await call('PATCH', `/jobs/${job.id}`, {
        cvId: null,
        type: null,
        dateApplied: null,
      })
      expect(res.json()).toMatchObject({ cvId: null, type: null, dateApplied: null })
    })

    it('answers 404 for a CV or letter that does not exist or belongs to someone else, and changes nothing', async () => {
      const other = await ctx.signUp('other@example.com')
      const theirCv = (await call('POST', '/cvs', {}, other.cookie)).json()
      const job = await add()
      for (const change of [
        { cvId: unknownId() },
        { cvId: theirCv.id },
        { coverLetterId: unknownId() },
      ]) {
        expect(
          (await call('PATCH', `/jobs/${job.id}`, change)).statusCode,
          JSON.stringify(change),
        ).toBe(404)
      }
      expect((await call('GET', `/jobs/${job.id}`)).json()).toMatchObject({
        cvId: null,
        coverLetterId: null,
      })
    })

    it('parallel changes to different fields all succeed and none produces a server error', async () => {
      const job = await add()
      const results = await inParallel(10, (i) =>
        call('PATCH', `/jobs/${job.id}`, { notes: `note ${i}`, location: `place ${i}` }),
      )
      expect(countBy(results, (r) => r.statusCode)).toEqual({ '200': 10 })
      const final = (await call('GET', `/jobs/${job.id}`)).json()
      expect(final.notes).toMatch(/^note \d$/)
    })

    it('a change racing a delete ends in 200 or 404, never 500', async () => {
      const job = await add()
      const results = await Promise.all([
        call('PATCH', `/jobs/${job.id}`, { notes: 'x' }),
        call('DELETE', `/jobs/${job.id}`),
      ])
      expect(results.every((r) => [200, 204, 404].includes(r.statusCode))).toBe(true)
    })
  })

  describe('ownership and ids', () => {
    it("answers another account's job exactly like an unknown one, for read, change and delete", async () => {
      const other = await ctx.signUp('other@example.com')
      const theirs = (
        await call('POST', '/jobs', { ...base, company: 'Secret Corp' }, other.cookie)
      ).json()
      for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
        const body = method === 'PATCH' ? { notes: 'hacked' } : undefined
        const mine = await call(method, `/jobs/${theirs.id}`, body)
        const nothing = await call(method, `/jobs/${unknownId()}`, body)
        expect(mine.statusCode).toBe(404)
        expect(mine.payload).toBe(nothing.payload)
      }
      expect((await call('GET', `/jobs/${theirs.id}`, undefined, other.cookie)).json().notes).toBe(
        '',
      )
    })

    it('deletes once, then answers 404', async () => {
      const job = await add()
      expect((await call('DELETE', `/jobs/${job.id}`)).statusCode).toBe(204)
      expect((await call('DELETE', `/jobs/${job.id}`)).statusCode).toBe(404)
      expect((await call('GET', '/jobs')).json()).toEqual([])
    })

    it('needs a session for every job route', async () => {
      const id = unknownId()
      for (const [method, url] of [
        ['GET', '/jobs'],
        ['POST', '/jobs'],
        ['GET', `/jobs/${id}`],
        ['PATCH', `/jobs/${id}`],
        ['DELETE', `/jobs/${id}`],
      ] as const) {
        expect((await call(method, url, {}, null)).statusCode, `${method} ${url}`).toBe(401)
      }
    })
  })
})
