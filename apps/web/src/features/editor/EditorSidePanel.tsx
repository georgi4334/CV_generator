import { X } from 'lucide-react'
import { useEditorUi, type EditorPanel } from '../../stores/editorUi'
import { DesignPanel } from './DesignPanel'
import { HistoryPanel } from './HistoryPanel'
import { RearrangePanel } from './RearrangePanel'
import { TemplatesPanel } from './TemplatesPanel'

const TITLES: Record<EditorPanel, string> = {
  ai: 'AI Assistant',
  templates: 'Templates',
  design: 'Design & Font',
  rearrange: 'Rearrange',
  history: 'History',
}

function AiPanel() {
  return (
    <p className="text-sm text-slate-500">
      Chat with an AI assistant to write and improve your summary and bullet points. Coming in Step
      16.
    </p>
  )
}

export function EditorSidePanel({ panel, cvId }: { panel: EditorPanel; cvId?: string }) {
  const closePanel = useEditorUi((s) => s.closePanel)
  return (
    <aside
      aria-label={TITLES[panel]}
      className="w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{TITLES[panel]}</h2>
        <button
          type="button"
          onClick={closePanel}
          aria-label={`Close ${TITLES[panel]}`}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="size-4" />
        </button>
      </div>
      {panel === 'templates' && <TemplatesPanel />}
      {panel === 'design' && <DesignPanel />}
      {panel === 'ai' && <AiPanel />}
      {panel === 'rearrange' && <RearrangePanel />}
      {panel === 'history' && cvId && <HistoryPanel cvId={cvId} />}
    </aside>
  )
}
