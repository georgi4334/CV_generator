import {
  createEmptyCv,
  createExampleCv,
  PROFESSIONS,
  type CvDocument,
  type CvRecord,
  type CvVersionSummary,
  type DocumentSummary,
  type ProfessionId,
  type ShareLink,
} from '@cv/shared'
import { ApiRequestError } from '../lib/api'
import type { CvApi } from '../lib/cvApi'

interface Version extends CvVersionSummary {
  document: CvDocument
}

/** In-memory stand-in for the CV API, with the same rules (revisions, 404s). */
export function createFakeCvApi() {
  const cvs = new Map<string, CvRecord>()
  const versions = new Map<string, Version[]>()
  const shares = new Map<string, ShareLink>()
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
    },
    async duplicate(cvId) {
      const source = find(cvId)
      return api.create({
        title: `Copy of ${source.title}`,
        document: structuredClone(source.document),
      })
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
      return { link: structuredClone(shares.get(cvId) ?? null) }
    },
    async setShare(cvId, isActive) {
      find(cvId)
      const time = now()
      const current = shares.get(cvId)
      const link: ShareLink = current
        ? { ...current, isActive, updatedAt: time }
        : { slug: `slug${++seq}AbCdEfGh`, isActive, createdAt: time, updatedAt: time }
      shares.set(cvId, link)
      return { link: structuredClone(link) }
    },
    async resetShare(cvId) {
      await api.setShare(cvId, true)
      const link = { ...shares.get(cvId)!, slug: `slug${++seq}NewLink0` }
      shares.set(cvId, link)
      return { link: structuredClone(link) }
    },
    async getShared(slug) {
      const entry = [...shares.entries()].find(([, link]) => link.slug === slug && link.isActive)
      const cv = entry && cvs.get(entry[0])
      if (!cv) throw new ApiRequestError(404, 'not_found', 'Shared document not found')
      return {
        type: 'cv' as const,
        title: cv.title,
        document: structuredClone(cv.document),
        updatedAt: cv.updatedAt,
      }
    },
    async uploadImage() {
      return { id: id(), url: `/api/uploads/${id()}`, contentType: 'image/png', size: 100 }
    },
  }

  return {
    api,
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
    },
  }
}

export type FakeCvApi = ReturnType<typeof createFakeCvApi>
