import {
  CoverLetterRecordSchema,
  CvRecordSchema,
  HIDDEN_PERSONAL,
  SharedCoverLetterSchema,
  SharedCvSchema,
  ShareStateSchema,
  type DocumentSummary,
} from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { shareLinks } from '../../src/db/schema/index'
import { dbAvailable, useTestApp } from '../support/context'

describe.skipIf(!dbAvailable)('share links API', () => {
  const ctx = useTestApp()
  const call = (
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    payload?: object,
  ) => ctx.app.inject({ method, url: `/api${url}`, payload, headers: { cookie: ctx.cookie } })
  const createCv = async () => CvRecordSchema.parse((await call('POST', '/cvs', {})).json())
  const share = async (id: string, isActive: boolean) => {
    const res = await call('PUT', `/cvs/${id}/share`, { isActive })
    expect(res.statusCode).toBe(200)
    return ShareStateSchema.parse(res.json()).link!
  }
  const shared = (slug: string) => call('GET', `/shared/${slug}`)
  const listed = async (id: string) =>
    ((await call('GET', '/cvs')).json() as DocumentSummary[]).find((d) => d.id === id)!

  it('is off until the owner turns it on', async () => {
    const cv = await createCv()
    expect((await call('GET', `/cvs/${cv.id}/share`)).json()).toEqual({ link: null })
    expect((await listed(cv.id)).shared).toBe(false)
  })

  it('creates an unguessable link that shows the CV to anyone', async () => {
    const cv = await createCv()
    const link = await share(cv.id, true)
    expect(link.isActive).toBe(true)
    expect(link.slug).toMatch(/^[A-Za-z0-9_-]{16}$/)
    expect((await listed(cv.id)).shared).toBe(true)

    const res = await shared(link.slug)
    expect(res.statusCode).toBe(200)
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow')
    expect(res.headers['cache-control']).toBe('private, no-store')
    const body = SharedCvSchema.parse(res.json())
    expect(body).toMatchObject({ type: 'cv', title: cv.title, document: cv.document })
    expect(res.json()).not.toHaveProperty('id')
  })

  it('shows the latest saved content', async () => {
    const cv = await createCv()
    const link = await share(cv.id, true)
    const document = { ...cv.document, header: { ...cv.document.header, name: 'Maria' } }
    await call('PATCH', `/cvs/${cv.id}`, { revision: cv.revision, document })
    expect(SharedCvSchema.parse((await shared(link.slug)).json()).document.header.name).toBe(
      'Maria',
    )
  })

  it('turns off and on again with the same address', async () => {
    const cv = await createCv()
    const on = await share(cv.id, true)
    const off = await share(cv.id, false)
    expect(off).toMatchObject({ slug: on.slug, isActive: false })
    expect((await shared(on.slug)).statusCode).toBe(404)
    expect((await listed(cv.id)).shared).toBe(false)

    expect((await share(cv.id, true)).slug).toBe(on.slug)
    expect((await shared(on.slug)).statusCode).toBe(200)
  })

  it('replaces the address so the old link stops working', async () => {
    const cv = await createCv()
    const old = await share(cv.id, false)
    const res = await call('POST', `/cvs/${cv.id}/share/reset`)
    const next = ShareStateSchema.parse(res.json()).link!
    expect(next.slug).not.toBe(old.slug)
    expect(next.isActive).toBe(true)
    expect((await shared(old.slug)).statusCode).toBe(404)
    expect((await shared(next.slug)).statusCode).toBe(200)
  })

  it('answers unknown and malformed links with 404', async () => {
    for (const slug of ['AAAAAAAAAAAAAAAA', 'bad', 'not%20a%20slug']) {
      const res = await shared(slug)
      expect(res.statusCode).toBe(404)
      expect(res.json().error.code).toBe('not_found')
    }
  })

  it("does not touch other users' or unknown CVs", async () => {
    const missing = '00000000-0000-4000-8000-000000000000'
    expect((await call('GET', `/cvs/${missing}/share`)).statusCode).toBe(404)
    expect((await call('PUT', `/cvs/${missing}/share`, { isActive: true })).statusCode).toBe(404)
    expect((await call('POST', `/cvs/${missing}/share/reset`)).statusCode).toBe(404)
  })

  it('validates the input', async () => {
    const cv = await createCv()
    const res = await call('PUT', `/cvs/${cv.id}/share`, { isActive: 'yes' })
    expect(res.statusCode).toBe(400)
  })

  it('is removed with the CV and not copied by Duplicate', async () => {
    const cv = await createCv()
    const link = await share(cv.id, true)
    const copy = CvRecordSchema.parse((await call('POST', `/cvs/${cv.id}/duplicate`)).json())
    expect((await listed(copy.id)).shared).toBe(false)

    await call('DELETE', `/cvs/${cv.id}`)
    expect((await shared(link.slug)).statusCode).toBe(404)
    expect(await ctx.database.db.select().from(shareLinks)).toEqual([])
  })

  describe('hiding personal details', () => {
    const personal = {
      name: 'Maria Petrova',
      headline: 'Product designer',
      email: 'maria@example.com',
      phone: '+359 88 123 4567',
      location: 'Sofia',
      link: 'maria.design',
      photoUrl: '/uploads/maria.jpg',
      showPhoto: true,
    }
    const createPersonalCv = async () => {
      const cv = await createCv()
      const document = { ...cv.document, header: { ...cv.document.header, ...personal } }
      const res = await call('PATCH', `/cvs/${cv.id}`, {
        revision: cv.revision,
        title: 'Maria Petrova CV',
        document,
      })
      expect(res.statusCode).toBe(200)
      return cv
    }
    const leaks = /Maria|Petrova|example\.com|123 4567|Sofia|maria\.(design|jpg)/

    it('is off by default and keeps the setting when turned off and on', async () => {
      const cv = await createCv()
      expect((await share(cv.id, true)).hidePersonal).toBe(false)
      const res = await call('PUT', `/cvs/${cv.id}/share`, { hidePersonal: true })
      expect(ShareStateSchema.parse(res.json()).link).toMatchObject({
        isActive: true,
        hidePersonal: true,
      })
      expect((await share(cv.id, false)).hidePersonal).toBe(true)
      expect((await share(cv.id, true)).hidePersonal).toBe(true)
      const reset = await call('POST', `/cvs/${cv.id}/share/reset`)
      expect(ShareStateSchema.parse(reset.json()).link!.hidePersonal).toBe(true)
    })

    it('never sends the real name, contacts, photo or title to visitors', async () => {
      const cv = await createPersonalCv()
      const link = await share(cv.id, true)
      expect(SharedCvSchema.parse((await shared(link.slug)).json())).toMatchObject({
        hidePersonal: false,
        title: 'Maria Petrova CV',
      })

      await call('PUT', `/cvs/${cv.id}/share`, { hidePersonal: true })
      const res = await shared(link.slug)
      expect(res.body).not.toMatch(leaks)
      const body = SharedCvSchema.parse(res.json())
      expect(body.hidePersonal).toBe(true)
      expect(body.title).toBe('')
      expect(body.document.header).toMatchObject({
        name: HIDDEN_PERSONAL.name,
        email: HIDDEN_PERSONAL.email,
        headline: 'Product designer',
        photoUrl: null,
        showPhoto: false,
      })
      // The owner's own CV is unchanged.
      const own = CvRecordSchema.parse((await call('GET', `/cvs/${cv.id}`)).json())
      expect(own.document.header.name).toBe('Maria Petrova')
    })

    it('hides them in a shared letter too, signature included', async () => {
      const cv = await createPersonalCv()
      const letter = CoverLetterRecordSchema.parse(
        (await call('POST', '/cover-letters', { cvId: cv.id })).json(),
      )
      const document = { ...letter.document, signature: 'Maria Petrova' }
      await call('PATCH', `/cover-letters/${letter.id}`, { revision: letter.revision, document })
      const res = await call('PUT', `/cover-letters/${letter.id}/share`, {
        isActive: true,
        hidePersonal: true,
      })
      const { slug } = ShareStateSchema.parse(res.json()).link!
      const page = await shared(slug)
      expect(page.body).not.toMatch(leaks)
      expect(SharedCoverLetterSchema.parse(page.json()).document.signature).toBe(
        HIDDEN_PERSONAL.name,
      )
    })

    it('hides the recipient of a shared cover letter and names in its text', async () => {
      const cv = await createPersonalCv()
      const letter = CoverLetterRecordSchema.parse(
        (await call('POST', '/cover-letters', { cvId: cv.id })).json(),
      )
      const document = {
        ...letter.document,
        recipient: {
          name: 'Dana Whitfield',
          title: 'Head of People',
          company: 'Northwind Labs',
          address: '9 Canal Street, Leeds',
        },
        greeting: 'Dear Dana,',
        paragraphs: ['I am excited about Northwind Labs. Thank you, Dana Whitfield.', '', ''],
      }
      await call('PATCH', `/cover-letters/${letter.id}`, { revision: letter.revision, document })
      const res = await call('PUT', `/cover-letters/${letter.id}/share`, {
        isActive: true,
        hidePersonal: true,
      })
      const { slug } = ShareStateSchema.parse(res.json()).link!
      const page = await shared(slug)
      for (const secret of ['Dana', 'Whitfield', 'Northwind', 'Canal Street'])
        expect(page.body, secret).not.toContain(secret)
      expect(SharedCoverLetterSchema.parse(page.json()).document.recipient).toMatchObject({
        name: HIDDEN_PERSONAL.name,
        title: 'Head of People',
      })
    })

    it("swaps the CV owner's name where the text mentions it", async () => {
      const cv = await createPersonalCv()
      const summary = cv.document.sections.find((section) => section.type === 'summary')!
      if (summary.type !== 'summary') throw new Error('expected a summary')
      summary.text = 'Maria Petrova designs interfaces.'
      await call('PATCH', `/cvs/${cv.id}`, {
        revision: 2,
        document: { ...cv.document, header: { ...cv.document.header, ...personal } },
      })
      const link = await share(cv.id, true)
      await call('PUT', `/cvs/${cv.id}/share`, { hidePersonal: true })
      expect((await shared(link.slug)).body).not.toMatch(/Maria|Petrova/)
    })

    it('rejects an empty change', async () => {
      const cv = await createCv()
      expect((await call('PUT', `/cvs/${cv.id}/share`, {})).statusCode).toBe(400)
    })
  })
})
