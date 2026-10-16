import { describe, expect, it } from 'vitest'
import { dbAvailable, useTestApp } from '../support/context'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

function multipart(filename: string, contentType: string, data: Buffer, cookie?: string) {
  const boundary = '----cvtest'
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
  return {
    payload: Buffer.concat([Buffer.from(head), data, Buffer.from(`\r\n--${boundary}--\r\n`)]),
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      ...(cookie ? { cookie } : {}),
    },
  }
}

describe.skipIf(!dbAvailable)('uploads API', () => {
  const ctx = useTestApp()

  it('stores an image and serves it back', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/uploads',
      ...multipart('a.png', 'image/png', PNG, ctx.cookie),
    })
    expect(res.statusCode).toBe(201)
    const upload = res.json()
    expect(upload).toMatchObject({
      contentType: 'image/png',
      size: PNG.length,
      url: `/api/uploads/${upload.id}`,
    })

    const file = await ctx.app.inject({ method: 'GET', url: upload.url })
    expect(file.statusCode).toBe(200)
    expect(file.headers['content-type']).toBe('image/png')
    expect(file.rawPayload.equals(PNG)).toBe(true)
  })

  it('rejects files that are not images, whatever their name', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/uploads',
      ...multipart('evil.png', 'image/png', Buffer.from('<script>alert(1)</script>'), ctx.cookie),
    })
    expect(res.statusCode).toBe(415)
    expect(res.json().error.code).toBe('unsupported_type')
  })

  it('rejects images over 5 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/uploads',
      ...multipart('big.png', 'image/png', big, ctx.cookie),
    })
    expect(res.statusCode).toBe(413)
  })

  it('deletes an image', async () => {
    const upload = (
      await ctx.app.inject({
        method: 'POST',
        url: '/api/uploads',
        ...multipart('a.png', 'image/png', PNG, ctx.cookie),
      })
    ).json()
    expect(
      (
        await ctx.app.inject({
          method: 'DELETE',
          url: upload.url,
          headers: { cookie: ctx.cookie },
        })
      ).statusCode,
    ).toBe(204)
    expect((await ctx.app.inject({ method: 'GET', url: upload.url })).statusCode).toBe(404)
  })
})
