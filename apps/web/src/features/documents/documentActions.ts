import type { DocumentSummary } from '@cv/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { printCv, printDocument, printLetter } from '@/features/print/printCv'
import { coverLetterApi } from '@/features/cover-letters/api'
import { resignationApi } from '@/features/resignation/api'
import {
  resignationKeys,
  useDeleteResignations,
  useDuplicateResignation,
  useRenameResignation,
} from '@/features/resignation/queries'
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
  const renameResignation = useRenameResignation()
  const duplicateResignation = useDuplicateResignation()
  const deleteResignations = useDeleteResignations()
  const loadCv = useLoadCv()

  const remove = useMutation({
    mutationFn: async (docs: DocumentSummary[]) => {
      const ids = (type: DocumentSummary['type']) =>
        docs.filter((doc) => doc.type === type).map((doc) => doc.id)
      const results = await Promise.allSettled([
        ids('cv').length ? deleteCvs.mutateAsync(ids('cv')) : null,
        ids('coverLetter').length ? deleteLetters.mutateAsync(ids('coverLetter')) : null,
        ids('resignation').length ? deleteResignations.mutateAsync(ids('resignation')) : null,
      ])
      const failed = results.find((r) => r.status === 'rejected')
      if (failed) throw (failed as PromiseRejectedResult).reason
    },
  })

  return {
    rename: (doc: DocumentSummary, title: string) =>
      ({ cv: renameCv, coverLetter: renameLetter, resignation: renameResignation })[
        doc.type
      ].mutateAsync({ id: doc.id, title }),
    duplicate: (doc: DocumentSummary) =>
      ({ cv: duplicateCv, coverLetter: duplicateLetter, resignation: duplicateResignation })[
        doc.type
      ].mutateAsync(doc.id),
    remove,
    /** Loads the latest saved version and opens the print dialog with it. */
    download: async (doc: DocumentSummary) => {
      if (doc.type === 'cv') {
        const record = await loadCv(doc.id)
        printCv(record.document, record.title)
      } else if (doc.type === 'coverLetter') {
        const record = await queryClient.fetchQuery({
          queryKey: letterKeys.detail(doc.id),
          queryFn: () => coverLetterApi.get(doc.id),
          staleTime: 0,
        })
        printLetter(record.document, record.title)
      } else {
        const record = await queryClient.fetchQuery({
          queryKey: resignationKeys.detail(doc.id),
          queryFn: () => resignationApi.get(doc.id),
          staleTime: 0,
        })
        printDocument({ kind: 'resignation', letter: record.document }, record.title)
      }
    },
  }
}
