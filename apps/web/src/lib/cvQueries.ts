import type { CreateCvInput, CvRecord, DocumentSummary } from '@cv/shared'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { cvApi } from './cvApi'

export const cvKeys = {
  list: ['cvs'] as const,
  detail: (id: string) => ['cvs', id] as const,
  versions: (id: string) => ['cvs', id, 'versions'] as const,
  version: (id: string, versionId: string) => ['cvs', id, 'versions', versionId] as const,
}

export function useCvList() {
  return useQuery({ queryKey: cvKeys.list, queryFn: cvApi.list })
}

export function useCv(id: string | undefined) {
  return useQuery({
    queryKey: cvKeys.detail(id ?? ''),
    queryFn: () => cvApi.get(id!),
    enabled: Boolean(id),
    // The editor owns the document while open; don't refetch under it.
    staleTime: Infinity,
    retry: (count, error) => count < 2 && (error as { retryable?: boolean }).retryable === true,
  })
}

export function useCvVersions(id: string, enabled = true) {
  return useQuery({ queryKey: cvKeys.versions(id), queryFn: () => cvApi.listVersions(id), enabled })
}

export function useCvVersion(id: string, versionId: string | null) {
  return useQuery({
    queryKey: cvKeys.version(id, versionId ?? ''),
    queryFn: () => cvApi.getVersion(id, versionId!),
    enabled: Boolean(versionId),
    staleTime: Infinity,
  })
}

/** Keeps the list and the detail cache in step after a CV changed on the server. */
export function rememberCv(queryClient: QueryClient, record: CvRecord) {
  queryClient.setQueryData(cvKeys.detail(record.id), record)
  queryClient.setQueryData<DocumentSummary[]>(cvKeys.list, (list) => {
    if (!list) return list
    const summary: DocumentSummary = {
      id: record.id,
      type: 'cv',
      title: record.title,
      jobId: record.jobId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
    const others = list.filter((item) => item.id !== record.id)
    return [summary, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  })
}

export function useRememberCv() {
  const queryClient = useQueryClient()
  return (record: CvRecord) => rememberCv(queryClient, record)
}

export function useCreateCv() {
  const remember = useRememberCv()
  return useMutation({
    mutationFn: (input: CreateCvInput = {}) => cvApi.create(input),
    onSuccess: remember,
  })
}

export function useDuplicateCv() {
  const remember = useRememberCv()
  return useMutation({ mutationFn: cvApi.duplicate, onSuccess: remember })
}

export function useRenameCv() {
  const remember = useRememberCv()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => cvApi.update(id, { title }),
    onSuccess: remember,
  })
}

export function useDeleteCvs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      // One by one, so a failure reports which ones were not deleted.
      const results = await Promise.allSettled(ids.map((id) => cvApi.remove(id)))
      const failed = ids.filter((_, i) => results[i]!.status === 'rejected')
      if (failed.length > 0)
        throw new Error(`${failed.length} of ${ids.length} could not be deleted`)
    },
    onSettled: (_data, _error, ids) => {
      for (const id of ids) queryClient.removeQueries({ queryKey: cvKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: cvKeys.list, exact: true })
    },
  })
}
