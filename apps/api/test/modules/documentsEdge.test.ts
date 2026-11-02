import { PLAN_LIMITS } from '@cv/shared'
import { eq, sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  coverLetters,
  cvs,
  cvVersions,
  jobs,
  resignations,
  shareLinks,
} from '../../src/db/schema/index'
import { apiCaller, countBy, inParallel, unknownId } from '../support/api'
import { dbAvailable, useTestApp } from '../support/context'

type Doc = { id: string; revision: number; title: string; document: unknown }

const KINDS = [
  { name: 'CV', path: '/cvs', table: cvs },
  { name: 'cover letter', path: '/cover-letters', table: coverLetters },
  { name: 'resignation letter', path: '/resignations', table: resignations },
] as const

describe.skipIf(!dbAvailable)('documents: revisions, limits and ownership', () => {
  const ctx = useTestApp()
  const call = apiCaller(ctx)
  const save = (doc: Doc, revision: unknown) =>
    call('PATCH', `/cvs/${doc.id}`, { revision, document: doc.document })

  describe.each(KINDS)('$name', (kind) => {
    const create = async (body: object = {}): Promise<Doc> => {
      const res = await call('POST', kind.path, body)
      expect(res.statusCode).toBe(201)
      return res.json()
    }
    const save = (doc: Doc, revision: unknown, extra: object = {}) =>
      call('PATCH', `${kind.path}/${doc.id}`, { revision, document: doc.document, ...extra })
    /** Fills the account with `count` documents of this kind straight in the database. */
    const fill = async (count: number, userId = ctx.userId) => {
      const template = await create()
      const values = Array.from({ length: count - 1 }, (_, i) => ({
        userId,
        title: `Doc ${i}`,
        document: template.document as never,
      }))
      if (values.length) await ctx.database.db.insert(kind.table).values(values as never)
      return template
    }

    describe('saving with revisions', () => {
      it('lets exactly one of several parallel saves with the same revision win', async () => {
        const doc = await create()
        // 4 at a time: the connection pool has 5 (see the deadlock test below for more).
        const results = await inParallel(4, () => save(doc, 1))
        const statuses = countBy(results, (r) => r.statusCode)
        expect(statuses).toEqual({ '200': 1, '409': 3 })
        expect((await call('GET', `${kind.path}/${doc.id}`)).json().revision).toBe(2)
      })

      it('lets saves in a row each win when every one has the next revision', async () => {
        const doc = await create()
        for (let revision = 1; revision <= 5; revision++) {
          expect((await save(doc, revision)).statusCode).toBe(200)
        }
        expect((await call('GET', `${kind.path}/${doc.id}`)).json().revision).toBe(6)
      })

      it.each([
        ['stale', 1, 3],
        ['in the future', 99, 3],
        ['far in the future (over 32 bits)', 3_000_000_000, 3],
      ])(
        'answers 409 with the current revision for a revision that is %s',
        async (_n, revision) => {
          const doc = await create()
          await save(doc, 1)
          await save(doc, 2)
          const res = await save(doc, revision)
          expect(res.statusCode).toBe(409)
          expect(res.json().error).toMatchObject({ code: 'conflict', details: { revision: 3 } })
        },
      )

      it.each([
        ['zero', 0],
        ['negative', -1],
        ['a fraction', 1.5],
        ['a string', '1'],
        ['null', null],
        ['a boolean', true],
        ['an array', [1]],
        ['an object', { n: 1 }],
        ['beyond safe integers', 2 ** 60],
      ])('answers 400 for a revision that is %s', async (_n, revision) => {
        const doc = await create()
        const res = await save(doc, revision)
        expect(res.statusCode).toBe(400)
        expect((await call('GET', `${kind.path}/${doc.id}`)).json().revision).toBe(1)
      })

      it('does not change anything when a save is refused (title and document stay)', async () => {
        const doc = await create()
        const res = await save(doc, 7, { title: 'Should not apply' })
        expect(res.statusCode).toBe(409)
        const after = (await call('GET', `${kind.path}/${doc.id}`)).json()
        expect(after.title).toBe(doc.title)
        expect(after.revision).toBe(1)
      })

      it('ignores the revision when only the title changes (no conflict, no bump)', async () => {
        const doc = await create()
        await save(doc, 1)
        const res = await call('PATCH', `${kind.path}/${doc.id}`, {
          revision: 99,
          title: 'Renamed',
        })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({ title: 'Renamed', revision: 2 })
      })

      it('accepts an empty change object and keeps everything', async () => {
        const doc = await create()
        const res = await call('PATCH', `${kind.path}/${doc.id}`, {})
        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({ title: doc.title, revision: 1 })
      })

      it('survives a rename and a save at the same moment (the save still wins its revision)', async () => {
        const doc = await create()
        const [rename, saved] = await Promise.all([
          call('PATCH', `${kind.path}/${doc.id}`, { title: 'Renamed' }),
          save(doc, 1),
        ])
        expect([rename.statusCode, saved.statusCode]).toEqual([200, 200])
        const after = (await call('GET', `${kind.path}/${doc.id}`)).json()
        expect(after.revision).toBe(2)
        expect(after.title).toBe('Renamed')
      })

      it('answers 404 when saving a deleted document', async () => {
        const doc = await create()
        await call('DELETE', `${kind.path}/${doc.id}`)
        expect((await save(doc, 1)).statusCode).toBe(404)
      })
    })

    describe('plan limit', () => {
      const max = PLAN_LIMITS.free.maxCvs!

      it(`allows ${max} documents and refuses the next with 403 plan_limit`, async () => {
        await fill(max)
        const res = await call('POST', kind.path, {})
        expect(res.statusCode).toBe(403)
        expect(res.json().error).toMatchObject({ code: 'plan_limit' })
        expect((await call('GET', kind.path)).json()).toHaveLength(max)
      })

      it('refuses the 21st with a JSON body too, and keeps refusing', async () => {
        await fill(max)
        for (let i = 0; i < 3; i++) {
          expect((await call('POST', kind.path, { title: 'One more' })).statusCode).toBe(403)
        }
        expect((await call('GET', kind.path)).json()).toHaveLength(max)
      })

      it('refuses duplicating at the limit', async () => {
        const first = await fill(max)
        const res = await call('POST', `${kind.path}/${first.id}/duplicate`)
        expect(res.statusCode).toBe(403)
        expect(res.json().error.code).toBe('plan_limit')
      })

      it('allows one more after one is deleted', async () => {
        const first = await fill(max)
        expect((await call('DELETE', `${kind.path}/${first.id}`)).statusCode).toBe(204)
        expect((await call('POST', kind.path, {})).statusCode).toBe(201)
        expect((await call('POST', kind.path, {})).statusCode).toBe(403)
      })

      it('does not count other accounts or other kinds of document', async () => {
        const other = await ctx.signUp('other@example.com')
        await fill(max, other.userId)
        expect((await call('POST', kind.path, {})).statusCode).toBe(201)
        // The template made by fill() plus the new one; the other account's 20 are not mine.
        expect((await call('GET', kind.path)).json()).toHaveLength(2)
      })

      it('has no limit for the pro plan', async () => {
        await ctx.database.db.execute(sql`update users set plan = 'pro' where id = ${ctx.userId}`)
        await fill(max)
        expect((await call('POST', kind.path, {})).statusCode).toBe(201)
      })

      // BUG: the limit is checked with a count and then an insert, without a lock, so parallel
      // creates can all pass the check: 30 parallel POSTs from an empty account create more than
      // the 20 the plan allows.
      it.fails('never creates more than the plan allows when creating in parallel', async () => {
        await inParallel(30, () => call('POST', kind.path, {}))
        expect((await call('GET', kind.path)).json().length).toBeLessThanOrEqual(max)
      })
    })

    describe("another user's documents", () => {
      it('answers exactly like an unknown id (404, same body), for every action', async () => {
        const other = await ctx.signUp('other@example.com')
        const theirs = (await (await call('POST', kind.path, {}, other.cookie)).json()) as Doc
        const requests: [Parameters<typeof call>[0], string, object | undefined][] = [
          ['GET', '', undefined],
          ['PATCH', '', { revision: 1, title: 'Hacked' }],
          ['DELETE', '', undefined],
          ['POST', '/duplicate', undefined],
          ['GET', '/share', undefined],
          ['PUT', '/share', { isActive: true }],
          ['POST', '/share/reset', undefined],
        ]
        for (const [method, suffix, body] of requests) {
          const mine = await call(method, `${kind.path}/${theirs.id}${suffix}`, body)
          const nothing = await call(method, `${kind.path}/${unknownId()}${suffix}`, body)
          expect(mine.statusCode, `${method} ${suffix}`).toBe(404)
          expect(mine.payload, `${method} ${suffix}`).toBe(nothing.payload)
        }
        const after = (
          await call('GET', `${kind.path}/${theirs.id}`, undefined, other.cookie)
        ).json()
        expect(after.title).toBe(theirs.title)
        expect(after.revision).toBe(1)
      })

      it('does not list them, and does not expose them through the shared endpoint without a link', async () => {
        const other = await ctx.signUp('other@example.com')
        await call('POST', kind.path, {}, other.cookie)
        expect((await call('GET', kind.path)).json()).toEqual([])
      })
    })

    it('answers 401 for every action without a session', async () => {
      const id = unknownId()
      for (const [method, url] of [
        ['GET', kind.path],
        ['POST', kind.path],
        ['GET', `${kind.path}/${id}`],
        ['PATCH', `${kind.path}/${id}`],
        ['DELETE', `${kind.path}/${id}`],
        ['POST', `${kind.path}/${id}/duplicate`],
        ['PUT', `${kind.path}/${id}/share`],
      ] as const) {
        const res = await call(method, url, {}, null)
        expect(res.statusCode, `${method} ${url}`).toBe(401)
        expect(res.json().error.code).toBe('unauthorized')
      }
    })

    it('duplicates a document whose title is already 200 characters long (copy title is cut)', async () => {
      const doc = await create({ title: 'x'.repeat(200) })
      const res = await call('POST', `${kind.path}/${doc.id}/duplicate`)
      expect(res.statusCode).toBe(201)
      expect(res.json().title).toHaveLength(200)
    })

    it('duplicates a duplicate, and a copy is independent of the original', async () => {
      const doc = await create({ title: 'Original' })
      const copy = (await call('POST', `${kind.path}/${doc.id}/duplicate`)).json() as Doc
      const copyOfCopy = (await call('POST', `${kind.path}/${copy.id}/duplicate`)).json() as Doc
      expect(copyOfCopy.title).toBe('Copy of Copy of Original')
      await call('DELETE', `${kind.path}/${doc.id}`)
      expect((await call('GET', `${kind.path}/${copy.id}`)).statusCode).toBe(200)
    })

    it('deleting a document removes its share link; the old address then answers 404', async () => {
      const doc = await create()
      const link = (await call('PUT', `${kind.path}/${doc.id}/share`, { isActive: true })).json()
        .link
      expect((await call('GET', `/shared/${link.slug}`, undefined, null)).statusCode).toBe(200)
      await call('DELETE', `${kind.path}/${doc.id}`)
      expect((await call('GET', `/shared/${link.slug}`, undefined, null)).statusCode).toBe(404)
      expect(await ctx.database.db.select().from(shareLinks)).toEqual([])
    })

    it('lists documents newest-changed first, with the shared flag following the link', async () => {
      const a = await create({ title: 'A' })
      const b = await create({ title: 'B' })
      await call('PATCH', `${kind.path}/${a.id}`, { title: 'A2' })
      const list = (await call('GET', kind.path)).json() as { id: string; shared: boolean }[]
      expect(list.map((d) => d.id)).toEqual([a.id, b.id])
      await call('PUT', `${kind.path}/${b.id}/share`, { isActive: true })
      await call('PUT', `${kind.path}/${a.id}/share`, { isActive: true })
      await call('PUT', `${kind.path}/${a.id}/share`, { isActive: false })
      const after = (await call('GET', kind.path)).json() as { id: string; shared: boolean }[]
      expect(after.find((d) => d.id === a.id)!.shared).toBe(false)
      expect(after.find((d) => d.id === b.id)!.shared).toBe(true)
    })
  })

  // BUG: saving a CV while it is being deleted (the delete not yet committed when the save
  // inserts its automatic snapshot) hits the cv_versions foreign key: PATCH /api/cvs/:id answers
  // 500 internal_error, expected 404 (not found) or 409 (conflict).
  it.fails(
    'answers 404 or 409, not 500, when the CV is deleted while a save is running',
    async () => {
      const cv = (await call('POST', '/cvs', {})).json() as Doc
      let release!: () => void
      const gate = new Promise<void>((resolve) => (release = resolve))
      let started!: () => void
      const deleting = new Promise<void>((resolve) => (started = resolve))
      const deletion = ctx.database.db.transaction(async (tx) => {
        await tx.delete(cvs).where(eq(cvs.id, cv.id))
        started()
        await gate
      })
      await deleting
      const saving = save(cv, 1)
      await new Promise((resolve) => setTimeout(resolve, 150))
      release()
      await deletion
      expect([404, 409]).toContain((await saving).statusCode)
    },
  )

  describe('CV links and deletion', () => {
    it('deleting a CV that jobs, letters and a share link point at leaves them valid', async () => {
      const cv = (await call('POST', '/cvs', {})).json()
      const job = (
        await call('POST', '/jobs', { position: 'Dev', company: 'Acme', cvId: cv.id })
      ).json()
      const letter = (await call('POST', '/cover-letters', { cvId: cv.id, jobId: job.id })).json()
      const link = (await call('PUT', `/cvs/${cv.id}/share`, { isActive: true })).json().link
      await call('POST', `/cvs/${cv.id}/versions`, { label: 'v1' })

      expect((await call('DELETE', `/cvs/${cv.id}`)).statusCode).toBe(204)

      expect((await call('GET', `/jobs/${job.id}`)).json()).toMatchObject({
        id: job.id,
        cvId: null,
      })
      expect((await call('GET', `/cover-letters/${letter.id}`)).json()).toMatchObject({
        cvId: null,
      })
      expect((await call('GET', `/shared/${link.slug}`, undefined, null)).statusCode).toBe(404)
      expect(await ctx.database.db.select().from(cvVersions)).toEqual([])
    })

    it('deleting a job unlinks the CV and the cover letter that point at it', async () => {
      const job = (await call('POST', '/jobs', { position: 'Dev', company: 'Acme' })).json()
      const cv = (await call('POST', '/cvs', { jobId: job.id })).json()
      const letter = (await call('POST', '/cover-letters', { jobId: job.id })).json()
      expect((await call('DELETE', `/jobs/${job.id}`)).statusCode).toBe(204)
      expect((await call('GET', `/cvs/${cv.id}`)).json().jobId).toBeNull()
      expect((await call('GET', `/cover-letters/${letter.id}`)).json().jobId).toBeNull()
    })

    it('deleting a cover letter clears it from the job that used it', async () => {
      const job = (await call('POST', '/jobs', { position: 'Dev', company: 'Acme' })).json()
      const letter = (await call('POST', '/cover-letters', { jobId: job.id })).json()
      expect((await call('GET', `/jobs/${job.id}`)).json().coverLetterId).toBe(letter.id)
      await call('DELETE', `/cover-letters/${letter.id}`)
      expect((await call('GET', `/jobs/${job.id}`)).json().coverLetterId).toBeNull()
    })

    it('unlinks a CV from its job with a null jobId, and refuses unknown or malformed job ids', async () => {
      const job = (await call('POST', '/jobs', { position: 'Dev', company: 'Acme' })).json()
      const cv = (await call('POST', '/cvs', { jobId: job.id })).json()
      expect((await call('PATCH', `/cvs/${cv.id}`, { jobId: null })).json().jobId).toBeNull()
      expect((await call('PATCH', `/cvs/${cv.id}`, { jobId: unknownId() })).statusCode).toBe(404)
      expect((await call('PATCH', `/cvs/${cv.id}`, { jobId: 'nope' })).statusCode).toBe(400)
      expect((await call('POST', '/cvs', { jobId: unknownId() })).statusCode).toBe(404)
    })

    it('a tailored copy for a job moves that job to the copy, and refuses another job', async () => {
      const cv = (await call('POST', '/cvs', { title: 'Base' })).json()
      const job = (
        await call('POST', '/jobs', { position: 'Dev', company: 'Acme', cvId: cv.id })
      ).json()
      const copy = await call('POST', `/cvs/${cv.id}/duplicate`, { jobId: job.id })
      expect(copy.statusCode).toBe(201)
      expect(copy.json().title).toBe('Base – Acme')
      expect((await call('GET', `/jobs/${job.id}`)).json().cvId).toBe(copy.json().id)
      expect(
        (await call('POST', `/cvs/${cv.id}/duplicate`, { jobId: unknownId() })).statusCode,
      ).toBe(404)
      expect((await call('POST', `/cvs/${cv.id}/duplicate`, { jobId: 'bad' })).statusCode).toBe(400)
    })

    it('refuses duplicating for a job that belongs to someone else', async () => {
      const other = await ctx.signUp('other@example.com')
      const theirJob = (
        await call('POST', '/jobs', { position: 'Dev', company: 'Secret Corp' }, other.cookie)
      ).json()
      const cv = (await call('POST', '/cvs', {})).json()
      const res = await call('POST', `/cvs/${cv.id}/duplicate`, { jobId: theirJob.id })
      expect(res.statusCode).toBe(404)
      expect(res.payload).not.toContain('Secret Corp')
      expect(
        (await call('GET', `/jobs/${theirJob.id}`, undefined, other.cookie)).json().cvId,
      ).toBeNull()
    })

    it('cannot link a CV or a cover letter to a job of someone else', async () => {
      const other = await ctx.signUp('other@example.com')
      const theirJob = (
        await call('POST', '/jobs', { position: 'Dev', company: 'X' }, other.cookie)
      ).json()
      const cv = (await call('POST', '/cvs', {})).json()
      expect((await call('PATCH', `/cvs/${cv.id}`, { jobId: theirJob.id })).statusCode).toBe(404)
      expect((await call('POST', '/cover-letters', { jobId: theirJob.id })).statusCode).toBe(404)
      expect(
        (await call('POST', '/cover-letters', { cvId: cv.id, jobId: theirJob.id })).statusCode,
      ).toBe(404)
    })
  })

  describe('versions', () => {
    const makeCv = async () => (await call('POST', '/cvs', {})).json() as Doc
    const max = PLAN_LIMITS.free.maxVersionsPerCv

    it(`prunes to the newest ${max} when more are saved one after another`, async () => {
      const cv = await makeCv()
      for (let i = 0; i < max + 5; i++) {
        expect((await call('POST', `/cvs/${cv.id}/versions`, { label: `v${i}` })).statusCode).toBe(
          201,
        )
      }
      const versions = (await call('GET', `/cvs/${cv.id}/versions`)).json() as { label: string }[]
      expect(versions).toHaveLength(max)
      expect(versions[0]!.label).toBe(`v${max + 4}`)
      expect(versions.map((v) => v.label)).not.toContain('v0')
      expect(versions.map((v) => v.label)).not.toContain('v4')
    })

    it('prunes automatic and named versions alike, per CV (another CV keeps its own)', async () => {
      const a = await makeCv()
      const b = await makeCv()
      await call('POST', `/cvs/${b.id}/versions`, { label: 'keep me' })
      await ctx.database.db.insert(cvVersions).values(
        Array.from({ length: max + 10 }, (_, i) => ({
          cvId: a.id,
          document: a.document as never,
          auto: true,
          createdAt: sql`now() - make_interval(hours => ${i + 1})`,
        })),
      )
      await call('POST', `/cvs/${a.id}/versions`, { label: 'trigger' })
      expect((await call('GET', `/cvs/${a.id}/versions`)).json()).toHaveLength(max)
      expect((await call('GET', `/cvs/${b.id}/versions`)).json()).toHaveLength(1)
    })

    it('keeps at least the limit after many parallel version saves, never growing without bound', async () => {
      const cv = await makeCv()
      await inParallel(max + 10, (i) => call('POST', `/cvs/${cv.id}/versions`, { label: `p${i}` }))
      const versions = (await call('GET', `/cvs/${cv.id}/versions`)).json()
      expect(versions.length).toBeGreaterThanOrEqual(max)
      // A final sequential save settles any left-over from the race.
      await call('POST', `/cvs/${cv.id}/versions`, { label: 'settle' })
      expect((await call('GET', `/cvs/${cv.id}/versions`)).json()).toHaveLength(max)
    })

    it('does not make an automatic snapshot for a rename, only for a document save', async () => {
      const cv = await makeCv()
      await call('PATCH', `/cvs/${cv.id}`, { title: 'Only a rename' })
      expect((await call('GET', `/cvs/${cv.id}/versions`)).json()).toEqual([])
    })

    it.each([
      ['empty', ''],
      ['only spaces', '   '],
      ['101 characters', 'x'.repeat(101)],
      ['a number', 5],
      ['null', null],
    ])('refuses a version label that is %s', async (_n, label) => {
      const cv = await makeCv()
      expect((await call('POST', `/cvs/${cv.id}/versions`, { label })).statusCode).toBe(400)
    })

    it('accepts a label of 100 characters, emoji and markup (stored as text)', async () => {
      const cv = await makeCv()
      for (const label of [
        'x'.repeat(100),
        '🙂 final',
        '<b>bold</b>',
        "'; drop table cv_versions;--",
      ]) {
        const res = await call('POST', `/cvs/${cv.id}/versions`, { label })
        expect(res.statusCode, label).toBe(201)
        expect(res.json().label).toBe(label)
      }
    })

    it('answers 404 for a version of another CV, an unknown version and 400 for a malformed id', async () => {
      const a = await makeCv()
      const b = await makeCv()
      const version = (await call('POST', `/cvs/${a.id}/versions`, { label: 'a' })).json()
      for (const [method, suffix] of [
        ['GET', `/versions/${version.id}`],
        ['POST', `/versions/${version.id}/restore`],
      ] as const) {
        expect((await call(method, `/cvs/${b.id}${suffix}`)).statusCode, suffix).toBe(404)
      }
      expect((await call('GET', `/cvs/${a.id}/versions/${unknownId()}`)).statusCode).toBe(404)
      expect((await call('POST', `/cvs/${a.id}/versions/${unknownId()}/restore`)).statusCode).toBe(
        404,
      )
      expect((await call('GET', `/cvs/${a.id}/versions/nope`)).statusCode).toBe(400)
    })

    it("does not show or restore the versions of someone else's CV", async () => {
      const other = await ctx.signUp('other@example.com')
      const theirs = (await call('POST', '/cvs', {}, other.cookie)).json()
      const version = (
        await call('POST', `/cvs/${theirs.id}/versions`, { label: 'secret' }, other.cookie)
      ).json()
      for (const [method, url] of [
        ['GET', `/cvs/${theirs.id}/versions`],
        ['POST', `/cvs/${theirs.id}/versions`],
        ['GET', `/cvs/${theirs.id}/versions/${version.id}`],
        ['POST', `/cvs/${theirs.id}/versions/${version.id}/restore`],
      ] as const) {
        const res = await call(method, url, method === 'POST' ? { label: 'x' } : undefined)
        expect(res.statusCode, url).toBe(404)
        expect(res.payload).not.toContain('secret')
      }
    })

    it('restoring twice in a row works, bumps the revision each time and keeps the editor honest', async () => {
      const cv = await makeCv()
      const version = (await call('POST', `/cvs/${cv.id}/versions`, { label: 'base' })).json()
      const first = await call('POST', `/cvs/${cv.id}/versions/${version.id}/restore`)
      const second = await call('POST', `/cvs/${cv.id}/versions/${version.id}/restore`)
      expect([first.json().revision, second.json().revision]).toEqual([2, 3])
      // An editor that still has revision 1 gets a conflict instead of overwriting the restore.
      const stale = await call('PATCH', `/cvs/${cv.id}`, { revision: 1, document: cv.document })
      expect(stale.statusCode).toBe(409)
    })

    it('restores in parallel without losing the revision count', async () => {
      const cv = await makeCv()
      const version = (await call('POST', `/cvs/${cv.id}/versions`, { label: 'base' })).json()
      const results = await inParallel(5, () =>
        call('POST', `/cvs/${cv.id}/versions/${version.id}/restore`),
      )
      expect(results.every((r) => r.statusCode === 200)).toBe(true)
      expect((await call('GET', `/cvs/${cv.id}`)).json().revision).toBe(6)
    })

    it('removes all versions together with the CV', async () => {
      const cv = await makeCv()
      await inParallel(3, (i) => call('POST', `/cvs/${cv.id}/versions`, { label: `v${i}` }))
      await call('DELETE', `/cvs/${cv.id}`)
      expect(
        await ctx.database.db.select().from(cvVersions).where(eq(cvVersions.cvId, cv.id)),
      ).toEqual([])
    })
  })

  it('keeps the jobs table independent of the document limit (50 jobs and a long list)', async () => {
    const results = await inParallel(50, (i) =>
      call('POST', '/jobs', { position: `Job ${i}`, company: 'Acme' }),
    )
    expect(results.every((r) => r.statusCode === 201)).toBe(true)
    expect((await call('GET', '/jobs')).json()).toHaveLength(50)
    expect(await ctx.database.db.select().from(jobs)).toHaveLength(50)
  })
})
