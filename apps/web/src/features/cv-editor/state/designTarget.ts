import type { CvDesign, CvLanguage, TemplateId } from '@cv/shared'
import { createContext, useContext, type ReactNode } from 'react'
import { useCvEditor } from './cvEditorStore'

/** What the Templates and Design & Font panels change: the open CV or cover letter. */
export interface DesignTarget {
  kind: 'cv' | 'coverLetter'
  design: CvDesign | null
  language: CvLanguage
  /** Pass a key per control so dragging a slider is one undo step. */
  updateDesign: (patch: Partial<CvDesign>, coalesceKey?: string) => void
  endTyping: () => void
  setLanguage: (language: CvLanguage) => void
  /** The document in another template, for the Templates panel (default: the open CV). */
  renderThumbnail?: (templateId: TemplateId) => ReactNode
}

/** Set by the cover letter editor; without it the panels edit the open CV. */
export const DesignTargetContext = createContext<DesignTarget | null>(null)

export function useDesignTarget(): DesignTarget {
  const target = useContext(DesignTargetContext)
  const cv = useCvEditor((s) => s.cv)
  const updateDesign = useCvEditor((s) => s.updateDesign)
  const endTyping = useCvEditor((s) => s.endTyping)
  const setLanguage = useCvEditor((s) => s.setLanguage)
  return (
    target ?? {
      kind: 'cv',
      design: cv?.design ?? null,
      language: cv?.language ?? 'en-US',
      updateDesign,
      endTyping,
      setLanguage,
    }
  )
}
