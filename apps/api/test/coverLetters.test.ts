import {
  CoverLetterRecordSchema,
  createCoverLetter,
  createExampleCv,
  CvRecordSchema,
  JobSchema,
  SharedDocumentSchema,
  ShareStateSchema,
  type DocumentSummary,
} from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { dbAvailable, useTestApp } from './context'

describe.skipIf(!dbAvailable)('cover letters API', () => {
  const ctx = useTestApp()
  const call = (
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    payload?: object,
  ) => ctx.app.inject({ method, url: `/api${url}`, payload, headers: { cookie: ctx.cookie } })
  const create = async (payload: object = {}) => {
    const res = await call('POST', '/cover-letters', payload)
    expect(res.statusCode).toBe(201)
    return CoverLetterRecordSchema.parse(res.json())
  }
  const missing = '00000000-0000-4000-8000-000000000000'

  it('creates an empty letter, lists and reads it', async () => {
    const letter = await create()
    expect(letter).toMatchObject({ title: 'Cover letter', revision: 1, cvId: null, jobId: null })
    expect(letter.document.paragraphs).toEqual(['', '', ''])
    const list = (await call('GET', '/cover-letters')).json() as DocumentSummary[]
    expect(list).toEqual([
      expect.objectContaining({
        id: letter.id,
        type: 'coverLetter',
        title: 'Cover letter',
        shared: false,
      }),
    ])
    expect((await call('GET', `/cover-letters/${letter.id}`)).json()).toEqual(letter)
  })

  it('stores a letter made from a CV for a job, and links the job to it', async () => {
    const cv = CvRecordSchema.parse((await call('POST', '/cvs', { title: 'My CV' })).json())
    const job = JobSchema.parse(
      (await call('POST', '/jobs', { position: 'Frontend Engineer', company: 'Acme' })).json(),
    )
    const document = createCoverLetter({ cv: createExampleCv('designer'), company: 'Acme' })
    const letter = await create({ title: 'Letter – Acme', cvId: cv.id, jobId: job.id, document })
    expect(letter).toMatchObject({ cvId: cv.id, jobId: job.id, document })
    expect(JobSchema.parse((await call('GET', `/jobs/${job.id}`)).json()).coverLetterId).toBe(
      letter.id,
    )
  })

  it('saves with revisions and rejects a stale save', async () => {
    const letter = await create()
    const document = { ...letter.document, greeting: 'Dear Maria,' }
    const saved = await call('PATCH', `/cover-letters/${letter.id}`, { revision: 1, document })
    expect(saved.json()).toMatchObject({ revision: 2, document: { greeting: 'Dear Maria,' } })
    const stale = await call('PATCH', `/cover-letters/${letter.id}`, { revision: 1, document })
    expect(stale.statusCode).toBe(409)
    expect(stale.json().error.details.revision).toBe(2)
    const renamed = await call('PATCH', `/cover-letters/${letter.id}`, { title: 'Renamed' })
    expect(renamed.json()).toMatchObject({ title: 'Renamed', revision: 2 })
    expect((await call('PATCH', `/cover-letters/${letter.id}`, { document })).statusCode).toBe(400)
  })

  it('rejects an invalid document and links to unknown CVs or jobs', async () => {
    const document = { ...createCoverLetter(), paragraphs: [] }
    expect((await call('POST', '/cover-letters', { document })).statusCode).toBe(400)
    expect((await call('POST', '/cover-letters', { cvId: missing })).statusCode).toBe(404)
    expect((await call('POST', '/cover-letters', { jobId: missing })).statusCode).toBe(404)
  })

  it('copies and deletes, unlinking jobs and removing the share link', async () => {
    const letter = await create({ title: 'Letter' })
    const copy = CoverLetterRecordSchema.parse(
      (await call('POST', `/cover-letters/${letter.id}/duplicate`)).json(),
    )
    expect(copy).toMatchObject({ title: 'Copy of Letter', document: letter.document })

    const job = JobSchema.parse(
      (
        await call('POST', '/jobs', { position: 'Dev', company: 'Acme', coverLetterId: letter.id })
      ).json(),
    )
    const { link } = ShareStateSchema.parse(
      (await call('PUT', `/cover-letters/${letter.id}/share`, { isActive: true })).json(),
    )
    expect((await call('DELETE', `/cover-letters/${letter.id}`)).statusCode).toBe(204)
    expect(JobSchema.parse((await call('GET', `/jobs/${job.id}`)).json()).coverLetterId).toBeNull()
    expect((await call('GET', `/shared/${link!.slug}`)).statusCode).toBe(404)
    expect((await call('GET', `/cover-letters/${letter.id}`)).statusCode).toBe(404)
  })

  it('shares a letter read-only and marks it as shared', async () => {
    const letter = await create({ title: 'Letter for Acme' })
    const { link } = ShareStateSchema.parse(
      (await call('PUT', `/cover-letters/${letter.id}/share`, { isActive: true })).json(),
    )
    const res = await call('GET', `/shared/${link!.slug}`)
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow')
    expect(SharedDocumentSchema.parse(res.json())).toMatchObject({
      type: 'coverLetter',
      title: 'Letter for Acme',
      document: letter.document,
    })
    const list = (await call('GET', '/cover-letters')).json() as DocumentSummary[]
    expect(list[0]!.shared).toBe(true)
    const reset = ShareStateSchema.parse(
      (await call('POST', `/cover-letters/${letter.id}/share/reset`)).json(),
    )
    expect((await call('GET', `/shared/${link!.slug}`)).statusCode).toBe(404)
    expect((await call('GET', `/shared/${reset.link!.slug}`)).statusCode).toBe(200)
  })

  it("links only the user's own letters to jobs", async () => {
    expect(
      (await call('POST', '/jobs', { position: 'Dev', company: 'Acme', coverLetterId: missing }))
        .statusCode,
    ).toBe(404)
  })

  it('answers 404 for unknown letters', async () => {
    expect((await call('GET', `/cover-letters/${missing}`)).statusCode).toBe(404)
    expect((await call('DELETE', `/cover-letters/${missing}`)).statusCode).toBe(404)
    expect((await call('GET', `/cover-letters/${missing}/share`)).statusCode).toBe(404)
  })
})
