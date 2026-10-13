import multipart from '@fastify/multipart'
import { UPLOAD_CONTENT_TYPES, UPLOAD_MAX_BYTES, type Upload } from '@cv/shared'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Database } from '../db/client'
import { uploads } from '../db/schema'
import { HttpError, notFound } from '../lib/errors'
import type { Storage } from '../lib/storage'

const EXTENSIONS: Record<(typeof UPLOAD_CONTENT_TYPES)[number], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

/** Checks the file's first bytes, so a renamed non-image is rejected. */
function sniffImageType(data: Buffer): (typeof UPLOAD_CONTENT_TYPES)[number] | null {
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png'
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  if (
    data.subarray(0, 4).toString('ascii') === 'RIFF' &&
    data.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'image/webp'
  return null
}

const IdParams = z.object({ id: z.uuid() })

const toUpload = (row: typeof uploads.$inferSelect): Upload => ({
  id: row.id,
  url: `/api/uploads/${row.id}`,
  contentType: row.contentType,
  size: row.size,
})

/** Upload, delete: owner only. */
export async function uploadRoutes(
  app: FastifyInstance,
  opts: { database: Database; storage: Storage },
) {
  const { db } = opts.database
  await app.register(multipart, { limits: { fileSize: UPLOAD_MAX_BYTES, files: 1 } })

  app.post('/uploads', async (request, reply) => {
    const file = await request.file()
    if (!file)
      throw new HttpError(400, 'no_file', 'Send the image in a multipart field named "file"')
    const data = await file.toBuffer()
    if (file.file.truncated)
      throw new HttpError(413, 'file_too_large', 'Images must be 5 MB or smaller')
    const contentType = sniffImageType(data)
    if (!contentType)
      throw new HttpError(415, 'unsupported_type', 'Only PNG, JPEG and WebP images are allowed')

    const id = randomUUID()
    const storageKey = `${id}.${EXTENSIONS[contentType]}`
    await opts.storage.put(storageKey, data, contentType)
    const [row] = await db
      .insert(uploads)
      .values({ id, userId: request.user.id, storageKey, contentType, size: data.length })
      .returning()
    return reply.status(201).send(toUpload(row!))
  })

  app.delete('/uploads/:id', async (request, reply) => {
    const { id } = IdParams.parse(request.params)
    const [row] = await db
      .delete(uploads)
      .where(and(eq(uploads.id, id), eq(uploads.userId, request.user.id)))
      .returning()
    if (!row) throw notFound('Upload')
    await opts.storage.remove(row.storageKey)
    return reply.status(204).send()
  })
}

/**
 * Reading an image needs no login: CVs (and later public share links) embed
 * images by URL, and ids are random UUIDs.
 */
export async function publicUploadRoutes(
  app: FastifyInstance,
  opts: { database: Database; storage: Storage },
) {
  const { db } = opts.database
  app.get('/uploads/:id', async (request, reply) => {
    const { id } = IdParams.parse(request.params)
    const [row] = await db.select().from(uploads).where(eq(uploads.id, id))
    const stream = row ? await opts.storage.get(row.storageKey) : null
    if (!row || !stream) throw notFound('Upload')
    return reply
      .header('Content-Type', row.contentType)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .header('X-Content-Type-Options', 'nosniff')
      .send(stream)
  })
}
