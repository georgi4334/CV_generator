import type { CvDocument } from '@cv/shared'
import { CvRenderer } from '../../cv-renderer'
import type { RenderMode } from '../../cv-renderer/context'
import type { EditorApi } from '../../cv-renderer/editorApi'

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
