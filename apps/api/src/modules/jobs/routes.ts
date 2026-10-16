import { CreateJobInputSchema, UpdateJobInputSchema, type Job } from '@cv/shared'
import { and, desc, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Database } from '../../db/client'
import { coverLetters, cvs, jobs } from '../../db/schema/index'
import { notFound } from '../../infra/errors'

const IdParams = z.object({ id: z.uuid() })

const toJob = (row: typeof jobs.$inferSelect): Job => ({
  id: row.id,
  position: row.position,
  company: row.company,
  status: row.status,
  type: row.type,
  dateSaved: row.dateSaved,
  dateApplied: row.dateApplied,
  cvId: row.cvId,
  coverLetterId: row.coverLetterId,
  notes: row.notes,
  location: row.location,
  salary: row.salary,
  contact: row.contact,
  description: row.description,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

/** Saved Jobs, scoped to the current user. Sorting and filtering happen in the browser. */
export async function jobRoutes(app: FastifyInstance, opts: { database: Database }) {
  const { db } = opts.database

  /** A linked CV must be one of the user's own. */
  async function assertOwnCv(userId: string, cvId: string | null | undefined) {
    if (!cvId) return
    const [row] = await db
      .select({ id: cvs.id })
      .from(cvs)
      .where(and(eq(cvs.id, cvId), eq(cvs.userId, userId)))
    if (!row) throw notFound('CV')
  }

  /** A linked cover letter must be one of the user's own. */
  async function assertOwnLetter(userId: string, coverLetterId: string | null | undefined) {
    if (!coverLetterId) return
    const [row] = await db
      .select({ id: coverLetters.id })
      .from(coverLetters)
      .where(and(eq(coverLetters.id, coverLetterId), eq(coverLetters.userId, userId)))
    if (!row) throw notFound('Cover letter')
  }

  app.get('/jobs', async (request) => {
    const rows = await db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, request.user.id))
      .orderBy(desc(jobs.dateSaved), desc(jobs.createdAt))
    return rows.map(toJob)
  })

  app.post('/jobs', async (request, reply) => {
    const { dateSaved, ...input } = CreateJobInputSchema.parse(request.body ?? {})
    await assertOwnCv(request.user.id, input.cvId)
    await assertOwnLetter(request.user.id, input.coverLetterId)
    const [row] = await db
      .insert(jobs)
      .values({
        ...input,
        userId: request.user.id,
        dateSaved: dateSaved ?? new Date().toISOString().slice(0, 10),
      })
      .returning()
    return reply.status(201).send(toJob(row!))
  })

  app.get('/jobs/:id', async (request) => {
    const { id } = IdParams.parse(request.params)
    const [row] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.userId, request.user.id)))
    if (!row) throw notFound('Job')
    return toJob(row)
  })

  app.patch('/jobs/:id', async (request) => {
    const { id } = IdParams.parse(request.params)
    const input = UpdateJobInputSchema.parse(request.body ?? {})
    await assertOwnCv(request.user.id, input.cvId)
    await assertOwnLetter(request.user.id, input.coverLetterId)
    const [row] = await db
      .update(jobs)
      .set({ ...input, updatedAt: sql`now()` })
      .where(and(eq(jobs.id, id), eq(jobs.userId, request.user.id)))
      .returning()
    if (!row) throw notFound('Job')
    return toJob(row)
  })

  app.delete('/jobs/:id', async (request, reply) => {
    const { id } = IdParams.parse(request.params)
    const deleted = await db
      .delete(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.userId, request.user.id)))
      .returning({ id: jobs.id })
    if (deleted.length === 0) throw notFound('Job')
    return reply.status(204).send()
  })
}
