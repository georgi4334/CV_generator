import {
  CreateResignationInputSchema,
  createResignationLetter,
  PLAN_LIMITS,
  UpdateResignationInputSchema,
  type DocumentSummary,
  type ResignationRecord,
} from '@cv/shared'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Database } from '../../db/client'
import { resignations, shareLinks } from '../../db/schema/index'
import { HttpError, notFound } from '../../infra/errors'

const IdParams = z.object({ id: z.uuid() })

type ResignationRow = typeof resignations.$inferSelect

const toRecord = (row: ResignationRow): ResignationRecord => ({
  id: row.id,
  type: 'resignation',
  title: row.title,
  // Resignation letters are not tied to a saved job.
  jobId: null,
  revision: row.revision,
  document: row.document,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

/** Resignation letters, scoped to the current user; saves use revisions like CVs. */
export async function resignationRoutes(app: FastifyInstance, opts: { database: Database }) {
  const { db } = opts.database

  async function findLetter(userId: string, id: string) {
    const [row] = await db
      .select()
      .from(resignations)
      .where(and(eq(resignations.id, id), eq(resignations.userId, userId)))
    if (!row) throw notFound('Resignation letter')
    return row
  }

  /** The plan's document limit counts CVs only; resignation letters get the same allowance. */
  async function assertCanCreate(userId: string, plan: keyof typeof PLAN_LIMITS) {
    const max = PLAN_LIMITS[plan].maxCvs
    if (max === null) return
    const [result] = await db
      .select({ n: count() })
      .from(resignations)
      .where(eq(resignations.userId, userId))
    if ((result?.n ?? 0) >= max) {
      throw new HttpError(
        403,
        'plan_limit',
        `The ${plan} plan allows up to ${max} resignation letters`,
      )
    }
  }

  app.get('/resignations', async (request): Promise<DocumentSummary[]> => {
    const rows = await db
      .select({
        id: resignations.id,
        title: resignations.title,
        createdAt: resignations.createdAt,
        updatedAt: resignations.updatedAt,
        shared: sql<boolean>`coalesce(${shareLinks.isActive}, false)`,
      })
      .from(resignations)
      .leftJoin(shareLinks, eq(shareLinks.resignationId, resignations.id))
      .where(eq(resignations.userId, request.user.id))
      .orderBy(desc(resignations.updatedAt))
    return rows.map((row) => ({
      ...row,
      type: 'resignation',
      jobId: null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  })

  app.post('/resignations', async (request, reply) => {
    const input = CreateResignationInputSchema.parse(request.body ?? {})
    await assertCanCreate(request.user.id, request.user.plan)
    const [row] = await db
      .insert(resignations)
      .values({
        userId: request.user.id,
        title: input.title ?? 'Resignation letter',
        document: input.document ?? createResignationLetter(),
      })
      .returning()
    return reply.status(201).send(toRecord(row!))
  })

  app.get('/resignations/:id', async (request) => {
    const { id } = IdParams.parse(request.params)
    return toRecord(await findLetter(request.user.id, id))
  })

  app.patch('/resignations/:id', async (request) => {
    const { id } = IdParams.parse(request.params)
    const input = UpdateResignationInputSchema.parse(request.body)
    const current = await findLetter(request.user.id, id)
    const savesDocument = input.document !== undefined
    if (savesDocument && current.revision !== input.revision) {
      throw new HttpError(409, 'conflict', 'This resignation letter was changed somewhere else', {
        revision: current.revision,
      })
    }
    // The revision check in WHERE makes a concurrent save fail instead of overwriting.
    const [row] = await db
      .update(resignations)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(savesDocument && {
          document: input.document,
          revision: sql`${resignations.revision} + 1`,
        }),
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(resignations.id, id),
          savesDocument ? eq(resignations.revision, input.revision!) : undefined,
        ),
      )
      .returning()
    if (!row) {
      throw new HttpError(409, 'conflict', 'This resignation letter was changed somewhere else')
    }
    return toRecord(row)
  })

  app.delete('/resignations/:id', async (request, reply) => {
    const { id } = IdParams.parse(request.params)
    const deleted = await db
      .delete(resignations)
      .where(and(eq(resignations.id, id), eq(resignations.userId, request.user.id)))
      .returning({ id: resignations.id })
    if (deleted.length === 0) throw notFound('Resignation letter')
    return reply.status(204).send()
  })

  app.post('/resignations/:id/duplicate', async (request, reply) => {
    const { id } = IdParams.parse(request.params)
    const source = await findLetter(request.user.id, id)
    await assertCanCreate(request.user.id, request.user.plan)
    const [row] = await db
      .insert(resignations)
      .values({
        userId: request.user.id,
        title: `Copy of ${source.title}`.slice(0, 200),
        document: source.document,
      })
      .returning()
    return reply.status(201).send(toRecord(row!))
  })
}
