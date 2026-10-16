import {
  CvRecordSchema,
  CvVersionSummarySchema,
  CvDocumentSchema,
  DocumentSummarySchema,
  SharedDocumentSchema,
  ShareStateSchema,
  UploadSchema,
  type CreateCvInput,
  type CvRecord,
  type UpdateCvInput,
} from '@cv/shared'
import { z } from 'zod'
import { api } from '@/shared/api/client'

/** Typed calls to the CV endpoints. Responses are validated against the shared schemas. */
export const cvApi = {
  async list() {
    const { data } = await api.get('/cvs')
    return z.array(DocumentSummarySchema).parse(data)
  },
  async get(id: string) {
    const { data } = await api.get(`/cvs/${id}`)
    return CvRecordSchema.parse(data)
  },
  async create(input: CreateCvInput = {}) {
    const { data } = await api.post('/cvs', input)
    return CvRecordSchema.parse(data)
  },
  async update(id: string, input: UpdateCvInput): Promise<CvRecord> {
    const { data } = await api.patch(`/cvs/${id}`, input)
    return CvRecordSchema.parse(data)
  },
  async remove(id: string) {
    await api.delete(`/cvs/${id}`)
  },
  /** A copy; with `jobId`, a copy tailored for that job, which then links to it. */
  async duplicate(id: string, jobId?: string) {
    const { data } = await api.post(`/cvs/${id}/duplicate`, jobId ? { jobId } : {})
    return CvRecordSchema.parse(data)
  },
  async listVersions(id: string) {
    const { data } = await api.get(`/cvs/${id}/versions`)
    return z.array(CvVersionSummarySchema).parse(data)
  },
  async getVersion(id: string, versionId: string) {
    const { data } = await api.get(`/cvs/${id}/versions/${versionId}`)
    return CvVersionSummarySchema.extend({ document: CvDocumentSchema }).parse(data)
  },
  async createVersion(id: string, label?: string) {
    const { data } = await api.post(`/cvs/${id}/versions`, label ? { label } : {})
    return CvVersionSummarySchema.parse(data)
  },
  async restoreVersion(id: string, versionId: string) {
    const { data } = await api.post(`/cvs/${id}/versions/${versionId}/restore`)
    return CvRecordSchema.parse(data)
  },
  async getShare(id: string) {
    const { data } = await api.get(`/cvs/${id}/share`)
    return ShareStateSchema.parse(data)
  },
  /** The first call creates the link; later calls turn it on or off. */
  async setShare(id: string, isActive: boolean) {
    const { data } = await api.put(`/cvs/${id}/share`, { isActive })
    return ShareStateSchema.parse(data)
  },
  /** A new address; the old link stops working. */
  async resetShare(id: string) {
    const { data } = await api.post(`/cvs/${id}/share/reset`)
    return ShareStateSchema.parse(data)
  },
  /** Public: what a share link shows (a CV or a cover letter). */
  async getShared(slug: string) {
    const { data } = await api.get(`/shared/${encodeURIComponent(slug)}`)
    return SharedDocumentSchema.parse(data)
  },
  async uploadImage(image: Blob, filename = 'image') {
    const form = new FormData()
    form.append('file', image, filename)
    const { data } = await api.post('/uploads', form)
    return UploadSchema.parse(data)
  },
}

export type CvApi = typeof cvApi
