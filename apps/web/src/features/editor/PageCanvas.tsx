import type { CvDocument } from '@cv/shared'
import { CvRenderer } from '../../cv-renderer'
import type { RenderMode } from '../../cv-renderer/context'
import type { EditorApi } from '../../cv-renderer/editorApi'

/** The document pages in the editor and preview. */
export function PageCanvas({
  cv,
  title,
  mode,
  editor,
}: {
  cv: CvDocument | null
  title: string
  mode: RenderMode
  editor?: EditorApi
}) {
  if (!cv) {
    return (
      <div
        style={{ width: 794, minHeight: 1123 }}
        className="flex shrink-0 flex-col bg-white p-16 text-slate-800 shadow-lg"
      >
        <p className="text-lg font-semibold">{title}</p>
        <p className="mt-2 text-sm text-slate-500">The cover letter editor is built in Step 13.</p>
      </div>
    )
  }
  return <CvRenderer cv={cv} mode={mode} editor={editor} pageClassName="shrink-0 shadow-lg" />
}
