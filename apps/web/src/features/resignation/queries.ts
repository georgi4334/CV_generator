import type { CreateResignationInput, DocumentSummary, ResignationRecord } from '@cv/shared'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { resignationApi } from './api'

export const resignationKeys = {
  list: ['resignations'] as const,
  detail: (id: string) => ['resignations', id] as const,
  share: (id: string) => ['resignations', id, 'share'] as const,
}

export function useResignationList() {
  return useQuery({ queryKey: resignationKeys.list, queryFn: resignationApi.list })
}

export function useResignation(id: string | undefined) {
  return useQuery({
    queryKey: resignationKeys.detail(id ?? ''),
    queryFn: () => resignationApi.get(id!),
    enabled: Boolean(id),
    // The editor owns the document while open; don't refetch under it.
    staleTime: Infinity,
    retry: (count, error) => count < 2 && (error as { retryable?: boolean }).retryable === true,
  })
}

/** Keeps the list and the detail cache in step after a letter changed on the server. */
export function rememberResignation(queryClient: QueryClient, record: ResignationRecord) {
  queryClient.setQueryData(resignationKeys.detail(record.id), record)
  queryClient.setQueryData<DocumentSummary[]>(resignationKeys.list, (list) => {
    if (!list) return list
    const summary: DocumentSummary = {
      id: record.id,
      type: 'resignation',
      title: record.title,
      jobId: null,
      shared: list.find((item) => item.id === record.id)?.shared ?? false,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
    const others = list.filter((item) => item.id !== record.id)
    return [summary, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  })
}

export function useRememberResignation() {
  const queryClient = useQueryClient()
  return (record: ResignationRecord) => rememberResignation(queryClient, record)
}

export function useCreateResignation() {
  const remember = useRememberResignation()
  return useMutation({
    mutationFn: (input: CreateResignationInput) => resignationApi.create(input),
    onSuccess: remember,
  })
}

export function useDuplicateResignation() {
  const remember = useRememberResignation()
  return useMutation({
    mutationFn: (id: string) => resignationApi.duplicate(id),
    onSuccess: remember,
  })
}

export function useRenameResignation() {
  const remember = useRememberResignation()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      resignationApi.update(id, { title }),
    onSuccess: remember,
  })
}

export function useDeleteResignations() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => resignationApi.remove(id)))
      const failed = ids.filter((_, i) => results[i]!.status === 'rejected')
      if (failed.length > 0)
        throw new Error(`${failed.length} of ${ids.length} could not be deleted`)
    },
    onSettled: (_data, _error, ids) => {
      for (const id of ids) queryClient.removeQueries({ queryKey: resignationKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: resignationKeys.list, exact: true })
    },
  })
}
