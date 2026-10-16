import type { CoverLetterRecord, CreateCoverLetterInput, DocumentSummary } from '@cv/shared'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { coverLetterApi } from './api'
import { jobKeys } from '@/features/jobs/queries'

export const letterKeys = {
  list: ['cover-letters'] as const,
  detail: (id: string) => ['cover-letters', id] as const,
  share: (id: string) => ['cover-letters', id, 'share'] as const,
}

export function useCoverLetterList() {
  return useQuery({ queryKey: letterKeys.list, queryFn: coverLetterApi.list })
}

export function useCoverLetter(id: string | undefined) {
  return useQuery({
    queryKey: letterKeys.detail(id ?? ''),
    queryFn: () => coverLetterApi.get(id!),
    enabled: Boolean(id),
    // The editor owns the document while open; don't refetch under it.
    staleTime: Infinity,
    retry: (count, error) => count < 2 && (error as { retryable?: boolean }).retryable === true,
  })
}

/** Keeps the list and the detail cache in step after a letter changed on the server. */
export function rememberLetter(queryClient: QueryClient, record: CoverLetterRecord) {
  queryClient.setQueryData(letterKeys.detail(record.id), record)
  queryClient.setQueryData<DocumentSummary[]>(letterKeys.list, (list) => {
    if (!list) return list
    const summary: DocumentSummary = {
      id: record.id,
      type: 'coverLetter',
      title: record.title,
      jobId: record.jobId,
      shared: list.find((item) => item.id === record.id)?.shared ?? false,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
    const others = list.filter((item) => item.id !== record.id)
    return [summary, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  })
}

export function useRememberLetter() {
  const queryClient = useQueryClient()
  return (record: CoverLetterRecord) => rememberLetter(queryClient, record)
}

export function useCreateLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCoverLetterInput) => coverLetterApi.create(input),
    onSuccess: (record) => {
      rememberLetter(queryClient, record)
      // A letter for a job may have become that job's cover letter.
      if (record.jobId) void queryClient.invalidateQueries({ queryKey: jobKeys.list })
    },
  })
}

export function useDuplicateLetter() {
  const remember = useRememberLetter()
  return useMutation({
    mutationFn: (id: string) => coverLetterApi.duplicate(id),
    onSuccess: remember,
  })
}

export function useRenameLetter() {
  const remember = useRememberLetter()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      coverLetterApi.update(id, { title }),
    onSuccess: remember,
  })
}

/** Links the letter to a CV or job (not part of the document, so no revision needed). */
export function useLinkLetter() {
  const remember = useRememberLetter()
  return useMutation({
    mutationFn: ({ id, ...links }: { id: string; cvId?: string | null; jobId?: string | null }) =>
      coverLetterApi.update(id, links),
    onSuccess: remember,
  })
}

export function useDeleteLetters() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => coverLetterApi.remove(id)))
      const failed = ids.filter((_, i) => results[i]!.status === 'rejected')
      if (failed.length > 0)
        throw new Error(`${failed.length} of ${ids.length} could not be deleted`)
    },
    onSettled: (_data, _error, ids) => {
      for (const id of ids) queryClient.removeQueries({ queryKey: letterKeys.detail(id) })
      // Jobs that pointed at a deleted letter are unlinked on the server.
      void queryClient.invalidateQueries({ queryKey: jobKeys.list })
      return queryClient.invalidateQueries({ queryKey: letterKeys.list, exact: true })
    },
  })
}
