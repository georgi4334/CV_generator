import { TEMPLATE_IDS } from '@cv/shared'
import { X } from 'lucide-react'
import { useEditorUi, type EditorPanel } from '../../stores/editorUi'
import { RearrangePanel } from './RearrangePanel'

const TITLES: Record<EditorPanel, string> = {
  ai: 'AI Assistant',
  templates: 'Templates',
  design: 'Design & Font',
  rearrange: 'Rearrange',
}

const templateName = (id: string) => id.replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase())

function TemplatesPanel() {
  const closePanel = useEditorUi((s) => s.closePanel)
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATE_IDS.map((id) => (
          <div key={id} className="text-center text-xs">
            <div className="mb-1 aspect-[210/297] rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800" />
            {templateName(id)}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={closePanel}
        className="mt-4 w-full rounded-lg bg-teal-600 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        Continue Editing
      </button>
      <p className="mt-4 text-xs text-slate-500">
        Live template previews, document size (A4 / US Letter) and resume language arrive in Step 7.
      </p>
    </>
  )
}

const DESIGN_CONTROLS = [
  'Page margins',
  'Section spacing',
  'Colors',
  'Font style',
  'Font size',
  'Line height',
  'Column layout',
  'Backgrounds',
]

function DesignPanel() {
  return (
    <>
      <ul className="space-y-3">
        {DESIGN_CONTROLS.map((label) => (
          <li key={label}>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
              {label}
            </p>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-slate-500">These controls become functional in Step 7.</p>
    </>
  )
}

function AiPanel() {
  return (
    <p className="text-sm text-slate-500">
      Chat with an AI assistant to write and improve your summary and bullet points. Coming in Step
      16.
    </p>
  )
}

export function EditorSidePanel({ panel }: { panel: EditorPanel }) {
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
    </aside>
  )
}
