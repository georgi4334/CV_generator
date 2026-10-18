import type { CvLanguage } from '@cv/shared'
import { createContext, useContext } from 'react'
import type { EditorApi } from './editing/editorApi'

export type RenderMode = 'edit' | 'preview'
export type TitleVariant = 'underline' | 'accent-rule' | 'accent-small' | 'bar' | 'pill'

export interface RenderContextValue {
  mode: RenderMode
  language: CvLanguage
  titleVariant: TitleVariant
  /** Single-column templates list skills inline instead of one per line. */
  inlineSkills: boolean
  /** Entries are drawn on a vertical timeline (Timeline template). */
  timeline: boolean
  /** True inside the hidden copy used for measuring: render static text, no controls. */
  measuring: boolean
  /** A share link that hides personal details: the stand-ins for them are drawn blurred. */
  hidePersonal: boolean
  /** Thumbnails sit inside a link of their own: links on the page are drawn as plain text. */
  staticLinks: boolean
  editor: EditorApi | null
}

export const RenderContext = createContext<RenderContextValue>({
  mode: 'edit',
  language: 'en-US',
  titleVariant: 'underline',
  inlineSkills: false,
  timeline: false,
  measuring: false,
  hidePersonal: false,
  staticLinks: false,
  editor: null,
})

export const useRender = () => useContext(RenderContext)

/** The editor API when the current render is interactive, otherwise null. */
export function useEditor(): EditorApi | null {
  const { mode, measuring, editor } = useRender()
  return mode === 'edit' && !measuring ? editor : null
}
