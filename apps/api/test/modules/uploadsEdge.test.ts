import { UPLOAD_MAX_BYTES } from '@cv/shared'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app'
import { uploads } from '../../src/db/schema/index'
import { inParallel, unknownId } from '../support/api'
import { dbAvailable, useTestApp } from '../support/context'
import {
  JPEG_START,
  multipartBody,
  PNG_SIGNATURE,
  webpHeader,
  type Part,
} from '../support/multipart'
import { createMemoryStorage } from '../support/storage'

describe.skipIf(!dbAvailable)('uploads: odd and abusive files', () => {
  const ctx = useTestApp()
  const apps: Awaited<ReturnType<typeof buildApp>>[] = []
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()))
  })

  const setup = async () => {
    const memory = createMemoryStorage()
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      database: ctx.database,
      storage: memory.storage,
    })
    apps.push(app)
    const upload = (
      parts: Part[] | Buffer,
      cookie: string | null = ctx.cookie,
      contentType?: string,
    ) => {
      const body = Array.isArray(parts)
        ? multipartBody(parts)
        : { payload: parts, contentType: contentType ?? '' }
      return app.inject({
        method: 'POST',
        url: '/api/uploads',
        payload: body.payload,
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(body.contentType || contentType
            ? { 'content-type': contentType ?? body.contentType }
            : {}),
        },
      })
    }
    const file = (data: Buffer | string, filename = 'a.png', contentType = 'image/png'): Part[] => [
      { name: 'file', data, filename, contentType },
    ]
    const get = (url: string) => app.inject({ method: 'GET', url })
    const del = (id: string, cookie = ctx.cookie) =>
      app.inject({ method: 'DELETE', url: `/api/uploads/${id}`, headers: { cookie } })
    return { ...memory, app, upload, file, get, del }
  }

  describe('requests that are not a proper upload', () => {
    it('answers 400 no_file for a multipart body without parts', async () => {
      const t = await setup()
      const res = await t.upload(
        Buffer.from('------cvtestboundary--\r\n'),
        ctx.cookie,
        'multipart/form-data; boundary=----cvtestboundary',
      )
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('no_file')
    })

    it('answers 400 no_file when there is only a text field', async () => {
      const t = await setup()
      const res = await t.upload([{ name: 'note', data: 'hello' }])
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('no_file')
    })

    it.each([
      ['JSON', 'application/json', '{"file":"x"}'],
      ['plain text', 'text/plain', 'hello'],
      ['an image sent directly', 'image/png', 'PNGDATA'],
      ['a form without files', 'application/x-www-form-urlencoded', 'a=b'],
    ])('refuses a %s body with a 4xx, not a 500', async (_name, type, body) => {
      const t = await setup()
      const res = await t.upload(Buffer.from(body), ctx.cookie, type)
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
      expect(res.statusCode).toBeLessThan(500)
      expect(t.files.size).toBe(0)
    })

    it('refuses an upload without any body or content type', async () => {
      const t = await setup()
      const res = await t.app.inject({
        method: 'POST',
        url: '/api/uploads',
        headers: { cookie: ctx.cookie },
      })
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
      expect(res.statusCode).toBeLessThan(500)
    })

    // BUG: a multipart request without a boundary parameter is a client error, but the API
    // answers 500 internal_error. POST /api/uploads with `content-type: multipart/form-data`
    // (no boundary) and any body -> 500; expected 400.
    it.fails('refuses a multipart body with a missing boundary with a 4xx', async () => {
      const t = await setup()
      const res = await t.upload(Buffer.from('whatever'), ctx.cookie, 'multipart/form-data')
      expect(res.statusCode).toBeLessThan(500)
    })

    // BUG: an upload that is cut off in the middle (connection dropped, truncated PNG file in the
    // body) ends in 500 internal_error ("Unexpected end of form"), expected 400.
    it.fails('refuses a body cut off in the middle of the file with a 4xx', async () => {
      const t = await setup()
      const full = multipartBody(t.file(Buffer.concat([PNG_SIGNATURE, Buffer.alloc(1000)]))).payload
      const res = await t.upload(
        full.subarray(0, full.length - 400),
        ctx.cookie,
        'multipart/form-data; boundary=----cvtestboundary',
      )
      expect(res.statusCode).toBeLessThan(500)
    })

    it('stores nothing from a body cut off in the middle of the file', async () => {
      const t = await setup()
      const full = multipartBody(t.file(Buffer.concat([PNG_SIGNATURE, Buffer.alloc(1000)]))).payload
      await t.upload(
        full.subarray(0, full.length - 400),
        ctx.cookie,
        'multipart/form-data; boundary=----cvtestboundary',
      )
      expect(await ctx.database.db.select().from(uploads)).toEqual([])
      expect(t.files.size).toBe(0)
    })

    it('needs a session', async () => {
      const t = await setup()
      const res = await t.upload(t.file(PNG_SIGNATURE), null)
      expect(res.statusCode).toBe(401)
      expect(t.files.size).toBe(0)
    })

    it('does not mind which field name carries the file, and takes the first file when there are two', async () => {
      const t = await setup()
      const res = await t.upload([
        { name: 'image', data: PNG_SIGNATURE, filename: 'one.png', contentType: 'image/png' },
        { name: 'file', data: JPEG_START, filename: 'two.jpg', contentType: 'image/jpeg' },
      ])
      expect([201, 413]).toContain(res.statusCode)
      expect(t.files.size).toBeLessThanOrEqual(1)
    })
  })

  describe('what counts as an image (the first bytes decide)', () => {
    it.each([
      ['a full PNG signature', PNG_SIGNATURE, 'image/png', 'png'],
      ['a JPEG start', JPEG_START, 'image/jpeg', 'jpg'],
      ['three JPEG bytes', Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg', 'jpg'],
      ['a WebP header', webpHeader(), 'image/webp', 'webp'],
    ])(
      'accepts %s, even when the file is cut off after it',
      async (_name, bytes, type, extension) => {
        const t = await setup()
        const res = await t.upload(t.file(bytes))
        expect(res.statusCode).toBe(201)
        expect(res.json().contentType).toBe(type)
        expect([...t.files.keys()][0]).toMatch(new RegExp(`^[0-9a-f-]{36}\\.${extension}$`))
      },
    )

    it.each([
      ['seven bytes of a PNG signature', PNG_SIGNATURE.subarray(0, 7)],
      ['four bytes of a PNG signature', PNG_SIGNATURE.subarray(0, 4)],
      [
        'a PNG signature with one wrong byte',
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b]),
      ],
      ['two JPEG bytes', Buffer.from([0xff, 0xd8])],
      ['a JPEG start with a wrong third byte', Buffer.from([0xff, 0xd8, 0xfe])],
      ['a RIFF header that is not WebP', webpHeader('WAVE')],
      ['a short RIFF header', Buffer.from('RIFF\u0004\u0000\u0000\u0000WEB')],
      [
        'WEBP without RIFF',
        Buffer.concat([Buffer.from('XXXX'), Buffer.from([4, 0, 0, 0]), Buffer.from('WEBP')]),
      ],
      ['a GIF', Buffer.from('GIF89a......')],
      [
        'an SVG',
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
      ],
      ['HTML', Buffer.from('<!doctype html><script>alert(1)</script>')],
      ['a PDF', Buffer.from('%PDF-1.7 ....')],
      ['a ZIP', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])],
      ['an executable', Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0])],
      ['a BOM and text', Buffer.from('﻿hello')],
      ['nothing at all', Buffer.alloc(0)],
      ['a single zero byte', Buffer.alloc(1)],
    ])('refuses %s (415) and stores nothing', async (_name, bytes) => {
      const t = await setup()
      const res = await t.upload(t.file(bytes))
      expect(res.statusCode).toBe(415)
      expect(res.json().error.code).toBe('unsupported_type')
      expect(t.files.size).toBe(0)
      expect(await ctx.database.db.select().from(uploads)).toEqual([])
    })

    it.each([
      ['text/html', 'index.html'],
      ['image/svg+xml', 'x.svg'],
      ['application/octet-stream', 'noext'],
      ['', 'plain'],
    ])(
      'trusts the bytes, not the declared type %j: a PNG is stored as image/png and served so',
      async (declared, filename) => {
        const t = await setup()
        const res = await t.upload([
          { name: 'file', data: PNG_SIGNATURE, filename, contentType: declared || undefined },
        ])
        expect(res.statusCode).toBe(201)
        const served = await t.get(res.json().url)
        expect(served.headers['content-type']).toBe('image/png')
        expect(served.headers['x-content-type-options']).toBe('nosniff')
      },
    )

    it('stores a JPEG sent as ".png / image/png" as a JPEG with a .jpg key', async () => {
      const t = await setup()
      const res = await t.upload(t.file(JPEG_START, 'photo.png', 'image/png'))
      expect(res.json().contentType).toBe('image/jpeg')
      expect([...t.files.keys()][0]).toMatch(/\.jpg$/)
    })

    it('a script appended after valid image bytes is stored but only ever served as an image', async () => {
      const t = await setup()
      const res = await t.upload(
        t.file(Buffer.concat([PNG_SIGNATURE, Buffer.from('<script>alert(1)</script>')])),
      )
      expect(res.statusCode).toBe(201)
      const served = await t.get(res.json().url)
      expect(served.headers['content-type']).toBe('image/png')
      expect(served.headers['x-content-type-options']).toBe('nosniff')
      expect(served.headers['content-disposition']).toBeUndefined()
    })
  })

  describe('file names', () => {
    it.each([
      ['../../../etc/passwd'],
      ['..\\..\\windows\\system32\\x.png'],
      ['/absolute/path.png'],
      ['a/b/c.png'],
      ['name\u0000.png'],
      ['ünïcödé 文件 🙂.png'],
      ['x'.repeat(10_000) + '.png'],
      ['<script>.png'],
      ["'; drop table uploads;--.png"],
      ['CON'],
      [''],
    ])(
      'never uses the name %j: the stored key is a generated id with an extension',
      async (filename) => {
        const t = await setup()
        const res = await t.upload(t.file(PNG_SIGNATURE, filename))
        expect(res.statusCode).toBe(201)
        const keys = [...t.files.keys()]
        expect(keys).toHaveLength(1)
        expect(keys[0]).toBe(`${res.json().id}.png`)
        const [row] = await ctx.database.db
          .select()
          .from(uploads)
          .where(eq(uploads.id, res.json().id))
        expect(row!.storageKey).toBe(keys[0])
        expect(JSON.stringify(res.json())).not.toContain('passwd')
      },
    )

    it('answers without a filename at all', async () => {
      const t = await setup()
      const res = await t.upload([{ name: 'file', data: PNG_SIGNATURE, contentType: 'image/png' }])
      // Without a filename the part is a plain field, not a file.
      expect([400, 201]).toContain(res.statusCode)
    })
  })

  describe('size', () => {
    it('accepts a file of exactly 5 MiB', async () => {
      const t = await setup()
      const data = Buffer.concat([
        PNG_SIGNATURE,
        Buffer.alloc(UPLOAD_MAX_BYTES - PNG_SIGNATURE.length),
      ])
      const res = await t.upload(t.file(data))
      expect(res.statusCode).toBe(201)
      expect(res.json().size).toBe(UPLOAD_MAX_BYTES)
      expect(t.files.get(`${res.json().id}.png`)!.data.length).toBe(UPLOAD_MAX_BYTES)
    })

    it('refuses a file of 5 MiB + 1 byte with 413 and stores nothing', async () => {
      const t = await setup()
      const data = Buffer.concat([
        PNG_SIGNATURE,
        Buffer.alloc(UPLOAD_MAX_BYTES + 1 - PNG_SIGNATURE.length),
      ])
      const res = await t.upload(t.file(data))
      expect(res.statusCode).toBe(413)
      expect(t.files.size).toBe(0)
      expect(await ctx.database.db.select().from(uploads)).toEqual([])
    })

    // BUG: the web app shows a translated message for the code "file_too_large", but the
    // multipart plugin throws its own 413 error first, so the API answers
    // { error: { code: 'bad_request', message: 'request file too large' } } and the `truncated`
    // branch in uploads/routes.ts is never reached. Expected code: file_too_large.
    it.fails('answers an oversized file with the code file_too_large', async () => {
      const t = await setup()
      const data = Buffer.concat([
        PNG_SIGNATURE,
        Buffer.alloc(UPLOAD_MAX_BYTES + 1 - PNG_SIGNATURE.length),
      ])
      const res = await t.upload(t.file(data))
      expect(res.json().error.code).toBe('file_too_large')
    })

    it('refuses a 20 MiB upload quickly with 413 (the request body limit, not memory)', async () => {
      const t = await setup()
      const data = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(20 * 1024 * 1024)])
      const res = await t.upload(t.file(data))
      expect(res.statusCode).toBe(413)
      expect(t.files.size).toBe(0)
    })
  })

  describe('many uploads', () => {
    it('stores 30 uploads in a row and 15 at once, each with its own id and file', async () => {
      const t = await setup()
      const ids = new Set<string>()
      for (let i = 0; i < 30; i++) {
        const res = await t.upload(t.file(Buffer.concat([PNG_SIGNATURE, Buffer.from(`n${i}`)])))
        expect(res.statusCode).toBe(201)
        ids.add(res.json().id)
      }
      const parallel = await inParallel(15, (i) =>
        t.upload(t.file(Buffer.concat([PNG_SIGNATURE, Buffer.from(`p${i}`)]))),
      )
      expect(parallel.every((r) => r.statusCode === 201)).toBe(true)
      parallel.forEach((r) => ids.add(r.json().id))
      expect(ids.size).toBe(45)
      expect(t.files.size).toBe(45)
      expect(await ctx.database.db.select().from(uploads)).toHaveLength(45)
    })

    it('keeps the files of two users apart', async () => {
      const t = await setup()
      const other = await ctx.signUp('other@example.com')
      const mine = (await t.upload(t.file(PNG_SIGNATURE))).json()
      const theirs = (await t.upload(t.file(PNG_SIGNATURE), other.cookie)).json()
      expect((await t.del(mine.id, other.cookie)).statusCode).toBe(404)
      expect((await t.del(theirs.id)).statusCode).toBe(404)
      expect(t.files.size).toBe(2)
    })
  })

  describe('reading', () => {
    it.each(['not-a-uuid', '123', '../../etc/passwd', "1'--", 'null'])(
      'answers 400 for the id %j',
      async (id) => {
        const t = await setup()
        const res = await t.get(`/api/uploads/${encodeURIComponent(id)}`)
        expect(res.statusCode).toBe(400)
      },
    )

    it('answers 404 for an unknown id, and when the file is missing from storage', async () => {
      const t = await setup()
      expect((await t.get(`/api/uploads/${unknownId()}`)).statusCode).toBe(404)
      const res = await t.upload(t.file(PNG_SIGNATURE))
      t.files.clear()
      const gone = await t.get(res.json().url)
      expect(gone.statusCode).toBe(404)
      expect(gone.json().error.code).toBe('not_found')
    })

    it('can be read without signing in (images are embedded by address), with long caching', async () => {
      const t = await setup()
      const res = await t.upload(t.file(PNG_SIGNATURE))
      const served = await t.get(res.json().url)
      expect(served.statusCode).toBe(200)
      expect(served.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    })

    it('answers 500 without internals when the storage is offline while reading', async () => {
      const t = await setup()
      const res = await t.upload(t.file(PNG_SIGNATURE))
      t.fail.get = true
      const served = await t.get(res.json().url)
      expect(served.statusCode).toBe(500)
      expect(served.payload).not.toContain('secret-endpoint')
    })
  })

  describe('storage failures', () => {
    it('stores nothing and leaks nothing when the bucket is offline during an upload', async () => {
      const t = await setup()
      t.fail.put = true
      const res = await t.upload(t.file(PNG_SIGNATURE))
      expect(res.statusCode).toBe(500)
      expect(res.payload).not.toContain('secret-endpoint')
      expect(await ctx.database.db.select().from(uploads)).toEqual([])
    })

    it('works again once the bucket is back', async () => {
      const t = await setup()
      t.fail.put = true
      await t.upload(t.file(PNG_SIGNATURE))
      t.fail.put = false
      expect((await t.upload(t.file(PNG_SIGNATURE))).statusCode).toBe(201)
    })

    // BUG (minor): DELETE /api/uploads/:id removes the database row first and then the file; when
    // the bucket is offline the request answers 500 although the upload is gone for the user
    // (a retry answers 404) and the file stays behind in the bucket for good.
    // Expected: 204 (and a logged warning), as when an account is deleted with storage errors.
    it.fails('answers 204 when the file cannot be removed from storage', async () => {
      const t = await setup()
      const res = await t.upload(t.file(PNG_SIGNATURE))
      t.fail.remove = true
      expect((await t.del(res.json().id)).statusCode).toBe(204)
    })
  })

  describe('deleting', () => {
    it('removes row and file, and a second delete answers 404', async () => {
      const t = await setup()
      const res = await t.upload(t.file(PNG_SIGNATURE))
      expect((await t.del(res.json().id)).statusCode).toBe(204)
      expect(t.files.size).toBe(0)
      expect((await t.del(res.json().id)).statusCode).toBe(404)
    })

    it('answers 400 for a malformed id, 404 for an unknown one and 401 without a session', async () => {
      const t = await setup()
      expect(
        (
          await t.app.inject({
            method: 'DELETE',
            url: '/api/uploads/nope',
            headers: { cookie: ctx.cookie },
          })
        ).statusCode,
      ).toBe(400)
      expect((await t.del(unknownId())).statusCode).toBe(404)
      const res = await t.upload(t.file(PNG_SIGNATURE))
      expect(
        (await t.app.inject({ method: 'DELETE', url: `/api/uploads/${res.json().id}` })).statusCode,
      ).toBe(401)
      expect(t.files.size).toBe(1)
    })
  })
})
