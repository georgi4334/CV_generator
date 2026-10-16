import type { DocumentSummary, DocumentType, ShareState } from '@cv/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coverLetterApi } from '@/features/cover-letters/api'
import { cvApi } from '@/features/cv-editor/api'
import { cvKeys } from '@/features/cv-editor/queries'
import { letterKeys } from '@/features/cover-letters/queries'

const SHARE_API = { cv: cvApi, coverLetter: coverLetterApi }
const KEYS = {
  cv: { share: cvKeys.share, list: cvKeys.list },
  coverLetter: { share: letterKeys.share, list: letterKeys.list },
}

export function useDocumentShare(type: DocumentType, id: string) {
  return useQuery({ queryKey: KEYS[type].share(id), queryFn: () => SHARE_API[type].getShare(id) })
}

/** Turns a share link on or off, or replaces it (`reset`); the list's "Shared" badge follows. */
export function useUpdateDocumentShare(type: DocumentType, id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (change: { isActive: boolean } | 'reset') =>
      change === 'reset'
        ? SHARE_API[type].resetShare(id)
        : SHARE_API[type].setShare(id, change.isActive),
    onSuccess: (state: ShareState) => {
      queryClient.setQueryData(KEYS[type].share(id), state)
      queryClient.setQueryData<DocumentSummary[]>(KEYS[type].list, (list) =>
        list?.map((item) =>
          item.id === id ? { ...item, shared: state.link?.isActive ?? false } : item,
        ),
      )
    },
  })
}

/** Public: the CV or cover letter behind a share link. */
export function useSharedDocument(slug: string) {
  return useQuery({
    queryKey: cvKeys.shared(slug),
    queryFn: () => cvApi.getShared(slug),
    retry: (count, error) => count < 2 && (error as { retryable?: boolean }).retryable === true,
  })
}
