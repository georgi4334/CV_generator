import {
  createEmptyCv,
  CreateCvInputSchema,
  CreateVersionInputSchema,
  DuplicateCvInputSchema,
  PLAN_LIMITS,
  PROFESSIONS,
  UpdateCvInputSchema,
  type CvRecord,
  type CvVersionSummary,
  type DocumentSummary,
  type ProfessionId,
} from '@cv/shared'
import { and, count, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Database } from '../db/client'
import { cvs, cvVersions, jobs, shareLinks } from '../db/schema'
import { HttpError, notFound } from '../lib/errors'

/** While editing, keep at most one automatic snapshot per this many minutes. */
const AUTO_VERSION_MINUTES = 10

const IdParams = z.object({ id: z.uuid() })
const VersionParams = z.object({ id: z.uuid(), versionId: z.uuid() })

type CvRow = typeof cvs.$inferSelect

const toRecord = (row: CvRow): CvRecord => ({
  id: row.id,
  type: 'cv',
  title: row.title,
  professionId: row.professionId,
  jobId: row.jobId,
  revision: row.revision,
  document: row.document,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const toSummary = (
  row: Pick<CvRow, 'id' | 'title' | 'jobId' | 'createdAt' | 'updatedAt'> & { shared: boolean },
): DocumentSummary => ({
  id: row.id,
  type: 'cv',
  title: row.title,
  jobId: row.jobId,
  shared: row.shared,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const toVersion = (row: typeof cvVersions.$inferSelect): CvVersionSummary => ({
  id: row.id,
  label: row.label,
  auto: row.auto,
  createdAt: row.createdAt.toISOString(),
})

export async function cvRoutes(app: FastifyInstance, opts: { database: Database }) {
  const { db } = opts.database

  async function findCv(userId: string, id: string) {
    const [row] = await db
      .select()
      .from(cvs)
      .where(and(eq(cvs.id, id), eq(cvs.userId, userId)))
    if (!row) throw notFound('CV')
    return row
  }

  /** A job the CV is linked to must be one of the user's own. */
  async function findOwnJob(userId: string, jobId: string) {
    const [job] = await db
      .select({ id: jobs.id, company: jobs.company })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    if (!job) throw notFound('Job')
    return job
  }

  async function assertCanCreate(userId: string, plan: keyof typeof PLAN_LIMITS) {
    const max = PLAN_LIMITS[plan].maxCvs
    if (max === null) return
    const [result] = await db.select({ n: count() }).from(cvs).where(eq(cvs.userId, userId))
    if ((result?.n ?? 0) >= max) {
      throw new HttpError(403, 'plan_limit', `The ${plan} plan allows up to ${max} CVs`)
    }
  }

  /** Deletes the oldest automatic snapshots beyond the plan's limit. */
  async function pruneVersions(cvId: string, plan: keyof typeof PLAN_LIMITS) {
    const keep = PLAN_LIMITS[plan].maxVersionsPerCv
    const stale = await db
      .select({ id: cvVersions.id })
      .from(cvVersions)
      .where(eq(cvVersions.cvId, cvId))
      .orderBy(desc(cvVersions.createdAt))
      .offset(keep)
    if (stale.length > 0) {
      await db.delete(cvVersions).where(
        inArray(
          cvVersions.id,
          stale.map((v) => v.id),
        ),
      )
    }
  }

  app.get('/cvs', async (request) => {
    const rows = await db
      .select({
        id: cvs.id,
        title: cvs.title,
        jobId: cvs.jobId,
        createdAt: cvs.createdAt,
        updatedAt: cvs.updatedAt,
        shared: sql<boolean>`coalesce(${shareLinks.isActive}, false)`,
      })
      .from(cvs)
      .leftJoin(shareLinks, eq(shareLinks.cvId, cvs.id))
      .where(eq(cvs.userId, request.user.id))
      .orderBy(desc(cvs.updatedAt))
    return rows.map(toSummary)
  })

  app.post('/cvs', async (request, reply) => {
    const input = CreateCvInputSchema.parse(request.body ?? {})
    await assertCanCreate(request.user.id, request.user.plan)
    if (input.jobId) await findOwnJob(request.user.id, input.jobId)
    const professionId = (input.professionId ?? null) as ProfessionId | null
    const [row] = await db
      .insert(cvs)
      .values({
        userId: request.user.id,
        title:
          input.title ?? (professionId ? `${PROFESSIONS[professionId].name} CV` : 'Untitled CV'),
        professionId,
        jobId: input.jobId ?? null,
        document: input.document ?? createEmptyCv(),
      })
      .returning()
    return reply.status(201).send(toRecord(row!))
  })

  app.get('/cvs/:id', async (request) => {
    const { id } = IdParams.parse(request.params)
    return toRecord(await findCv(request.user.id, id))
  })

  app.patch('/cvs/:id', async (request) => {
    const { id } = IdParams.parse(request.params)
    const input = UpdateCvInputSchema.parse(request.body)
    const current = await findCv(request.user.id, id)
    if (input.jobId) await findOwnJob(request.user.id, input.jobId)
    const savesDocument = input.document !== undefined
    if (savesDocument && current.revision !== input.revision) {
      throw new HttpError(409, 'conflict', 'This CV was changed somewhere else', {
        revision: current.revision,
      })
    }

    return db.transaction(async (tx) => {
      // Keep the previous content as an automatic snapshot, at most every few minutes.
      if (savesDocument) {
        const [recent] = await tx
          .select({ id: cvVersions.id })
          .from(cvVersions)
          .where(
            and(
              eq(cvVersions.cvId, id),
              eq(cvVersions.auto, true),
              gt(cvVersions.createdAt, sql`now() - make_interval(mins => ${AUTO_VERSION_MINUTES})`),
            ),
          )
          .limit(1)
        if (!recent)
          await tx.insert(cvVersions).values({ cvId: id, document: current.document, auto: true })
      }

      // The revision check in WHERE makes a concurrent save fail instead of overwriting.
      const [row] = await tx
        .update(cvs)
        .set({
          ...(input.title !== undefined && { title: input.title }),
          ...(input.professionId !== undefined && { professionId: input.professionId }),
          ...(input.jobId !== undefined && { jobId: input.jobId }),
          // The revision tracks the document only, so a rename in the
          // Documents list never conflicts with an editor that is saving.
          ...(savesDocument && { document: input.document, revision: sql`${cvs.revision} + 1` }),
          updatedAt: sql`now()`,
        })
        .where(and(eq(cvs.id, id), savesDocument ? eq(cvs.revision, input.revision!) : undefined))
        .returning()
      if (!row) throw new HttpError(409, 'conflict', 'This CV was changed somewhere else')
      await pruneVersions(id, request.user.plan)
      return toRecord(row)
    })
  })

  app.delete('/cvs/:id', async (request, reply) => {
    const { id } = IdParams.parse(request.params)
    const deleted = await db
      .delete(cvs)
      .where(and(eq(cvs.id, id), eq(cvs.userId, request.user.id)))
      .returning({ id: cvs.id })
    if (deleted.length === 0) throw notFound('CV')
    return reply.status(204).send()
  })

  app.post('/cvs/:id/duplicate', async (request, reply) => {
    const { id } = IdParams.parse(request.params)
    const { jobId } = DuplicateCvInputSchema.parse(request.body ?? {})
    const source = await findCv(request.user.id, id)
    const job = jobId ? await findOwnJob(request.user.id, jobId) : null
    await assertCanCreate(request.user.id, request.user.plan)
    const row = await db.transaction(async (tx) => {
      const [copy] = await tx
        .insert(cvs)
        .values({
          userId: request.user.id,
          // A tailored copy is named after the company it is for.
          title: (job ? `${source.title} – ${job.company}` : `Copy of ${source.title}`).slice(
            0,
            200,
          ),
          professionId: source.professionId,
          jobId: job ? job.id : source.jobId,
          document: source.document,
        })
        .returning()
      // The job now points at its tailored CV.
      if (job)
        await tx
          .update(jobs)
          .set({ cvId: copy!.id, updatedAt: sql`now()` })
          .where(eq(jobs.id, job.id))
      return copy!
    })
    return reply.status(201).send(toRecord(row))
  })

  app.get('/cvs/:id/versions', async (request) => {
    const { id } = IdParams.parse(request.params)
    await findCv(request.user.id, id)
    const rows = await db
      .select()
      .from(cvVersions)
      .where(eq(cvVersions.cvId, id))
      .orderBy(desc(cvVersions.createdAt))
    return rows.map(toVersion)
  })

  app.post('/cvs/:id/versions', async (request, reply) => {
    const { id } = IdParams.parse(request.params)
    const { label } = CreateVersionInputSchema.parse(request.body ?? {})
    const cv = await findCv(request.user.id, id)
    const [row] = await db
      .insert(cvVersions)
      .values({ cvId: id, document: cv.document, label: label ?? null, auto: false })
      .returning()
    await pruneVersions(id, request.user.plan)
    return reply.status(201).send(toVersion(row!))
  })

  app.get('/cvs/:id/versions/:versionId', async (request) => {
    const { id, versionId } = VersionParams.parse(request.params)
    await findCv(request.user.id, id)
    const [row] = await db
      .select()
      .from(cvVersions)
      .where(and(eq(cvVersions.id, versionId), eq(cvVersions.cvId, id)))
    if (!row) throw notFound('Version')
    return { ...toVersion(row), document: row.document }
  })

  app.post('/cvs/:id/versions/:versionId/restore', async (request) => {
    const { id, versionId } = VersionParams.parse(request.params)
    const cv = await findCv(request.user.id, id)
    const [version] = await db
      .select()
      .from(cvVersions)
      .where(and(eq(cvVersions.id, versionId), eq(cvVersions.cvId, id)))
    if (!version) throw notFound('Version')

    return db.transaction(async (tx) => {
      // Keep what is being replaced, so a restore can itself be undone.
      await tx
        .insert(cvVersions)
        .values({ cvId: id, document: cv.document, label: 'Before restore', auto: false })
      const [row] = await tx
        .update(cvs)
        .set({
          document: version.document,
          revision: sql`${cvs.revision} + 1`,
          updatedAt: sql`now()`,
        })
        .where(eq(cvs.id, id))
        .returning()
      return toRecord(row!)
    })
  })
}
