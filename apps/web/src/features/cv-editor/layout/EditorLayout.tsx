import type { ReactNode } from 'react'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { EditorRightRail } from './EditorRightRail'
import { EditorSidePanel } from './EditorSidePanel'
import { EditorTopBar, type UndoRedo } from './EditorTopBar'
import { Toast } from './Toast'

interface EditorLayoutProps {
  title: ReactNode
  status?: ReactNode
  backTo: string
  previewTo: string
  /** Set for saved CVs: enables History. */
  cvId?: string
  /** Shown between the top bar and the page (e.g. conflict warning). */
  banner?: ReactNode
  onDownload?: () => void
  onShare?: () => void
  /** For a cover letter: its undo/redo and which tools apply. */
  undoRedo?: UndoRedo
  kind?: 'cv' | 'coverLetter'
  children: ReactNode
}

/** Top bar, left panel, page area and right rail shared by the CV and cover letter editors. */
export function EditorLayout({
  title,
  status,
  backTo,
  previewTo,
  cvId,
  banner,
  onDownload,
  onShare,
  undoRedo,
  kind,
  children,
}: EditorLayoutProps) {
  const activePanel = useEditorUi((s) => s.activePanel)
  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EditorTopBar
        title={title}
        status={status}
        backTo={backTo}
        historyEnabled={Boolean(cvId)}
        undoRedo={undoRedo}
        kind={kind}
      />
      {banner}
      <div className="flex min-h-0 flex-1">
        {activePanel && <EditorSidePanel panel={activePanel} cvId={cvId} />}
        <div className="flex-1 overflow-auto">
          <div className="flex min-w-max justify-center gap-4 px-6 py-8">
            {children}
            <EditorRightRail previewTo={previewTo} onDownload={onDownload} onShare={onShare} />
          </div>
        </div>
      </div>
      <Toast />
    </div>
  )
}
