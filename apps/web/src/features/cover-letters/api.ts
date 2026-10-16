import {
  CoverLetterRecordSchema,
  DocumentSummarySchema,
  ShareStateSchema,
  type CoverLetterRecord,
  type CreateCoverLetterInput,
  type UpdateCoverLetterInput,
} from '@cv/shared'
import { z } from 'zod'
import { api } from '@/shared/api/client'

/** Typed calls to the cover letter endpoints, validated with the shared schemas. */
export const coverLetterApi = {
  async list() {
    const { data } = await api.get('/cover-letters')
    return z.array(DocumentSummarySchema).parse(data)
  },
  async get(id: string) {
    const { data } = await api.get(`/cover-letters/${id}`)
    return CoverLetterRecordSchema.parse(data)
  },
  async create(input: CreateCoverLetterInput = {}) {
    const { data } = await api.post('/cover-letters', input)
    return CoverLetterRecordSchema.parse(data)
  },
  async update(id: string, input: UpdateCoverLetterInput): Promise<CoverLetterRecord> {
    const { data } = await api.patch(`/cover-letters/${id}`, input)
    return CoverLetterRecordSchema.parse(data)
  },
  async remove(id: string) {
    await api.delete(`/cover-letters/${id}`)
  },
  async duplicate(id: string) {
    const { data } = await api.post(`/cover-letters/${id}/duplicate`)
    return CoverLetterRecordSchema.parse(data)
  },
  async getShare(id: string) {
    const { data } = await api.get(`/cover-letters/${id}/share`)
    return ShareStateSchema.parse(data)
  },
  async setShare(id: string, isActive: boolean) {
    const { data } = await api.put(`/cover-letters/${id}/share`, { isActive })
    return ShareStateSchema.parse(data)
  },
  async resetShare(id: string) {
    const { data } = await api.post(`/cover-letters/${id}/share/reset`)
    return ShareStateSchema.parse(data)
  },
}

export type CoverLetterApi = typeof coverLetterApi
