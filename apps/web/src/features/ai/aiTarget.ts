import type { AiField, AiSuggestion, CvLanguage } from '@cv/shared'
import { createContext, useContext } from 'react'

/** An experience or project entry the assistant can write bullets for. */
export interface BulletEntry {
  /** `sections.<id>.items.<id>` */
  path: string
  label: string
  sectionId: string
  itemId: string
}

/**
 * What the AI panels need from the open document. The CV editor and the
 * cover-letter editor each provide one, so the panels work for both.
 */
export interface AiTarget {
  kind: 'cv' | 'coverLetter'
  language: CvLanguage
  /** The document's text as it is now. */
  fields: AiField[]
  getText: (path: string) => string | null
  /** One undo step per call. */
  setText: (path: string, text: string) => void
  cv?: {
    id: string
    title: string
    jobId: string | null
    summaryPath: string | null
    entries: BulletEntry[]
    setBullets: (entry: BulletEntry, bullets: string[]) => void
    /** Copies the CV with the rewrites applied (for a job, linked to it); returns the copy's id. */
    createTailoredCopy: (rewrites: AiSuggestion[], jobId: string | null) => Promise<string>
  }
  letter?: {
    cvId: string | null
    jobId: string | null
    setParagraphs: (paragraphs: string[]) => void
  }
}

export const AiTargetContext = createContext<AiTarget | null>(null)

export function useAiTarget(): AiTarget {
  const target = useContext(AiTargetContext)
  if (!target) throw new Error('useAiTarget needs an AiTargetContext provider')
  return target
}
