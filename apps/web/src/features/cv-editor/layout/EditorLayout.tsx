import type { PageSize } from '@cv/shared'
import type { ReactNode } from 'react'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { PAGE_SIZE_PX } from '@/renderer/templates/tokens'
import { useBreakpoint } from '@/shared/lib/useBreakpoint'
import { FitToWidth } from '@/shared/ui/FitToWidth'
import { DOC_TRANSITION_NAME } from '@/shared/lib/viewTransitions'
import { EditorRail } from './EditorRail'
import { EditorSidePanel } from './EditorSidePanel'
import { EditorToolbar } from './EditorToolbar'
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
  /** The document's paper size: on phones the page is scaled to the screen width. */
  pageSize: PageSize
  children: ReactNode
}

/** Top bar, left panel, page area and action rail shared by the CV and cover letter editors. */
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
  kind = 'cv',
  pageSize,
  children,
}: EditorLayoutProps) {
  const activePanel = useEditorUi((s) => s.activePanel)
  // Phones and small tablets: bottom toolbar, panels as a sheet, page fitted to the width.
  const compact = !useBreakpoint('lg')
  return (
    <div className="app-backdrop flex h-dvh flex-col text-fg">
      <EditorTopBar
        title={title}
        status={status}
        backTo={backTo}
        historyEnabled={Boolean(cvId)}
        undoRedo={undoRedo}
        kind={kind}
        compact={compact}
        previewTo={previewTo}
        onDownload={onDownload}
        onShare={onShare}
      />
      {banner}
      <div className="flex min-h-0 flex-1">
        {activePanel && <EditorSidePanel panel={activePanel} cvId={cvId} sheet={compact} />}
        <div className="flex-1 overflow-auto">
          {compact ? (
            <div className="px-gutter py-section">
              <div style={{ viewTransitionName: DOC_TRANSITION_NAME }}>
                <FitToWidth width={PAGE_SIZE_PX[pageSize].width}>{children}</FitToWidth>
              </div>
            </div>
          ) : (
            <div className="flex min-w-max justify-center gap-4 px-6 py-6">
              <EditorRail previewTo={previewTo} onDownload={onDownload} onShare={onShare} />
              {/* The page zooms open from its thumbnail and shrinks back into it. */}
              <div style={{ viewTransitionName: DOC_TRANSITION_NAME }}>{children}</div>
              {/* As wide as the rail, so the page stays centred. */}
              <div aria-hidden className="w-11 shrink-0" />
            </div>
          )}
        </div>
      </div>
      {compact && <EditorToolbar kind={kind} />}
      <Toast raised={compact} />
    </div>
  )
}
