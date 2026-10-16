import {
  CreateCoverLetterInputSchema,
  createCoverLetter,
  PLAN_LIMITS,
  UpdateCoverLetterInputSchema,
  type CoverLetterRecord,
  type DocumentSummary,
} from '@cv/shared'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Database } from '../../db/client'
import { coverLetters, cvs, jobs, shareLinks } from '../../db/schema/index'
import { HttpError, notFound } from '../../infra/errors'

const IdParams = z.object({ id: z.uuid() })

type LetterRow = typeof coverLetters.$inferSelect

const toRecord = (row: LetterRow): CoverLetterRecord => ({
  id: row.id,
  type: 'coverLetter',
  title: row.title,
  cvId: row.cvId,
  jobId: row.jobId,
  revision: row.revision,
  document: row.document,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

/** Cover letters, scoped to the current user; saves use revisions like CVs. */
export async function coverLetterRoutes(app: FastifyInstance, opts: { database: Database }) {
  const { db } = opts.database

  async function findLetter(userId: string, id: string) {
    const [row] = await db
      .select()
      .from(coverLetters)
      .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    if (!row) throw notFound('Cover letter')
    return row
  }

  /** A linked CV or job must be one of the user's own. */
  async function assertLinks(
    userId: string,
    links: { cvId?: string | null; jobId?: string | null },
  ) {
    if (links.cvId) {
      const [cv] = await db
        .select({ id: cvs.id })
        .from(cvs)
        .where(and(eq(cvs.id, links.cvId), eq(cvs.userId, userId)))
      if (!cv) throw notFound('CV')
    }
    if (links.jobId) {
      const [job] = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(and(eq(jobs.id, links.jobId), eq(jobs.userId, userId)))
      if (!job) throw notFound('Job')
    }
  }

  /** The plan's document limit counts CVs only; letters get the same allowance. */
  async function assertCanCreate(userId: string, plan: keyof typeof PLAN_LIMITS) {
    const max = PLAN_LIMITS[plan].maxCvs
    if (max === null) return
    const [result] = await db
      .select({ n: count() })
      .from(coverLetters)
      .where(eq(coverLetters.userId, userId))
    if ((result?.n ?? 0) >= max) {
      throw new HttpError(403, 'plan_limit', `The ${plan} plan allows up to ${max} cover letters`)
    }
  }

  app.get('/cover-letters', async (request): Promise<DocumentSummary[]> => {
    const rows = await db
      .select({
        id: coverLetters.id,
        title: coverLetters.title,
        jobId: coverLetters.jobId,
        createdAt: coverLetters.createdAt,
        updatedAt: coverLetters.updatedAt,
        shared: sql<boolean>`coalesce(${shareLinks.isActive}, false)`,
      })
      .from(coverLetters)
      .leftJoin(shareLinks, eq(shareLinks.coverLetterId, coverLetters.id))
      .where(eq(coverLetters.userId, request.user.id))
      .orderBy(desc(coverLetters.updatedAt))
    return rows.map((row) => ({
      ...row,
      type: 'coverLetter',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  })

  app.post('/cover-letters', async (request, reply) => {
    const input = CreateCoverLetterInputSchema.parse(request.body ?? {})
    await assertCanCreate(request.user.id, request.user.plan)
    await assertLinks(request.user.id, input)
    const [row] = await db
      .insert(coverLetters)
      .values({
        userId: request.user.id,
        title: input.title ?? 'Cover letter',
        cvId: input.cvId ?? null,
        jobId: input.jobId ?? null,
        document: input.document ?? createCoverLetter(),
      })
      .returning()
    // A letter written for a job becomes that job's cover letter if it has none yet.
    if (input.jobId) {
      await db
        .update(jobs)
        .set({ coverLetterId: row!.id, updatedAt: sql`now()` })
        .where(and(eq(jobs.id, input.jobId), sql`${jobs.coverLetterId} is null`))
    }
    return reply.status(201).send(toRecord(row!))
  })

  app.get('/cover-letters/:id', async (request) => {
    const { id } = IdParams.parse(request.params)
    return toRecord(await findLetter(request.user.id, id))
  })

  app.patch('/cover-letters/:id', async (request) => {
    const { id } = IdParams.parse(request.params)
    const input = UpdateCoverLetterInputSchema.parse(request.body)
    const current = await findLetter(request.user.id, id)
    await assertLinks(request.user.id, input)
    const savesDocument = input.document !== undefined
    if (savesDocument && current.revision !== input.revision) {
      throw new HttpError(409, 'conflict', 'This cover letter was changed somewhere else', {
        revision: current.revision,
      })
    }
    // The revision check in WHERE makes a concurrent save fail instead of overwriting.
    const [row] = await db
      .update(coverLetters)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.cvId !== undefined && { cvId: input.cvId }),
        ...(input.jobId !== undefined && { jobId: input.jobId }),
        ...(savesDocument && {
          document: input.document,
          revision: sql`${coverLetters.revision} + 1`,
        }),
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(coverLetters.id, id),
          savesDocument ? eq(coverLetters.revision, input.revision!) : undefined,
        ),
      )
      .returning()
    if (!row) throw new HttpError(409, 'conflict', 'This cover letter was changed somewhere else')
    return toRecord(row)
  })

  app.delete('/cover-letters/:id', async (request, reply) => {
    const { id } = IdParams.parse(request.params)
    const deleted = await db
      .delete(coverLetters)
      .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, request.user.id)))
      .returning({ id: coverLetters.id })
    if (deleted.length === 0) throw notFound('Cover letter')
    return reply.status(204).send()
  })

  app.post('/cover-letters/:id/duplicate', async (request, reply) => {
    const { id } = IdParams.parse(request.params)
    const source = await findLetter(request.user.id, id)
    await assertCanCreate(request.user.id, request.user.plan)
    const [row] = await db
      .insert(coverLetters)
      .values({
        userId: request.user.id,
        title: `Copy of ${source.title}`.slice(0, 200),
        cvId: source.cvId,
        jobId: source.jobId,
        document: source.document,
      })
      .returning()
    return reply.status(201).send(toRecord(row!))
  })
}
