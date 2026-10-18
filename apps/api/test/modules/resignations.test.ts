import {
  createExampleCv,
  createResignationLetter,
  HIDDEN_PERSONAL,
  ResignationRecordSchema,
  SharedDocumentSchema,
  ShareStateSchema,
  type DocumentSummary,
} from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { dbAvailable, useTestApp } from '../support/context'

describe.skipIf(!dbAvailable)('resignation letters API', () => {
  const ctx = useTestApp()
  const call = (
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    payload?: object,
  ) => ctx.app.inject({ method, url: `/api${url}`, payload, headers: { cookie: ctx.cookie } })
  const create = async (payload: object = {}) => {
    const res = await call('POST', '/resignations', payload)
    expect(res.statusCode).toBe(201)
    return ResignationRecordSchema.parse(res.json())
  }
  const missing = '00000000-0000-4000-8000-000000000000'

  const personal = () => {
    const cv = createExampleCv('designer')
    return createResignationLetter({
      cv,
      company: 'Pixel & Pine Ltd',
      contact: 'Jordan Reyes',
    })
  }

  it('creates an empty letter, lists and reads it', async () => {
    const letter = await create()
    expect(letter).toMatchObject({ title: 'Resignation letter', revision: 1, jobId: null })
    expect(letter.document.paragraphs.length).toBeGreaterThan(0)

    const list = (await call('GET', '/resignations')).json() as DocumentSummary[]
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: letter.id, type: 'resignation', shared: false })
    expect(
      ResignationRecordSchema.parse((await call('GET', `/resignations/${letter.id}`)).json()),
    ).toEqual(letter)
  })

  it('stores a given letter with the sender and employer details', async () => {
    const document = personal()
    const letter = await create({ title: 'Leaving Pixel & Pine', document })
    expect(letter.title).toBe('Leaving Pixel & Pine')
    expect(letter.document.sender.name).toBe(document.sender.name)
    expect(letter.document.employer).toMatchObject({
      company: 'Pixel & Pine Ltd',
      contact: 'Jordan Reyes',
    })
    expect(letter.document.greeting).toContain('Jordan Reyes')
  })

  it('rejects an invalid document, and fields that are too long', async () => {
    const bad = await call('POST', '/resignations', { document: { subject: 'x' } })
    expect(bad.statusCode).toBe(400)
    const long = { ...personal(), subject: 'S'.repeat(500) }
    const res = await call('POST', '/resignations', { document: long })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('validation_error')
  })

  it('refuses a paragraph longer than 5,000 characters', async () => {
    const letter = await create()
    const document = { ...letter.document, paragraphs: ['w'.repeat(5001)] }
    const res = await call('PATCH', `/resignations/${letter.id}`, { revision: 1, document })
    expect(res.statusCode).toBe(400)
    const ok = { ...letter.document, paragraphs: ['w'.repeat(5000)] }
    expect(
      (await call('PATCH', `/resignations/${letter.id}`, { revision: 1, document: ok })).statusCode,
    ).toBe(200)
  })

  it('saves changes and increments the revision; an old revision is a conflict', async () => {
    const letter = await create()
    const document = { ...letter.document, subject: 'My resignation' }
    const saved = await call('PATCH', `/resignations/${letter.id}`, { revision: 1, document })
    expect(saved.statusCode).toBe(200)
    expect(saved.json()).toMatchObject({ revision: 2, document: { subject: 'My resignation' } })

    const stale = await call('PATCH', `/resignations/${letter.id}`, { revision: 1, document })
    expect(stale.statusCode).toBe(409)
    expect(stale.json().error.details).toEqual({ revision: 2 })
    expect((await call('PATCH', `/resignations/${letter.id}`, { document })).statusCode).toBe(400)
  })

  it('renames without a revision', async () => {
    const letter = await create()
    const res = await call('PATCH', `/resignations/${letter.id}`, { title: 'New name' })
    expect(res.json()).toMatchObject({ title: 'New name', revision: 1 })
  })

  it('copies and deletes, removing the share link with it', async () => {
    const letter = await create({ title: 'Original' })
    const copy = ResignationRecordSchema.parse(
      (await call('POST', `/resignations/${letter.id}/duplicate`)).json(),
    )
    expect(copy.title).toBe('Copy of Original')
    expect(copy.id).not.toBe(letter.id)

    const link = ShareStateSchema.parse(
      (await call('PUT', `/resignations/${letter.id}/share`, { isActive: true })).json(),
    ).link!
    expect((await call('DELETE', `/resignations/${letter.id}`)).statusCode).toBe(204)
    expect((await call('GET', `/resignations/${letter.id}`)).statusCode).toBe(404)
    expect((await call('GET', `/shared/${link.slug}`)).statusCode).toBe(404)
    expect((await call('GET', '/resignations')).json()).toHaveLength(1)
  })

  it('answers unknown letters with 404', async () => {
    for (const [method, url] of [
      ['GET', `/resignations/${missing}`],
      ['PATCH', `/resignations/${missing}`],
      ['DELETE', `/resignations/${missing}`],
      ['POST', `/resignations/${missing}/duplicate`],
      ['GET', `/resignations/${missing}/share`],
    ] as const) {
      expect(
        (await call(method, url, method === 'PATCH' ? { title: 'x' } : undefined)).statusCode,
      ).toBe(404)
    }
  })

  it('is listed with the other documents of the account as shared once the link is on', async () => {
    const letter = await create()
    await call('PUT', `/resignations/${letter.id}/share`, { isActive: true })
    const list = (await call('GET', '/resignations')).json() as DocumentSummary[]
    expect(list[0]!.shared).toBe(true)
  })

  it('shares a letter read-only', async () => {
    const letter = await create({ document: personal() })
    const link = ShareStateSchema.parse(
      (await call('PUT', `/resignations/${letter.id}/share`, { isActive: true })).json(),
    ).link!
    const res = await call('GET', `/shared/${link.slug}`)
    expect(res.statusCode).toBe(200)
    const body = SharedDocumentSchema.parse(res.json())
    expect(body).toMatchObject({ type: 'resignation', title: 'Resignation letter' })
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow')
  })

  it('hides the sender, the employer and the signature on a link that hides personal details', async () => {
    const document = personal()
    const letter = await create({ title: 'Leaving Pixel & Pine', document })
    const link = ShareStateSchema.parse(
      (
        await call('PUT', `/resignations/${letter.id}/share`, {
          isActive: true,
          hidePersonal: true,
        })
      ).json(),
    ).link!
    const res = await call('GET', `/shared/${link.slug}`)
    const leaks = [
      document.sender.name.split(' ')[0]!,
      document.sender.email,
      document.sender.phone,
      'Pixel',
      'Jordan',
      'Reyes',
    ]
    for (const secret of leaks) expect(res.body, secret).not.toContain(secret)
    const body = SharedDocumentSchema.parse(res.json())
    expect(body).toMatchObject({ type: 'resignation', title: '', hidePersonal: true })
    if (body.type !== 'resignation') throw new Error('expected a resignation letter')
    expect(body.document.sender.name).toBe(HIDDEN_PERSONAL.name)
    expect(body.document.employer.company).toBe(HIDDEN_PERSONAL.company)
    expect(body.document.signature).toBe(HIDDEN_PERSONAL.name)
    // The owner's own copy is untouched.
    const own = ResignationRecordSchema.parse(
      (await call('GET', `/resignations/${letter.id}`)).json(),
    )
    expect(own.document.sender.name).toBe(document.sender.name)
  })
})
