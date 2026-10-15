import { JobSchema, type CreateJobInput, type UpdateJobInput } from '@cv/shared'
import { z } from 'zod'
import { api } from './api'

/** Typed calls to the Saved Jobs endpoints, validated with the shared schemas. */
export const jobsApi = {
  async list() {
    const { data } = await api.get('/jobs')
    return z.array(JobSchema).parse(data)
  },
  async create(input: CreateJobInput) {
    const { data } = await api.post('/jobs', input)
    return JobSchema.parse(data)
  },
  async update(id: string, input: UpdateJobInput) {
    const { data } = await api.patch(`/jobs/${id}`, input)
    return JobSchema.parse(data)
  },
  async remove(id: string) {
    await api.delete(`/jobs/${id}`)
  },
}

export type JobsApi = typeof jobsApi
