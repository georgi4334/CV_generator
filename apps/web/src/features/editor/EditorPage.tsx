import type { DocumentType } from '@cv/shared'
import { useEffect } from 'react'
import { useParams } from 'react-router'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { useEditorUi } from '../../stores/editorUi'
import { EditorRightRail } from './EditorRightRail'
import { EditorSidePanel } from './EditorSidePanel'
import { EditorTopBar } from './EditorTopBar'
import { PageCanvas } from './PageCanvas'
import { Toast } from './Toast'
import { useEditorDocument } from './useEditorDocument'

export function EditorPage({ type }: { type: DocumentType }) {
  const { id } = useParams()
  const doc = useEditorDocument(type, id)
  const activePanel = useEditorUi((s) => s.activePanel)
  const closePanel = useEditorUi((s) => s.closePanel)

  // Start each document with the side panel closed.
  useEffect(() => closePanel, [id, closePanel])

  if (!doc) return <NotFoundPage />

  const base = type === 'cv' ? '/cvs' : '/cover-letters'
  const backTo = type === 'cv' ? '/documents/cvs' : '/documents/cover-letters'

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EditorTopBar title={doc.title} backTo={backTo} />
      <div className="flex min-h-0 flex-1">
        {activePanel && <EditorSidePanel panel={activePanel} />}
        <div className="flex-1 overflow-auto">
          <div className="flex min-w-max justify-center gap-4 px-6 py-8">
            <PageCanvas cv={doc.cv} title={doc.title} mode="edit" />
            <EditorRightRail previewTo={`${base}/${doc.id}/preview`} />
          </div>
        </div>
      </div>
      <Toast />
    </div>
  )
}
