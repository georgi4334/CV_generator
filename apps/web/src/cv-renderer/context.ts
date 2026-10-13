import type { CvLanguage } from '@cv/shared'
import { createContext, useContext } from 'react'

export type RenderMode = 'edit' | 'preview'
export type TitleVariant = 'underline' | 'accent-rule' | 'accent-small'

export interface RenderContextValue {
  mode: RenderMode
  language: CvLanguage
  titleVariant: TitleVariant
  /** Single-column templates list skills inline instead of one per line. */
  inlineSkills: boolean
}

export const RenderContext = createContext<RenderContextValue>({
  mode: 'edit',
  language: 'en-US',
  titleVariant: 'underline',
  inlineSkills: false,
})

export const useRender = () => useContext(RenderContext)
