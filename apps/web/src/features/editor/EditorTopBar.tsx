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
import { useState, type ComponentType } from 'react'
import { Link } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useEditorUi, type EditorPanel } from '../../stores/editorUi'

const toolButton =
  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
const activeTool = 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
const iconButton =
  'rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'

interface Tool {
  label: string
  icon: ComponentType<{ className?: string }>
  panel?: EditorPanel
  comingIn?: string
}

const CENTER_TOOLS: Tool[] = [
  { label: 'Fix Mistakes', icon: CircleCheck, comingIn: 'Step 16 (AI features)' },
  { label: 'Check & Tailor', icon: ScanSearch, comingIn: 'Step 16 (AI features)' },
  { label: 'Rearrange', icon: ArrowDownUp, comingIn: 'Step 6' },
  { label: 'Templates', icon: LayoutTemplate, panel: 'templates' },
  { label: 'Design & Font', icon: Palette, panel: 'design' },
]

export function EditorTopBar({ title, backTo }: { title: string; backTo: string }) {
  const { activePanel, togglePanel, notify } = useEditorUi()
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
        <span className="ml-2 hidden truncate text-sm text-slate-500 xl:inline">{title}</span>
      </div>

      <nav aria-label="Editor tools" className="flex items-center gap-0.5">
        {CENTER_TOOLS.map(({ label, icon: Icon, panel, comingIn }) => {
          const active = panel !== undefined && activePanel === panel
          return (
            <button
              key={label}
              type="button"
              className={`${toolButton} ${active ? activeTool : ''}`}
              aria-pressed={panel ? active : undefined}
              onClick={() =>
                panel ? togglePanel(panel) : notify(`${label} is coming in ${comingIn}.`)
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
          disabled
          aria-label="Undo"
          title="Undo (Step 5)"
        >
          <Undo2 className="size-4" />
        </button>
        <button
          type="button"
          className={iconButton}
          disabled
          aria-label="Redo"
          title="Redo (Step 5)"
        >
          <Redo2 className="size-4" />
        </button>
        <button
          type="button"
          className={toolButton}
          onClick={() => notify('Version history is coming in Step 9.')}
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
