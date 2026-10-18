import { createExampleCv, CvRecordSchema, PLAN_LIMITS, type CvRecord } from '@cv/shared'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { cvs, cvVersions, users } from '../../src/db/schema/index'
import { dbAvailable, useTestApp } from '../support/context'
import { TEST_DATABASE_URL } from '../support/env'

describe.skipIf(!dbAvailable)('CV API', () => {
  const ctx = useTestApp()
  const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    ctx.app.inject({ method, url: `/api${url}`, payload, headers: { cookie: ctx.cookie } })
  const create = async (payload: object = {}) => {
    const res = await call('POST', '/cvs', payload)
    expect(res.statusCode).toBe(201)
    return CvRecordSchema.parse(res.json())
  }

  it('creates an empty CV, lists and reads it', async () => {
    const cv = await create()
    expect(cv).toMatchObject({ title: 'Untitled CV', revision: 1, professionId: null })
    expect(cv.document.sections.map((s) => s.type)).toContain('experience')

    const list = (await call('GET', '/cvs')).json()
    expect(list).toEqual([expect.objectContaining({ id: cv.id, type: 'cv', title: 'Untitled CV' })])
    expect(list[0].document).toBeUndefined()

    expect((await call('GET', `/cvs/${cv.id}`)).json()).toEqual(cv)
  })

  it('names a CV after its profession and stores a given document', async () => {
    const document = createExampleCv('designer')
    const cv = await create({ professionId: 'designer', document })
    expect(cv.title).toBe('Designer CV')
    expect(cv.document).toEqual(document)
  })

  it('rejects an invalid document with the validation issues', async () => {
    const document = { ...createExampleCv('designer'), design: { accentColor: 'teal' } }
    const res = await call('POST', '/cvs', { document })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('validation_error')
    expect(res.json().error.details.length).toBeGreaterThan(0)
  })

  it('refuses header text longer than the page can hold', async () => {
    const cv = await create()
    const header = { ...cv.document.header, phone: '0'.repeat(5000) }
    const res = await call('PATCH', `/cvs/${cv.id}`, {
      revision: 1,
      document: { ...cv.document, header },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('validation_error')
  })

  it('saves changes and increments the revision', async () => {
    const cv = await create()
    const document = { ...cv.document, header: { ...cv.document.header, name: 'Maria' } }
    const res = await call('PATCH', `/cvs/${cv.id}`, { revision: 1, title: 'My CV', document })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ title: 'My CV', revision: 2 })
    expect((res.json() as CvRecord).document.header.name).toBe('Maria')
    expect(new Date(res.json().updatedAt) >= new Date(cv.updatedAt)).toBe(true)
  })

  it('rejects a save based on an old revision (409) and reports the current one', async () => {
    const cv = await create()
    await call('PATCH', `/cvs/${cv.id}`, { revision: 1, document: cv.document })
    const res = await call('PATCH', `/cvs/${cv.id}`, { revision: 1, document: cv.document })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatchObject({ code: 'conflict', details: { revision: 2 } })
  })

  it('renames without a revision and without changing it', async () => {
    const cv = await create()
    const res = await call('PATCH', `/cvs/${cv.id}`, { title: 'Renamed' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ title: 'Renamed', revision: 1 })
    // An editor still holding revision 1 can keep saving.
    const save = await call('PATCH', `/cvs/${cv.id}`, { revision: 1, document: cv.document })
    expect(save.statusCode).toBe(200)
  })

  it('requires a revision when saving the document', async () => {
    const cv = await create()
    const res = await call('PATCH', `/cvs/${cv.id}`, { document: cv.document })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for unknown, malformed or deleted CVs', async () => {
    expect((await call('GET', '/cvs/00000000-0000-0000-0000-000000000000')).statusCode).toBe(404)
    expect((await call('GET', '/cvs/not-a-uuid')).statusCode).toBe(400)
    const cv = await create()
    expect((await call('DELETE', `/cvs/${cv.id}`)).statusCode).toBe(204)
    expect((await call('GET', `/cvs/${cv.id}`)).statusCode).toBe(404)
    expect((await call('DELETE', `/cvs/${cv.id}`)).statusCode).toBe(404)
  })

  it("does not show another user's CVs", async () => {
    const [other] = await ctx.database.db
      .insert(users)
      .values({ email: 'other@example.com' })
      .returning()
    const [theirs] = await ctx.database.db
      .insert(cvs)
      .values({ userId: other!.id, title: 'Theirs', document: createExampleCv('academic') })
      .returning()
    expect((await call('GET', '/cvs')).json()).toEqual([])
    expect((await call('GET', `/cvs/${theirs!.id}`)).statusCode).toBe(404)
    expect(
      (await call('PATCH', `/cvs/${theirs!.id}`, { revision: 1, title: 'x' })).statusCode,
    ).toBe(404)
    expect((await call('DELETE', `/cvs/${theirs!.id}`)).statusCode).toBe(404)
  })

  it('duplicates a CV', async () => {
    const cv = await create({
      title: 'Frontend CV',
      document: createExampleCv('software-developer'),
    })
    const res = await call('POST', `/cvs/${cv.id}/duplicate`)
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({
      title: 'Copy of Frontend CV',
      revision: 1,
      document: cv.document,
    })
    expect(res.json().id).not.toBe(cv.id)
  })

  it('enforces the free plan CV limit', async () => {
    await create()
    const max = PLAN_LIMITS.free.maxCvs!
    await ctx.database.db.insert(cvs).values(
      Array.from({ length: max - 1 }, (_, i) => ({
        userId: ctx.userId,
        title: `CV ${i}`,
        document: createExampleCv('designer'),
      })),
    )
    const res = await call('POST', '/cvs')
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('plan_limit')
  })

  describe('versions', () => {
    it('keeps the previous content as an automatic snapshot, at most every 10 minutes', async () => {
      const cv = await create()
      const rename = (name: string, revision: number) =>
        call('PATCH', `/cvs/${cv.id}`, {
          revision,
          document: { ...cv.document, header: { ...cv.document.header, name } },
        })
      await rename('A', 1)
      await rename('B', 2)
      let versions = (await call('GET', `/cvs/${cv.id}/versions`)).json()
      expect(versions).toHaveLength(1)
      expect(versions[0]).toMatchObject({ auto: true, label: null })

      // An older snapshot no longer counts as recent.
      await ctx.database.db
        .update(cvVersions)
        .set({ createdAt: sql`now() - interval '11 minutes'` })
      await rename('C', 3)
      versions = (await call('GET', `/cvs/${cv.id}/versions`)).json()
      expect(versions).toHaveLength(2)
    })

    it('saves a named version and restores it', async () => {
      const cv = await create({ document: createExampleCv('healthcare') })
      const saved = await call('POST', `/cvs/${cv.id}/versions`, { label: 'Sent to Acme' })
      expect(saved.statusCode).toBe(201)
      expect(saved.json()).toMatchObject({ label: 'Sent to Acme', auto: false })

      const changed = { ...cv.document, header: { ...cv.document.header, name: 'Changed' } }
      await call('PATCH', `/cvs/${cv.id}`, { revision: 1, document: changed })

      const version = (await call('GET', `/cvs/${cv.id}/versions/${saved.json().id}`)).json()
      expect(version.document.header.name).toBe(cv.document.header.name)

      const restored = await call('POST', `/cvs/${cv.id}/versions/${saved.json().id}/restore`)
      expect(restored.statusCode).toBe(200)
      expect(restored.json()).toMatchObject({
        revision: 3,
        document: { header: { name: cv.document.header.name } },
      })

      const labels = (await call('GET', `/cvs/${cv.id}/versions`))
        .json()
        .map((v: { label: string | null }) => v.label)
      expect(labels).toContain('Before restore')
    })

    it('keeps at most the plan limit of versions', async () => {
      const cv = await create()
      const max = PLAN_LIMITS.free.maxVersionsPerCv
      await ctx.database.db.insert(cvVersions).values(
        Array.from({ length: max }, (_, i) => ({
          cvId: cv.id,
          document: cv.document,
          createdAt: sql`now() - make_interval(hours => ${i + 1})`,
        })),
      )
      await call('POST', `/cvs/${cv.id}/versions`, { label: 'Newest' })
      const versions = (await call('GET', `/cvs/${cv.id}/versions`)).json()
      expect(versions).toHaveLength(max)
      expect(versions[0].label).toBe('Newest')
    })
  })

  it('lists the professions', async () => {
    const res = await call('GET', '/professions')
    expect(res.json().map((p: { id: string }) => p.id)).toContain('software-developer')
  })
})

describe.skipIf(!dbAvailable)('database not ready yet', () => {
  it('answers 503 while migrations fail, then works once they succeed', async () => {
    const { buildApp } = await import('../../src/app')
    const { createDb } = await import('../../src/db/client')
    const { createMigrator } = await import('../../src/db/migrate')
    const { createLocalStorage } = await import('../../src/infra/storage/index')
    const database = createDb(TEST_DATABASE_URL)
    let reachable = false
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      database,
      storage: createLocalStorage('/tmp/unused'),
      ensureMigrated: createMigrator(async () => {
        if (!reachable) throw new Error('connect ECONNREFUSED')
      }),
    })

    const down = await app.inject({ method: 'GET', url: '/api/cvs' })
    expect(down.statusCode).toBe(503)
    expect(down.json().error.code).toBe('database_unavailable')

    reachable = true
    // The database is back; this request only lacks a session.
    expect((await app.inject({ method: 'GET', url: '/api/cvs' })).statusCode).toBe(401)
    await app.close()
    await database.close()
  })
})
