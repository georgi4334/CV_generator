import { describe, expect, it } from 'vitest'
import { apiCaller, unknownId } from '../support/api'
import { dbAvailable, useTestApp } from '../support/context'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Letter = { id: string; revision: number; document: any }

describe.skipIf(!dbAvailable)(
  'cover letters and resignation letters: odd documents and links',
  () => {
    const ctx = useTestApp()
    const call = apiCaller(ctx)
    const create = async (path: string, body: object = {}) => {
      const res = await call('POST', path, body)
      expect(res.statusCode).toBe(201)
      return res.json() as Letter
    }

    describe.each([
      ['/cover-letters', 'cover letter'],
      ['/resignations', 'resignation letter'],
    ])('%s', (path, name) => {
      it(`refuses a ${name} with no paragraphs, or more than 20`, async () => {
        const letter = await create(path)
        for (const paragraphs of [[], Array.from({ length: 21 }, () => 'text')]) {
          const document = { ...letter.document, paragraphs }
          expect(
            (await call('PATCH', `${path}/${letter.id}`, { revision: 1, document })).statusCode,
          ).toBe(400)
          expect((await call('POST', path, { document })).statusCode).toBe(400)
        }
      })

      it('accepts 20 paragraphs of 5000 characters', async () => {
        const letter = await create(path)
        const document = {
          ...letter.document,
          paragraphs: Array.from({ length: 20 }, () => 'p'.repeat(5000)),
        }
        const res = await call('PATCH', `${path}/${letter.id}`, { revision: 1, document })
        expect(res.statusCode).toBe(200)
        expect(res.json().document.paragraphs).toHaveLength(20)
      })

      it('refuses a paragraph of 5001 characters, paragraphs that are not text and a missing list', async () => {
        const letter = await create(path)
        for (const paragraphs of [['p'.repeat(5001)], [1, 2], 'text', null, undefined]) {
          const document = { ...letter.document, paragraphs }
          expect(
            (await call('PATCH', `${path}/${letter.id}`, { revision: 1, document })).statusCode,
            JSON.stringify(paragraphs)?.slice(0, 20),
          ).toBe(400)
        }
      })

      it('refuses a document of the wrong kind (a CV document where a letter is expected)', async () => {
        const cv = (await call('POST', '/cvs', {})).json()
        expect((await call('POST', path, { document: cv.document })).statusCode).toBe(400)
        expect((await call('POST', path, { document: 'text' })).statusCode).toBe(400)
        expect((await call('POST', path, { document: {} })).statusCode).toBe(400)
      })

      it('stores markup and SQL in paragraphs as text', async () => {
        const letter = await create(path)
        const paragraphs = [
          '<script>alert(1)</script>',
          "'; drop table cover_letters;--",
          '🙂 日本語',
        ]
        const res = await call('PATCH', `${path}/${letter.id}`, {
          revision: 1,
          document: { ...letter.document, paragraphs },
        })
        expect(res.json().document.paragraphs).toEqual(paragraphs)
      })

      it('refuses titles that are empty, only spaces or over 200 characters', async () => {
        for (const title of ['', '   ', 'x'.repeat(201), 5]) {
          expect((await call('POST', path, { title })).statusCode).toBe(400)
        }
      })
    })

    describe('cover letter links', () => {
      it('keeps the first letter of a job: a second letter for the same job does not replace it', async () => {
        const job = (await call('POST', '/jobs', { position: 'Dev', company: 'Acme' })).json()
        const first = await create('/cover-letters', { jobId: job.id })
        await create('/cover-letters', { jobId: job.id })
        expect((await call('GET', `/jobs/${job.id}`)).json().coverLetterId).toBe(first.id)
      })

      it('links to an own CV, and refuses an unknown or malformed CV on create and on change', async () => {
        const cv = (await call('POST', '/cvs', {})).json()
        const letter = await create('/cover-letters', { cvId: cv.id })
        expect(
          (await call('PATCH', `/cover-letters/${letter.id}`, { cvId: unknownId() })).statusCode,
        ).toBe(404)
        expect(
          (await call('PATCH', `/cover-letters/${letter.id}`, { cvId: 'nope' })).statusCode,
        ).toBe(400)
        expect(
          (await call('PATCH', `/cover-letters/${letter.id}`, { cvId: null })).json().cvId,
        ).toBeNull()
        expect((await call('POST', '/cover-letters', { cvId: unknownId() })).statusCode).toBe(404)
      })

      it('refuses to link the CV or job of another account on create and change', async () => {
        const other = await ctx.signUp('other@example.com')
        const theirCv = (await call('POST', '/cvs', {}, other.cookie)).json()
        const theirJob = (
          await call('POST', '/jobs', { position: 'Dev', company: 'X' }, other.cookie)
        ).json()
        const letter = await create('/cover-letters')
        for (const body of [{ cvId: theirCv.id }, { jobId: theirJob.id }]) {
          expect((await call('PATCH', `/cover-letters/${letter.id}`, body)).statusCode).toBe(404)
          expect((await call('POST', '/cover-letters', body)).statusCode).toBe(404)
        }
        expect(
          (await call('GET', `/jobs/${theirJob.id}`, undefined, other.cookie)).json().coverLetterId,
        ).toBeNull()
      })

      it('a duplicate keeps the links but does not take over the job', async () => {
        const job = (await call('POST', '/jobs', { position: 'Dev', company: 'Acme' })).json()
        const letter = await create('/cover-letters', { jobId: job.id })
        const copy = (await call('POST', `/cover-letters/${letter.id}/duplicate`)).json()
        expect(copy.jobId).toBe(job.id)
        expect((await call('GET', `/jobs/${job.id}`)).json().coverLetterId).toBe(letter.id)
      })
    })
  },
)
