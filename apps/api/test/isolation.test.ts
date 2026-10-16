import { describe, expect, it } from 'vitest'
import { dbAvailable, useTestApp } from './context'

/** Two signed-in users: what A creates, B must neither see nor change. */
describe.skipIf(!dbAvailable)('accounts stay apart', () => {
  const ctx = useTestApp()
  const as = (cookie: string) => (method: string, url: string, payload?: object) =>
    ctx.app.inject({
      method: method as 'GET',
      url: `/api${url}`,
      payload,
      headers: { cookie },
    })
  const setup = async () => {
    const a = as(ctx.cookie)
    const b = as((await ctx.signUp('other@example.com')).cookie)
    return { a, b }
  }

  it('CVs: lists, reads, changes, copies and deletes only your own', async () => {
    const { a, b } = await setup()
    const cv = (await a('POST', '/cvs', { title: 'Private' })).json()

    expect((await b('GET', '/cvs')).json()).toEqual([])
    for (const [method, url, payload] of [
      ['GET', `/cvs/${cv.id}`],
      ['PATCH', `/cvs/${cv.id}`, { title: 'Hacked', revision: cv.revision }],
      ['DELETE', `/cvs/${cv.id}`],
      ['POST', `/cvs/${cv.id}/duplicate`],
      ['GET', `/cvs/${cv.id}/versions`],
      ['POST', `/cvs/${cv.id}/versions`, { label: 'x' }],
      ['GET', `/cvs/${cv.id}/share`],
      ['PUT', `/cvs/${cv.id}/share`, { isActive: true }],
      ['POST', `/cvs/${cv.id}/share/reset`],
    ] as const) {
      const res = await b(method, url, payload)
      expect(res.statusCode, `${method} ${url}`).toBe(404)
    }
    const still = (await a('GET', `/cvs/${cv.id}`)).json()
    expect(still.title).toBe('Private')
  })

  it('cover letters: only your own', async () => {
    const { a, b } = await setup()
    const letter = (await a('POST', '/cover-letters', { title: 'Private letter' })).json()
    expect((await b('GET', '/cover-letters')).json()).toEqual([])
    for (const [method, url, payload] of [
      ['GET', `/cover-letters/${letter.id}`],
      ['PATCH', `/cover-letters/${letter.id}`, { title: 'Hacked', revision: letter.revision }],
      ['DELETE', `/cover-letters/${letter.id}`],
      ['POST', `/cover-letters/${letter.id}/duplicate`],
      ['PUT', `/cover-letters/${letter.id}/share`, { isActive: true }],
    ] as const) {
      expect((await b(method, url, payload)).statusCode, `${method} ${url}`).toBe(404)
    }
    expect((await a('GET', `/cover-letters/${letter.id}`)).json().title).toBe('Private letter')
  })

  it('jobs: only your own, and a job cannot link to someone else’s CV', async () => {
    const { a, b } = await setup()
    const job = (await a('POST', '/jobs', { position: 'Dev', company: 'Acme' })).json()
    expect((await b('GET', '/jobs')).json()).toEqual([])
    for (const [method, url, payload] of [
      ['GET', `/jobs/${job.id}`],
      ['PATCH', `/jobs/${job.id}`, { company: 'Hacked' }],
      ['DELETE', `/jobs/${job.id}`],
    ] as const) {
      expect((await b(method, url, payload)).statusCode, `${method} ${url}`).toBe(404)
    }
    const cv = (await a('POST', '/cvs', {})).json()
    const link = await b('POST', '/jobs', { position: 'Dev', company: 'Acme', cvId: cv.id })
    expect(link.statusCode).toBeGreaterThanOrEqual(400)
    expect((await b('GET', '/jobs')).json()).toEqual([])
  })

  it('uploads: only the owner can delete an image', async () => {
    const { a, b } = await setup()
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const boundary = '----iso'
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])
    const upload = (
      await ctx.app.inject({
        method: 'POST',
        url: '/api/uploads',
        payload: body,
        headers: {
          cookie: ctx.cookie,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      })
    ).json()
    expect((await b('DELETE', `/uploads/${upload.id}`)).statusCode).toBe(404)
    expect((await a('DELETE', `/uploads/${upload.id}`)).statusCode).toBe(204)
  })
})
