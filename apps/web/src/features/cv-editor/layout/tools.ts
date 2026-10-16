import {
  ArrowDownUp,
  CircleCheck,
  LayoutTemplate,
  Palette,
  ScanSearch,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { i18n } from '@/i18n'
import type { EditorPanel } from '@/features/cv-editor/state/editorUi'

export interface Tool {
  icon: LucideIcon
  panel: EditorPanel
}

/** The panels of the editor, in toolbar order (AI Assistant first). */
export const AI_TOOL: Tool = { icon: Sparkles, panel: 'ai' }
export const CENTER_TOOLS: Tool[] = [
  { icon: CircleCheck, panel: 'fix' },
  { icon: ScanSearch, panel: 'tailor' },
  { icon: ArrowDownUp, panel: 'rearrange' },
  { icon: LayoutTemplate, panel: 'templates' },
  { icon: Palette, panel: 'design' },
]
export const ALL_TOOLS: Tool[] = [AI_TOOL, ...CENTER_TOOLS]

/** Why a tool does not apply to this kind of document, or null when it does. */
export function toolUnavailable(kind: 'cv' | 'coverLetter', panel: EditorPanel): string | null {
  if (kind !== 'coverLetter') return null
  if (panel === 'rearrange') return i18n.t('editor.topBar.noSectionsToRearrange')
  if (panel === 'tailor') return i18n.t('editor.topBar.tailorOnCvs')
  return null
}
