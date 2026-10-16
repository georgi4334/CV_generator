import { CvRecordSchema, JobSchema, type Job } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { dbAvailable, useTestApp } from '../support/context'

describe.skipIf(!dbAvailable)('jobs API', () => {
  const ctx = useTestApp()
  const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    ctx.app.inject({ method, url: `/api${url}`, payload, headers: { cookie: ctx.cookie } })
  const addJob = async (payload: object = {}) => {
    const res = await call('POST', '/jobs', {
      position: 'Frontend Engineer',
      company: 'Acme',
      ...payload,
    })
    expect(res.statusCode).toBe(201)
    return JobSchema.parse(res.json())
  }
  const createCv = async (title = 'My CV') =>
    CvRecordSchema.parse((await call('POST', '/cvs', { title })).json())
  const missing = '00000000-0000-4000-8000-000000000000'

  it('adds a job with defaults and lists it', async () => {
    const job = await addJob({ dateSaved: '2026-10-14' })
    expect(job).toMatchObject({
      position: 'Frontend Engineer',
      company: 'Acme',
      status: 'to_apply',
      type: null,
      dateSaved: '2026-10-14',
      dateApplied: null,
      cvId: null,
      notes: '',
      location: '',
      salary: '',
      contact: '',
      description: '',
    })
    expect((await call('GET', '/jobs')).json()).toEqual([job])
    expect((await call('GET', `/jobs/${job.id}`)).json()).toEqual(job)
  })

  it("uses today's date when no date is sent", async () => {
    const job = await addJob()
    expect(job.dateSaved).toBe(new Date().toISOString().slice(0, 10))
  })

  it('lists the newest saved first', async () => {
    await addJob({ position: 'Old', dateSaved: '2026-09-01' })
    await addJob({ position: 'New', dateSaved: '2026-10-01' })
    expect(((await call('GET', '/jobs')).json() as Job[]).map((j) => j.position)).toEqual([
      'New',
      'Old',
    ])
  })

  it('validates new jobs', async () => {
    expect((await call('POST', '/jobs', { position: '', company: 'Acme' })).statusCode).toBe(400)
    expect(
      (await call('POST', '/jobs', { position: 'Dev', company: 'Acme', status: 'hired' }))
        .statusCode,
    ).toBe(400)
  })

  it('updates only the fields sent', async () => {
    const job = await addJob({ notes: 'Referral', salary: '4000 EUR' })
    const res = await call('PATCH', `/jobs/${job.id}`, {
      status: 'applied',
      dateApplied: '2026-10-15',
      type: 'remote',
      location: 'Sofia',
      contact: 'Maria, HR',
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      status: 'applied',
      dateApplied: '2026-10-15',
      type: 'remote',
      location: 'Sofia',
      contact: 'Maria, HR',
      notes: 'Referral',
      salary: '4000 EUR',
      position: 'Frontend Engineer',
    })
    expect((await call('PATCH', `/jobs/${job.id}`, { position: '' })).statusCode).toBe(400)
  })

  it("links a CV, but only the user's own", async () => {
    const cv = await createCv()
    const job = await addJob({ cvId: cv.id })
    expect(job.cvId).toBe(cv.id)
    expect((await call('PATCH', `/jobs/${job.id}`, { cvId: missing })).statusCode).toBe(404)
    expect(
      (await call('POST', '/jobs', { position: 'A', company: 'B', cvId: missing })).statusCode,
    ).toBe(404)
  })

  it('unlinks a deleted CV and clears the job on CVs when the job is deleted', async () => {
    const cv = await createCv()
    const job = await addJob({ cvId: cv.id })
    await call('DELETE', `/cvs/${cv.id}`)
    expect(JobSchema.parse((await call('GET', `/jobs/${job.id}`)).json()).cvId).toBeNull()

    const tailored = CvRecordSchema.parse(
      (await call('POST', '/cvs', { title: 'For Acme', jobId: job.id })).json(),
    )
    expect(tailored.jobId).toBe(job.id)
    expect((await call('DELETE', `/jobs/${job.id}`)).statusCode).toBe(204)
    expect(CvRecordSchema.parse((await call('GET', `/cvs/${tailored.id}`)).json()).jobId).toBeNull()
    expect((await call('GET', `/jobs/${job.id}`)).statusCode).toBe(404)
  })

  it('creates a tailored copy of a CV for a job and links it', async () => {
    const cv = await createCv('Frontend CV')
    const job = await addJob({ company: 'Northwind' })
    const res = await call('POST', `/cvs/${cv.id}/duplicate`, { jobId: job.id })
    expect(res.statusCode).toBe(201)
    const copy = CvRecordSchema.parse(res.json())
    expect(copy).toMatchObject({ title: 'Frontend CV – Northwind', jobId: job.id })
    expect(copy.document).toEqual(cv.document)
    expect(JobSchema.parse((await call('GET', `/jobs/${job.id}`)).json()).cvId).toBe(copy.id)
  })

  it('rejects tailoring for an unknown job and linking a CV to one', async () => {
    const cv = await createCv()
    expect((await call('POST', `/cvs/${cv.id}/duplicate`, { jobId: missing })).statusCode).toBe(404)
    expect((await call('POST', '/cvs', { jobId: missing })).statusCode).toBe(404)
    expect((await call('PATCH', `/cvs/${cv.id}`, { jobId: missing })).statusCode).toBe(404)
  })

  it('answers 404 for unknown jobs', async () => {
    expect((await call('GET', `/jobs/${missing}`)).statusCode).toBe(404)
    expect((await call('PATCH', `/jobs/${missing}`, { notes: 'x' })).statusCode).toBe(404)
    expect((await call('DELETE', `/jobs/${missing}`)).statusCode).toBe(404)
  })
})
