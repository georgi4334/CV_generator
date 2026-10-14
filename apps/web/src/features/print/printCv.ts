import type { CvDocument } from '@cv/shared'
import { create } from 'zustand'

export interface PrintJob {
  /** A new number per request, so asking again prints again. */
  id: number
  cv: CvDocument
  /** Browsers suggest the page title as the PDF file name. */
  title: string
}

export const usePrintJob = create<{ job: PrintJob | null }>()(() => ({ job: null }))

let nextId = 0

/**
 * "Download PDF", phase 1: opens the browser's print dialog with only the CV,
 * in preview mode, at its page size. "Save as PDF" there keeps the text
 * selectable, which applicant tracking systems need.
 */
export function printCv(cv: CvDocument, title: string) {
  usePrintJob.setState({ job: { id: ++nextId, cv, title } })
}
