import type { CreateJobInput, Job, UpdateJobInput } from '@cv/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cvApi } from './cvApi'
import { useRememberCv } from './cvQueries'
import { jobsApi } from './jobsApi'

export const jobKeys = { list: ['jobs'] as const }

const byNewest = (a: Job, b: Job) =>
  b.dateSaved.localeCompare(a.dateSaved) || b.createdAt.localeCompare(a.createdAt)

export function useJobs() {
  return useQuery({ queryKey: jobKeys.list, queryFn: jobsApi.list })
}

function useSetJobs() {
  const queryClient = useQueryClient()
  return (update: (jobs: Job[]) => Job[]) =>
    queryClient.setQueryData<Job[]>(jobKeys.list, (jobs) => (jobs ? update(jobs) : jobs))
}

export function useCreateJob() {
  const setJobs = useSetJobs()
  return useMutation({
    mutationFn: (input: CreateJobInput) => jobsApi.create(input),
    onSuccess: (job) => setJobs((jobs) => [job, ...jobs].sort(byNewest)),
  })
}

/** Saves a change at once in the list (inline edits feel instant) and undoes it if it fails. */
export function useUpdateJob() {
  const queryClient = useQueryClient()
  const setJobs = useSetJobs()
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: UpdateJobInput }) =>
      jobsApi.update(id, change),
    onMutate: async ({ id, change }) => {
      await queryClient.cancelQueries({ queryKey: jobKeys.list })
      const previous = queryClient.getQueryData<Job[]>(jobKeys.list)
      setJobs((jobs) => jobs.map((job) => (job.id === id ? { ...job, ...change } : job)))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(jobKeys.list, context.previous)
    },
    onSuccess: (saved) =>
      setJobs((jobs) => jobs.map((job) => (job.id === saved.id ? saved : job)).sort(byNewest)),
  })
}

export function useDeleteJob() {
  const setJobs = useSetJobs()
  return useMutation({
    mutationFn: (id: string) => jobsApi.remove(id),
    onSuccess: (_result, id) => setJobs((jobs) => jobs.filter((job) => job.id !== id)),
  })
}

/** "Create tailored copy": copies a CV for this job and links the job to the copy. */
export function useTailorCv() {
  const remember = useRememberCv()
  const setJobs = useSetJobs()
  return useMutation({
    mutationFn: ({ cvId, jobId }: { cvId: string; jobId: string }) => cvApi.duplicate(cvId, jobId),
    onSuccess: (copy, { jobId }) => {
      remember(copy)
      setJobs((jobs) => jobs.map((job) => (job.id === jobId ? { ...job, cvId: copy.id } : job)))
    },
  })
}
