import type { DocumentSummary, Job, UpdateJobInput } from '@cv/shared'
import { createContext, useContext } from 'react'

/** What the editable cells need; provided by the Saved Jobs page. */
export interface JobActions {
  /** The user's CVs and cover letters, to link them to a job. */
  cvs: DocumentSummary[]
  letters: DocumentSummary[]
  update: (job: Job, change: UpdateJobInput) => void
  open: (job: Job) => void
  remove: (job: Job) => void
}

export const JobActionsContext = createContext<JobActions | null>(null)

export function useJobActions(): JobActions {
  const actions = useContext(JobActionsContext)
  if (!actions) throw new Error('useJobActions needs a JobActionsContext provider')
  return actions
}
