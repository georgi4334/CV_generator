import type { PageSize } from '@cv/shared'
import { useState, type ReactNode } from 'react'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { PAGE_SIZE_PX } from '@/renderer/templates/tokens'
import { useBreakpoint } from '@/shared/lib/useBreakpoint'
import { FitToWidth } from '@/shared/ui/FitToWidth'
import { DOC_TRANSITION_NAME } from '@/shared/lib/viewTransitions'
import { EditorRail } from './EditorRail'
import { EditorSidePanel } from './EditorSidePanel'
import { EditorToolbar } from './EditorToolbar'
import { EditorTopBar, type UndoRedo } from './EditorTopBar'
import { ZoomControl } from './ZoomControl'

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
  /** The document's paper size: the page is fitted to the screen width, or zoomed. */
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
  const zoom = useEditorUi((s) => s.zoom)
  // The scale at which the page fits the screen (at most 1), for "Fit" and the percentage.
  const [fit, setFit] = useState(1)
  const pageWidth = PAGE_SIZE_PX[pageSize].width
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
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-auto">
            <div
              className={
                compact
                  ? 'px-gutter pt-section pb-zoom-clear'
                  : 'flex gap-4 px-6 pt-6 pb-zoom-clear'
              }
            >
              {!compact && (
                <EditorRail previewTo={previewTo} onDownload={onDownload} onShare={onShare} />
              )}
              <div className="min-w-0 flex-1">
                <FitToWidth
                  width={pageWidth}
                  scale={zoom === null ? null : zoom / 100}
                  onFit={setFit}
                  // The page zooms open from its thumbnail and shrinks back into it.
                  boxStyle={{ viewTransitionName: DOC_TRANSITION_NAME }}
                >
                  {children}
                </FitToWidth>
              </div>
              {/* As wide as the rail, so the page stays centred. */}
              {!compact && <div aria-hidden className="w-11 shrink-0" />}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-(--z-raised) flex justify-center">
            <ZoomControl percent={zoom ?? Math.round(fit * 100)} fitted={zoom === null} />
          </div>
        </div>
      </div>
      {compact && <EditorToolbar kind={kind} />}
    </div>
  )
}
