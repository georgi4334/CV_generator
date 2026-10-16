import { ArrowLeft, CircleHelp, History, PanelLeft, Redo2, Undo2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LanguageSelect } from '@/shared/ui/LanguageSelect'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { EditorMoreMenu } from './EditorMoreMenu'
import { CENTER_TOOLS, toolUnavailable } from './tools'

const toolButton =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-tight px-2.5 py-1.5 text-sm text-fg-soft hover:bg-muted'
const activeTool = 'bg-brand-soft text-brand-fg'
const iconButton = 'btn-icon'

interface EditorTopBarProps {
  /** The document title (editable for CVs). */
  title: ReactNode
  /** Save status shown next to the title. */
  status?: ReactNode
  backTo: string
  /** Version history is only available for saved CVs. */
  historyEnabled?: boolean
  /** Undo/redo of the open document (default: the CV editor). */
  undoRedo?: UndoRedo
  /** Which tools apply: a cover letter has no sections to rearrange. */
  kind?: 'cv' | 'coverLetter'
  /** Phones and small tablets: tools move to the bottom toolbar, the rest to a "More" menu. */
  compact?: boolean
  previewTo: string
  onDownload?: () => void
  onShare?: () => void
}

export interface UndoRedo {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

export function EditorTopBar({
  title,
  status,
  backTo,
  historyEnabled = false,
  undoRedo,
  kind = 'cv',
  compact = false,
  previewTo,
  onDownload,
  onShare,
}: EditorTopBarProps) {
  const { t } = useTranslation()
  const { activePanel, togglePanel, notify } = useEditorUi()
  const cvCanUndo = useCvEditor((s) => s.past.length > 0)
  const cvCanRedo = useCvEditor((s) => s.future.length > 0)
  const cvUndo = useCvEditor((s) => s.undo)
  const cvRedo = useCvEditor((s) => s.redo)
  const { canUndo, canRedo, undo, redo } = undoRedo ?? {
    canUndo: cvCanUndo,
    canRedo: cvCanRedo,
    undo: cvUndo,
    redo: cvRedo,
  }
  const [helpOpen, setHelpOpen] = useState(false)

  const undoRedoButtons = (
    <>
      <button
        type="button"
        className={iconButton}
        disabled={!canUndo}
        onClick={undo}
        aria-label={t('editor.topBar.undo')}
        title={t('editor.topBar.undoTitle')}
      >
        <Undo2 className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        disabled={!canRedo}
        onClick={redo}
        aria-label={t('editor.topBar.redo')}
        title={t('editor.topBar.redoTitle')}
      >
        <Redo2 className="size-4" />
      </button>
    </>
  )

  if (compact) {
    return (
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line bg-surface px-2">
        <Link
          to={backTo}
          className={iconButton}
          aria-label={t('editor.topBar.backToDocuments')}
          title={t('editor.topBar.backToDocuments')}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-fg-muted [&>*:first-child]:min-w-0 [&>*:first-child]:truncate">
          {title}
          {status}
        </div>
        {undoRedoButtons}
        <EditorMoreMenu
          previewTo={previewTo}
          onDownload={onDownload}
          onShare={onShare}
          historyEnabled={historyEnabled}
        />
      </header>
    )
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Link
          to={backTo}
          className={iconButton}
          aria-label={t('editor.topBar.backToDocuments')}
          title={t('editor.topBar.backToDocuments')}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <button
          type="button"
          className={`${toolButton} ${activePanel === 'ai' ? activeTool : ''}`}
          aria-pressed={activePanel === 'ai'}
          aria-label={t('editor.panels.ai')}
          title={t('editor.panels.ai')}
          onClick={() => togglePanel('ai')}
        >
          <PanelLeft className="size-4" />{' '}
          <span className="hidden 2xl:inline">{t('editor.panels.ai')}</span>
        </button>
        {/* Keeps room for the title when the tool names are long (e.g. in Bulgarian). */}
        <span className="ml-2 hidden min-w-40 items-center gap-2 text-sm text-fg-muted lg:flex">
          {title}
          {status}
        </span>
      </div>

      <nav aria-label={t('editor.topBar.tools')} className="flex items-center gap-0.5">
        {CENTER_TOOLS.map(({ icon: Icon, panel }) => {
          const label = t(`editor.panels.${panel}`)
          const active = activePanel === panel
          return (
            <button
              key={panel}
              type="button"
              className={`${toolButton} ${active ? activeTool : ''}`}
              aria-pressed={active}
              aria-label={label}
              title={label}
              onClick={() => {
                const reason = toolUnavailable(kind, panel)
                if (reason) notify(reason)
                else togglePanel(panel)
              }}
            >
              <Icon className="size-4" /> <span className="hidden xl:inline">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="flex flex-1 items-center justify-end gap-0.5">
        {undoRedoButtons}
        <button
          type="button"
          className={`${toolButton} ${activePanel === 'history' ? activeTool : ''}`}
          aria-pressed={activePanel === 'history'}
          aria-label={t('editor.panels.history')}
          title={t('editor.panels.history')}
          onClick={() =>
            historyEnabled ? togglePanel('history') : notify(t('editor.topBar.historyOnCvs'))
          }
        >
          <History className="size-4" />{' '}
          <span className="hidden 2xl:inline">{t('editor.panels.history')}</span>
        </button>
        <div className="relative">
          <button
            type="button"
            className={iconButton}
            aria-label={t('editor.topBar.help')}
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen((o) => !o)}
          >
            <CircleHelp className="size-4" />
          </button>
          {helpOpen && (
            <div
              role="menu"
              className="absolute right-0 z-(--z-dropdown) mt-2 w-menu rounded-control border border-line bg-surface py-1 text-sm shadow-overlay"
            >
              {(['helpCenter', 'contactUs'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    setHelpOpen(false)
                    notify(t('editor.topBar.notAvailable', { item: t(`editor.topBar.${key}`) }))
                  }}
                >
                  {t(`editor.topBar.${key}`)}
                </button>
              ))}
            </div>
          )}
        </div>
        <LanguageSelect compact />
        <ThemeToggle />
      </div>
    </header>
  )
}
