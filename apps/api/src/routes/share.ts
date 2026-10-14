import {
  SHARE_SLUG_PATTERN,
  UpdateShareInputSchema,
  type ShareLink,
  type SharedCv,
  type ShareState,
} from '@cv/shared'
import { randomBytes } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Database } from '../db/client'
import { cvs, shareLinks } from '../db/schema'
import { notFound } from '../lib/errors'

const IdParams = z.object({ id: z.uuid() })
const SlugParams = z.object({ slug: z.string().regex(SHARE_SLUG_PATTERN) })

/** 96 random bits, URL-safe: 16 characters nobody can guess. */
const newSlug = () => randomBytes(12).toString('base64url')

const toShareLink = (row: typeof shareLinks.$inferSelect): ShareLink => ({
  slug: row.slug,
  isActive: row.isActive,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

/** Turning sharing on or off, and replacing the link: owner only. */
export async function shareRoutes(app: FastifyInstance, opts: { database: Database }) {
  const { db } = opts.database

  async function assertOwnCv(userId: string, id: string) {
    const [row] = await db
      .select({ id: cvs.id })
      .from(cvs)
      .where(and(eq(cvs.id, id), eq(cvs.userId, userId)))
    if (!row) throw notFound('CV')
  }

  app.get('/cvs/:id/share', async (request): Promise<ShareState> => {
    const { id } = IdParams.parse(request.params)
    await assertOwnCv(request.user.id, id)
    const [row] = await db.select().from(shareLinks).where(eq(shareLinks.cvId, id))
    return { link: row ? toShareLink(row) : null }
  })

  // The first time creates the link; later it only turns it on or off, keeping the address.
  app.put('/cvs/:id/share', async (request): Promise<ShareState> => {
    const { id } = IdParams.parse(request.params)
    const { isActive } = UpdateShareInputSchema.parse(request.body)
    await assertOwnCv(request.user.id, id)
    const [row] = await db
      .insert(shareLinks)
      .values({ cvId: id, slug: newSlug(), isActive })
      .onConflictDoUpdate({
        target: shareLinks.cvId,
        set: { isActive, updatedAt: sql`now()` },
      })
      .returning()
    return { link: toShareLink(row!) }
  })

  // A new address for the link; the old one stops working at once.
  app.post('/cvs/:id/share/reset', async (request): Promise<ShareState> => {
    const { id } = IdParams.parse(request.params)
    await assertOwnCv(request.user.id, id)
    const [row] = await db
      .insert(shareLinks)
      .values({ cvId: id, slug: newSlug(), isActive: true })
      .onConflictDoUpdate({
        target: shareLinks.cvId,
        set: { slug: newSlug(), isActive: true, updatedAt: sql`now()` },
      })
      .returning()
    return { link: toShareLink(row!) }
  })
}

/** What a share link shows. Anyone with the link may read it. */
export async function publicShareRoutes(app: FastifyInstance, opts: { database: Database }) {
  const { db } = opts.database

  app.get('/shared/:slug', async (request, reply): Promise<SharedCv> => {
    const params = SlugParams.safeParse(request.params)
    // A malformed slug is answered like an unknown one.
    if (!params.success) throw notFound('Shared document')
    const [row] = await db
      .select({ title: cvs.title, document: cvs.document, updatedAt: cvs.updatedAt })
      .from(shareLinks)
      .innerJoin(cvs, eq(cvs.id, shareLinks.cvId))
      .where(and(eq(shareLinks.slug, params.data.slug), eq(shareLinks.isActive, true)))
    if (!row) throw notFound('Shared document')
    // Shared CVs hold contact details: keep them out of search engines and shared caches.
    reply.header('x-robots-tag', 'noindex, nofollow').header('cache-control', 'private, no-store')
    return {
      type: 'cv',
      title: row.title,
      document: row.document,
      updatedAt: row.updatedAt.toISOString(),
    }
  })
}
