import type { CoverLetterDocument, CvDocument } from '@cv/shared'
import { create } from 'zustand'

/** What to print: a CV or a cover letter. */
export type Printable =
  { kind: 'cv'; cv: CvDocument } | { kind: 'coverLetter'; letter: CoverLetterDocument }

export interface PrintJob {
  /** A new number per request, so asking again prints again. */
  id: number
  doc: Printable
  /** Browsers suggest the page title as the PDF file name. */
  title: string
}

export const usePrintJob = create<{ job: PrintJob | null }>()(() => ({ job: null }))

let nextId = 0

/**
 * "Download PDF", phase 1: opens the browser's print dialog with only the
 * document, in preview mode, at its page size. "Save as PDF" there keeps the
 * text selectable, which applicant tracking systems need.
 */
export function printDocument(doc: Printable, title: string) {
  usePrintJob.setState({ job: { id: ++nextId, doc, title } })
}

export const printCv = (cv: CvDocument, title: string) => printDocument({ kind: 'cv', cv }, title)

export const printLetter = (letter: CoverLetterDocument, title: string) =>
  printDocument({ kind: 'coverLetter', letter }, title)
