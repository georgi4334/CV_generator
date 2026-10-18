import {
  SHARE_SLUG_PATTERN,
  hidePersonalDetails,
  UpdateShareInputSchema,
  type ShareLink,
  type SharedDocument,
  type ShareState,
} from '@cv/shared'
import { randomBytes } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Database } from '../../db/client'
import { coverLetters, cvs, resignations, shareLinks } from '../../db/schema/index'
import { notFound } from '../../infra/errors'

const IdParams = z.object({ id: z.uuid() })
const SlugParams = z.object({ slug: z.string().regex(SHARE_SLUG_PATTERN) })

/** 96 random bits, URL-safe: 16 characters nobody can guess. */
const newSlug = () => randomBytes(12).toString('base64url')

const toShareLink = (row: typeof shareLinks.$inferSelect): ShareLink => ({
  slug: row.slug,
  isActive: row.isActive,
  hidePersonal: row.hidePersonal,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

/** The documents that can be shared: where their routes live and how their link is stored. */
const KINDS = [
  { path: '/cvs', table: cvs, column: shareLinks.cvId, name: 'CV' },
  {
    path: '/cover-letters',
    table: coverLetters,
    column: shareLinks.coverLetterId,
    name: 'Cover letter',
  },
  {
    path: '/resignations',
    table: resignations,
    column: shareLinks.resignationId,
    name: 'Resignation letter',
  },
] as const

/** Turning sharing on or off, and replacing the link: owner only. */
export async function shareRoutes(app: FastifyInstance, opts: { database: Database }) {
  const { db } = opts.database

  for (const kind of KINDS) {
    const key =
      kind.column === shareLinks.cvId
        ? 'cvId'
        : kind.column === shareLinks.coverLetterId
          ? 'coverLetterId'
          : 'resignationId'

    const assertOwn = async (userId: string, id: string) => {
      const [row] = await db
        .select({ id: kind.table.id })
        .from(kind.table)
        .where(and(eq(kind.table.id, id), eq(kind.table.userId, userId)))
      if (!row) throw notFound(kind.name)
    }

    app.get(`${kind.path}/:id/share`, async (request): Promise<ShareState> => {
      const { id } = IdParams.parse(request.params)
      await assertOwn(request.user.id, id)
      const [row] = await db.select().from(shareLinks).where(eq(kind.column, id))
      return { link: row ? toShareLink(row) : null }
    })

    // The first time creates the link; later it changes only what is sent, keeping the address.
    app.put(`${kind.path}/:id/share`, async (request): Promise<ShareState> => {
      const { id } = IdParams.parse(request.params)
      const { isActive, hidePersonal } = UpdateShareInputSchema.parse(request.body)
      await assertOwn(request.user.id, id)
      const [row] = await db
        .insert(shareLinks)
        .values({
          [key]: id,
          slug: newSlug(),
          isActive: isActive ?? false,
          hidePersonal: hidePersonal ?? false,
        })
        .onConflictDoUpdate({
          target: kind.column,
          set: {
            ...(isActive !== undefined && { isActive }),
            ...(hidePersonal !== undefined && { hidePersonal }),
            updatedAt: sql`now()`,
          },
        })
        .returning()
      return { link: toShareLink(row!) }
    })

    // A new address for the link; the old one stops working at once.
    app.post(`${kind.path}/:id/share/reset`, async (request): Promise<ShareState> => {
      const { id } = IdParams.parse(request.params)
      await assertOwn(request.user.id, id)
      const [row] = await db
        .insert(shareLinks)
        .values({ [key]: id, slug: newSlug(), isActive: true })
        .onConflictDoUpdate({
          target: kind.column,
          set: { slug: newSlug(), isActive: true, updatedAt: sql`now()` },
        })
        .returning()
      return { link: toShareLink(row!) }
    })
  }
}

/** What a share link shows. Anyone with the link may read it. */
export async function publicShareRoutes(app: FastifyInstance, opts: { database: Database }) {
  const { db } = opts.database

  app.get('/shared/:slug', async (request, reply): Promise<SharedDocument> => {
    const params = SlugParams.safeParse(request.params)
    // A malformed slug is answered like an unknown one.
    if (!params.success) throw notFound('Shared document')
    const [row] = await db
      .select({
        hidePersonal: shareLinks.hidePersonal,
        cv: { title: cvs.title, document: cvs.document, updatedAt: cvs.updatedAt },
        letter: {
          title: coverLetters.title,
          document: coverLetters.document,
          updatedAt: coverLetters.updatedAt,
        },
        resignation: {
          title: resignations.title,
          document: resignations.document,
          updatedAt: resignations.updatedAt,
        },
      })
      .from(shareLinks)
      .leftJoin(cvs, eq(cvs.id, shareLinks.cvId))
      .leftJoin(coverLetters, eq(coverLetters.id, shareLinks.coverLetterId))
      .leftJoin(resignations, eq(resignations.id, shareLinks.resignationId))
      .where(and(eq(shareLinks.slug, params.data.slug), eq(shareLinks.isActive, true)))
    const shared = row?.cv
      ? ({ type: 'cv', ...row.cv } as const)
      : row?.letter
        ? ({ type: 'coverLetter', ...row.letter } as const)
        : row?.resignation
          ? ({ type: 'resignation', ...row.resignation } as const)
          : null
    if (!shared) throw notFound('Shared document')
    const hidePersonal = row!.hidePersonal
    // Hidden details are replaced here, so they never leave the server.
    const visible = hidePersonal
      ? shared.type === 'cv'
        ? { ...shared, title: '', document: hidePersonalDetails(shared.document) }
        : shared.type === 'coverLetter'
          ? { ...shared, title: '', document: hidePersonalDetails(shared.document) }
          : { ...shared, title: '', document: hidePersonalDetails(shared.document) }
      : shared
    // Shared documents hold contact details: keep them out of search engines and shared caches.
    reply.header('x-robots-tag', 'noindex, nofollow').header('cache-control', 'private, no-store')
    return {
      ...visible,
      hidePersonal,
      updatedAt: shared.updatedAt.toISOString(),
    } as SharedDocument
  })
}
