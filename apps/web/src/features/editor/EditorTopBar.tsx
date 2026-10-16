import {
  ArrowDownUp,
  ArrowLeft,
  CircleCheck,
  CircleHelp,
  History,
  LayoutTemplate,
  Palette,
  PanelLeft,
  Redo2,
  ScanSearch,
  Undo2,
} from 'lucide-react'
import { useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useEditorUi, type EditorPanel } from '../../stores/editorUi'
import { useCvEditor } from './cvEditorStore'

const toolButton =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
const activeTool = 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
const iconButton =
  'rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'

interface Tool {
  label: string
  icon: ComponentType<{ className?: string }>
  panel: EditorPanel
}

const CENTER_TOOLS: Tool[] = [
  { label: 'Fix Mistakes', icon: CircleCheck, panel: 'fix' },
  { label: 'Check & Tailor', icon: ScanSearch, panel: 'tailor' },
  { label: 'Rearrange', icon: ArrowDownUp, panel: 'rearrange' },
  { label: 'Templates', icon: LayoutTemplate, panel: 'templates' },
  { label: 'Design & Font', icon: Palette, panel: 'design' },
]

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
}: EditorTopBarProps) {
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

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Link
          to={backTo}
          className={iconButton}
          aria-label="Back to documents"
          title="Back to documents"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <button
          type="button"
          className={`${toolButton} ${activePanel === 'ai' ? activeTool : ''}`}
          aria-pressed={activePanel === 'ai'}
          onClick={() => togglePanel('ai')}
        >
          <PanelLeft className="size-4" /> <span className="hidden lg:inline">AI Assistant</span>
        </button>
        <span className="ml-2 hidden min-w-0 items-center gap-2 text-sm text-slate-500 xl:flex">
          {title}
          {status}
        </span>
      </div>

      <nav aria-label="Editor tools" className="flex items-center gap-0.5">
        {CENTER_TOOLS.map(({ label, icon: Icon, panel }) => {
          const active = activePanel === panel
          return (
            <button
              key={label}
              type="button"
              className={`${toolButton} ${active ? activeTool : ''}`}
              aria-pressed={active}
              onClick={() =>
                kind === 'coverLetter' && panel === 'rearrange'
                  ? notify('A cover letter has no sections to rearrange.')
                  : kind === 'coverLetter' && panel === 'tailor'
                    ? notify(
                        'Check & Tailor works on CVs. Open the linked CV to tailor it to the job.',
                      )
                    : togglePanel(panel)
              }
            >
              <Icon className="size-4" /> <span className="hidden md:inline">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="flex flex-1 items-center justify-end gap-0.5">
        <button
          type="button"
          className={iconButton}
          disabled={!canUndo}
          onClick={undo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="size-4" />
        </button>
        <button
          type="button"
          className={iconButton}
          disabled={!canRedo}
          onClick={redo}
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="size-4" />
        </button>
        <button
          type="button"
          className={`${toolButton} ${activePanel === 'history' ? activeTool : ''}`}
          aria-pressed={activePanel === 'history'}
          onClick={() =>
            historyEnabled
              ? togglePanel('history')
              : notify('Version history is available for CVs.')
          }
        >
          <History className="size-4" /> <span className="hidden lg:inline">History</span>
        </button>
        <div className="relative">
          <button
            type="button"
            className={iconButton}
            aria-label="Help"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen((o) => !o)}
          >
            <CircleHelp className="size-4" />
          </button>
          {helpOpen && (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              {['Help Center', 'Contact Us'].map((item) => (
                <button
                  key={item}
                  type="button"
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    setHelpOpen(false)
                    notify(`${item} is not available yet.`)
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
