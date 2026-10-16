import {
  createCoverLetter,
  createEmptyCv,
  createExampleCv,
  PROFESSIONS,
  type CvDocument,
  type CvRecord,
  type CvVersionSummary,
  type CoverLetterRecord,
  type CreateJobInput,
  CreateJobInputSchema,
  type DocumentSummary,
  type Job,
  type ProfessionId,
  type ShareLink,
} from '@cv/shared'
import { ApiRequestError } from '@/shared/api/client'
import type { CvApi } from '@/features/cv-editor/api'
import type { CoverLetterApi } from '@/features/cover-letters/api'
import type { JobsApi } from '@/features/jobs/api'

interface Version extends CvVersionSummary {
  document: CvDocument
}

/** In-memory stand-in for the CV API, with the same rules (revisions, 404s). */
export function createFakeCvApi() {
  const cvs = new Map<string, CvRecord>()
  const versions = new Map<string, Version[]>()
  const shares = new Map<string, ShareLink>()
  const jobs = new Map<string, Job>()
  const letters = new Map<string, CoverLetterRecord>()
  let clock = Date.parse('2026-10-14T09:00:00Z')
  let seq = 0
  const now = () => new Date((clock += 1000)).toISOString()
  const id = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`
  const notFound = () => new ApiRequestError(404, 'not_found', 'CV not found')
  const find = (cvId: string) => {
    const cv = cvs.get(cvId)
    if (!cv) throw notFound()
    return cv
  }
  const summary = (cv: CvRecord): DocumentSummary => ({
    id: cv.id,
    type: 'cv',
    title: cv.title,
    jobId: cv.jobId,
    shared: shares.get(cv.id)?.isActive ?? false,
    createdAt: cv.createdAt,
    updatedAt: cv.updatedAt,
  })

  /** Share links of any document (CV or cover letter), by document id. */
  const share = {
    get: (docId: string) => ({ link: structuredClone(shares.get(docId) ?? null) }),
    set(docId: string, isActive: boolean) {
      const time = now()
      const current = shares.get(docId)
      const link: ShareLink = current
        ? { ...current, isActive, updatedAt: time }
        : { slug: `slug${++seq}AbCdEfGh`, isActive, createdAt: time, updatedAt: time }
      shares.set(docId, link)
      return { link: structuredClone(link) }
    },
    reset(docId: string) {
      share.set(docId, true)
      const link = { ...shares.get(docId)!, slug: `slug${++seq}NewLink0` }
      shares.set(docId, link)
      return { link: structuredClone(link) }
    },
  }

  const api: CvApi = {
    async list() {
      return [...cvs.values()].map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    async get(cvId) {
      return structuredClone(find(cvId))
    },
    async create(input = {}) {
      const time = now()
      const record: CvRecord = {
        id: id(),
        type: 'cv',
        title:
          input.title ??
          (input.professionId ? `${PROFESSIONS[input.professionId].name} CV` : 'Untitled CV'),
        professionId: input.professionId ?? null,
        jobId: input.jobId ?? null,
        revision: 1,
        document: input.document ?? createEmptyCv(),
        createdAt: time,
        updatedAt: time,
      }
      cvs.set(record.id, record)
      return structuredClone(record)
    },
    async update(cvId, input) {
      const current = find(cvId)
      if (input.document && input.revision !== current.revision) {
        throw new ApiRequestError(409, 'conflict', 'This CV was changed somewhere else', {
          revision: current.revision,
        })
      }
      const next: CvRecord = {
        ...current,
        ...(input.title !== undefined && { title: input.title }),
        ...(input.document !== undefined && {
          document: input.document,
          revision: current.revision + 1,
        }),
        updatedAt: now(),
      }
      cvs.set(cvId, next)
      return structuredClone(next)
    },
    async remove(cvId) {
      find(cvId)
      cvs.delete(cvId)
      shares.delete(cvId)
      for (const job of jobs.values())
        if (job.cvId === cvId) jobs.set(job.id, { ...job, cvId: null })
      for (const letter of letters.values())
        if (letter.cvId === cvId) letters.set(letter.id, { ...letter, cvId: null })
    },
    async duplicate(cvId, jobId) {
      const source = find(cvId)
      const job = jobId ? jobs.get(jobId) : undefined
      if (jobId && !job) throw new ApiRequestError(404, 'not_found', 'Job not found')
      const copy = await api.create({
        title: job ? `${source.title} – ${job.company}` : `Copy of ${source.title}`,
        jobId: job?.id ?? null,
        document: structuredClone(source.document),
      })
      if (job) jobs.set(job.id, { ...job, cvId: copy.id })
      return copy
    },
    async listVersions(cvId) {
      find(cvId)
      return (versions.get(cvId) ?? []).map(({ document: _document, ...rest }) => rest)
    },
    async getVersion(cvId, versionId) {
      const version = (versions.get(cvId) ?? []).find((v) => v.id === versionId)
      if (!version) throw notFound()
      return structuredClone(version)
    },
    async createVersion(cvId, label) {
      const cv = find(cvId)
      const version: Version = {
        id: id(),
        label: label ?? null,
        auto: false,
        createdAt: now(),
        document: cv.document,
      }
      versions.set(cvId, [version, ...(versions.get(cvId) ?? [])])
      const { document: _document, ...rest } = version
      return rest
    },
    async restoreVersion(cvId, versionId) {
      const cv = find(cvId)
      const version = (versions.get(cvId) ?? []).find((v) => v.id === versionId)
      if (!version) throw notFound()
      await api.createVersion(cvId, 'Before restore')
      const next = {
        ...cv,
        document: version.document,
        revision: cv.revision + 1,
        updatedAt: now(),
      }
      cvs.set(cvId, next)
      return structuredClone(next)
    },
    async getShare(cvId) {
      find(cvId)
      return share.get(cvId)
    },
    async setShare(cvId, isActive) {
      find(cvId)
      return share.set(cvId, isActive)
    },
    async resetShare(cvId) {
      find(cvId)
      return share.reset(cvId)
    },
    async getShared(slug) {
      const entry = [...shares.entries()].find(([, link]) => link.slug === slug && link.isActive)
      const cv = entry && cvs.get(entry[0])
      if (cv) {
        const { title, document, updatedAt } = structuredClone(cv)
        return { type: 'cv' as const, title, document, updatedAt }
      }
      const letter = entry && letters.get(entry[0])
      if (letter) {
        const { title, document, updatedAt } = structuredClone(letter)
        return { type: 'coverLetter' as const, title, document, updatedAt }
      }
      throw new ApiRequestError(404, 'not_found', 'Shared document not found')
    },
    async uploadImage() {
      return { id: id(), url: `/api/uploads/${id()}`, contentType: 'image/png', size: 100 }
    },
  }

  const findJob = (jobId: string) => {
    const job = jobs.get(jobId)
    if (!job) throw new ApiRequestError(404, 'not_found', 'Job not found')
    return job
  }
  const byNewest = (a: Job, b: Job) =>
    b.dateSaved.localeCompare(a.dateSaved) || b.createdAt.localeCompare(a.createdAt)

  const jobsApi: JobsApi = {
    async list() {
      return structuredClone([...jobs.values()].sort(byNewest))
    },
    async create(input) {
      const { dateSaved, ...fields } = CreateJobInputSchema.parse(input)
      const time = now()
      const job: Job = {
        ...fields,
        id: id(),
        dateSaved: dateSaved ?? time.slice(0, 10),
        createdAt: time,
        updatedAt: time,
      }
      jobs.set(job.id, job)
      return structuredClone(job)
    },
    async update(jobId, change) {
      const job = { ...findJob(jobId), ...change, updatedAt: now() }
      jobs.set(jobId, job)
      return structuredClone(job)
    },
    async remove(jobId) {
      findJob(jobId)
      jobs.delete(jobId)
      for (const cv of cvs.values()) if (cv.jobId === jobId) cvs.set(cv.id, { ...cv, jobId: null })
    },
  }

  const findLetter = (letterId: string) => {
    const letter = letters.get(letterId)
    if (!letter) throw new ApiRequestError(404, 'not_found', 'Cover letter not found')
    return letter
  }
  const letterSummary = (letter: CoverLetterRecord): DocumentSummary => ({
    id: letter.id,
    type: 'coverLetter',
    title: letter.title,
    jobId: letter.jobId,
    shared: shares.get(letter.id)?.isActive ?? false,
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
  })

  const coverLetterApi: CoverLetterApi = {
    async list() {
      return [...letters.values()]
        .map(letterSummary)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    async get(letterId) {
      return structuredClone(findLetter(letterId))
    },
    async create(input = {}) {
      const time = now()
      const record: CoverLetterRecord = {
        id: id(),
        type: 'coverLetter',
        title: input.title ?? 'Cover letter',
        cvId: input.cvId ?? null,
        jobId: input.jobId ?? null,
        revision: 1,
        document: input.document ?? createCoverLetter(),
        createdAt: time,
        updatedAt: time,
      }
      letters.set(record.id, record)
      const job = record.jobId ? jobs.get(record.jobId) : undefined
      if (job && !job.coverLetterId) jobs.set(job.id, { ...job, coverLetterId: record.id })
      return structuredClone(record)
    },
    async update(letterId, input) {
      const current = findLetter(letterId)
      if (input.document && input.revision !== current.revision) {
        throw new ApiRequestError(409, 'conflict', 'This cover letter was changed somewhere else', {
          revision: current.revision,
        })
      }
      const next: CoverLetterRecord = {
        ...current,
        ...(input.title !== undefined && { title: input.title }),
        ...(input.cvId !== undefined && { cvId: input.cvId }),
        ...(input.jobId !== undefined && { jobId: input.jobId }),
        ...(input.document !== undefined && {
          document: input.document,
          revision: current.revision + 1,
        }),
        updatedAt: now(),
      }
      letters.set(letterId, next)
      return structuredClone(next)
    },
    async remove(letterId) {
      findLetter(letterId)
      letters.delete(letterId)
      shares.delete(letterId)
      for (const job of jobs.values())
        if (job.coverLetterId === letterId) jobs.set(job.id, { ...job, coverLetterId: null })
    },
    async duplicate(letterId) {
      const source = findLetter(letterId)
      return coverLetterApi.create({
        title: `Copy of ${source.title}`,
        cvId: source.cvId,
        document: structuredClone(source.document),
      })
    },
    async getShare(letterId) {
      findLetter(letterId)
      return share.get(letterId)
    },
    async setShare(letterId, isActive) {
      findLetter(letterId)
      return share.set(letterId, isActive)
    },
    async resetShare(letterId) {
      findLetter(letterId)
      return share.reset(letterId)
    },
  }

  return {
    api,
    jobsApi,
    coverLetterApi,
    letters,
    /** Adds a cover letter directly, as if it already existed on the server. */
    seedLetter(title: string, fields: Partial<CoverLetterRecord> = {}) {
      const time = now()
      const record: CoverLetterRecord = {
        id: id(),
        type: 'coverLetter',
        title,
        cvId: null,
        jobId: null,
        revision: 1,
        document: createCoverLetter({ today: new Date(2026, 9, 15) }),
        createdAt: time,
        updatedAt: time,
        ...fields,
      }
      letters.set(record.id, record)
      return record
    },
    jobs,
    /** Adds a job directly, as if it already existed on the server. */
    seedJob(input: CreateJobInput) {
      const { dateSaved, ...fields } = CreateJobInputSchema.parse(input)
      const time = now()
      const job: Job = {
        ...fields,
        id: id(),
        dateSaved: dateSaved ?? '2026-10-01',
        createdAt: time,
        updatedAt: time,
      }
      jobs.set(job.id, job)
      return job
    },
    cvs,
    /** Adds a CV directly, as if it already existed on the server. */
    seed(title: string, professionId: ProfessionId = 'software-developer') {
      const time = now()
      const record: CvRecord = {
        id: id(),
        type: 'cv',
        title,
        professionId,
        jobId: null,
        revision: 1,
        document: createExampleCv(professionId),
        createdAt: time,
        updatedAt: time,
      }
      cvs.set(record.id, record)
      return record
    },
    shares,
    reset() {
      cvs.clear()
      versions.clear()
      shares.clear()
      jobs.clear()
      letters.clear()
    },
  }
}

export type FakeCvApi = ReturnType<typeof createFakeCvApi>
