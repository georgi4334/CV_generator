import type { CvDocument } from '@cv/shared'
import { CvRenderer } from '@/renderer'
import type { RenderMode } from '@/renderer/context'
import type { EditorApi } from '@/renderer/editing/editorApi'

/** The CV pages in the editor and preview. */
export function PageCanvas({
  cv,
  mode,
  editor,
}: {
  cv: CvDocument
  mode: RenderMode
  editor?: EditorApi
}) {
  return <CvRenderer cv={cv} mode={mode} editor={editor} pageClassName="shrink-0 shadow-lg" />
}
