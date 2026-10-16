import type { DocumentSummary } from '@cv/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { printCv, printLetter } from '@/features/print/printCv'
import { coverLetterApi } from '@/features/cover-letters/api'
import { useDeleteCvs, useDuplicateCv, useLoadCv, useRenameCv } from '@/features/cv-editor/queries'
import {
  letterKeys,
  useDeleteLetters,
  useDuplicateLetter,
  useRenameLetter,
} from '@/features/cover-letters/queries'

/** Rename, copy, delete and download for the Documents list, whatever the document type. */
export function useDocumentActions() {
  const queryClient = useQueryClient()
  const renameCv = useRenameCv()
  const renameLetter = useRenameLetter()
  const duplicateCv = useDuplicateCv()
  const duplicateLetter = useDuplicateLetter()
  const deleteCvs = useDeleteCvs()
  const deleteLetters = useDeleteLetters()
  const loadCv = useLoadCv()

  const remove = useMutation({
    mutationFn: async (docs: DocumentSummary[]) => {
      const ids = (type: DocumentSummary['type']) =>
        docs.filter((doc) => doc.type === type).map((doc) => doc.id)
      const results = await Promise.allSettled([
        ids('cv').length ? deleteCvs.mutateAsync(ids('cv')) : null,
        ids('coverLetter').length ? deleteLetters.mutateAsync(ids('coverLetter')) : null,
      ])
      const failed = results.find((r) => r.status === 'rejected')
      if (failed) throw (failed as PromiseRejectedResult).reason
    },
  })

  return {
    rename: (doc: DocumentSummary, title: string) =>
      (doc.type === 'cv' ? renameCv : renameLetter).mutateAsync({ id: doc.id, title }),
    duplicate: (doc: DocumentSummary) =>
      (doc.type === 'cv' ? duplicateCv : duplicateLetter).mutateAsync(doc.id),
    remove,
    /** Loads the latest saved version and opens the print dialog with it. */
    download: async (doc: DocumentSummary) => {
      if (doc.type === 'cv') {
        const record = await loadCv(doc.id)
        printCv(record.document, record.title)
      } else {
        const record = await queryClient.fetchQuery({
          queryKey: letterKeys.detail(doc.id),
          queryFn: () => coverLetterApi.get(doc.id),
          staleTime: 0,
        })
        printLetter(record.document, record.title)
      }
    },
  }
}
