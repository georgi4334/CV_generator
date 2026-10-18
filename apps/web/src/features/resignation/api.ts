import {
  DocumentSummarySchema,
  ResignationRecordSchema,
  ShareStateSchema,
  type CreateResignationInput,
  type ResignationRecord,
  type UpdateResignationInput,
  type UpdateShareInput,
} from '@cv/shared'
import { z } from 'zod'
import { api } from '@/shared/api/client'

/** Typed calls to the resignation letter endpoints, validated with the shared schemas. */
export const resignationApi = {
  async list() {
    const { data } = await api.get('/resignations')
    return z.array(DocumentSummarySchema).parse(data)
  },
  async get(id: string) {
    const { data } = await api.get(`/resignations/${id}`)
    return ResignationRecordSchema.parse(data)
  },
  async create(input: CreateResignationInput = {}) {
    const { data } = await api.post('/resignations', input)
    return ResignationRecordSchema.parse(data)
  },
  async update(id: string, input: UpdateResignationInput): Promise<ResignationRecord> {
    const { data } = await api.patch(`/resignations/${id}`, input)
    return ResignationRecordSchema.parse(data)
  },
  async remove(id: string) {
    await api.delete(`/resignations/${id}`)
  },
  async duplicate(id: string) {
    const { data } = await api.post(`/resignations/${id}/duplicate`)
    return ResignationRecordSchema.parse(data)
  },
  async getShare(id: string) {
    const { data } = await api.get(`/resignations/${id}/share`)
    return ShareStateSchema.parse(data)
  },
  async setShare(id: string, change: UpdateShareInput) {
    const { data } = await api.put(`/resignations/${id}/share`, change)
    return ShareStateSchema.parse(data)
  },
  async resetShare(id: string) {
    const { data } = await api.post(`/resignations/${id}/share/reset`)
    return ShareStateSchema.parse(data)
  },
}
