import { ArrowLeft, CircleHelp, History, PanelLeft, Redo2, Undo2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { TransitionLink } from '@/shared/ui/TransitionLink'
import { LanguageSelect } from '@/shared/ui/LanguageSelect'
import { ThemeSelect } from '@/shared/ui/ThemeSelect'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { EditorMoreMenu } from './EditorMoreMenu'
import { CENTER_TOOLS, toolUnavailable } from './tools'

const iconButton = 'btn-icon'
/** An icon-only choice inside a glass pill. */
const pillIcon = 'pill-item px-2 disabled:opacity-40 disabled:hover:bg-transparent'

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

  const undoRedoButtons = (buttonClass: string) => (
    <>
      <button
        type="button"
        className={buttonClass}
        disabled={!canUndo}
        onClick={undo}
        aria-label={t('editor.topBar.undo')}
        title={t('editor.topBar.undoTitle')}
      >
        <Undo2 className="size-4" />
      </button>
      <button
        type="button"
        className={buttonClass}
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
      <header className="glass-bar flex h-14 shrink-0 items-center gap-1 px-2">
        <TransitionLink
          transition="doc-close"
          to={backTo}
          className={iconButton}
          aria-label={t('editor.topBar.backToDocuments')}
          title={t('editor.topBar.backToDocuments')}
        >
          <ArrowLeft className="size-5" />
        </TransitionLink>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-fg-muted [&>*:first-child]:min-w-0 [&>*:first-child]:truncate">
          {title}
          {status}
        </div>
        {undoRedoButtons(iconButton)}
        <EditorMoreMenu
          previewTo={previewTo}
          onDownload={onDownload}
          onShare={onShare}
          historyEnabled={historyEnabled}
        />
      </header>
    )
  }

  const toolClass = (active: boolean) => `pill-item ${active ? 'pill-item-active' : ''}`

  // Floating over the page: the way back and the title, the tools in a glass
  // pill in the middle, and the document's own actions in a second pill.
  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pt-3 pb-1">
      <div className="flex min-w-0 items-center gap-2">
        <TransitionLink
          transition="doc-close"
          to={backTo}
          className="glass flex size-10 shrink-0 items-center justify-center rounded-pill text-fg-soft hover:text-fg"
          aria-label={t('editor.topBar.backToDocuments')}
          title={t('editor.topBar.backToDocuments')}
        >
          <ArrowLeft className="size-4" />
        </TransitionLink>
        <div className="glass-pill flex min-w-0 items-center gap-1">
          <button
            type="button"
            className={toolClass(activePanel === 'ai')}
            aria-pressed={activePanel === 'ai'}
            aria-label={t('editor.panels.ai')}
            title={t('editor.panels.ai')}
            onClick={() => togglePanel('ai')}
          >
            <PanelLeft className="size-4" />{' '}
            <span className="hidden 2xl:inline">{t('editor.panels.ai')}</span>
          </button>
          {/* Keeps room for the title when the tool names are long (e.g. in Bulgarian). */}
          <span className="flex min-w-0 items-center gap-2 pr-3 text-sm text-fg-muted [&>*:first-child]:min-w-0 [&>*:first-child]:truncate">
            {title}
            {status}
          </span>
        </div>
      </div>

      <nav aria-label={t('editor.topBar.tools')} className="glass-pill flex items-center gap-0.5">
        {CENTER_TOOLS.map(({ icon: Icon, panel }) => {
          const label = t(`editor.panels.${panel}`)
          const active = activePanel === panel
          return (
            <button
              key={panel}
              type="button"
              className={toolClass(active)}
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

      <div className="flex justify-end">
        <div className="glass-pill flex items-center gap-0.5">
          {undoRedoButtons(pillIcon)}
          <button
            type="button"
            className={toolClass(activePanel === 'history')}
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
              className={pillIcon}
              aria-label={t('editor.topBar.help')}
              aria-expanded={helpOpen}
              onClick={() => setHelpOpen((o) => !o)}
            >
              <CircleHelp className="size-4" />
            </button>
            {helpOpen && (
              <div role="menu" className="glass-menu absolute right-0 z-(--z-dropdown) mt-2 w-menu">
                {(['helpCenter', 'contactUs'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    className="menu-item"
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
          <ThemeSelect compact />
        </div>
      </div>
    </header>
  )
}
