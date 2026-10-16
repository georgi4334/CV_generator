import { isProfessionId } from '@cv/shared'
import { X } from 'lucide-react'
import { useCv } from '../../lib/cvQueries'
import { useEditorUi, type EditorPanel } from '../../stores/editorUi'
import { AssistantPanel } from '../ai/AssistantPanel'
import { FixMistakesPanel } from '../ai/FixMistakesPanel'
import { TailorPanel } from '../ai/TailorPanel'
import { DesignPanel } from './DesignPanel'
import { HistoryPanel } from './HistoryPanel'
import { RearrangePanel } from './RearrangePanel'
import { TemplatesPanel } from './TemplatesPanel'

const TITLES: Record<EditorPanel, string> = {
  ai: 'AI Assistant',
  fix: 'Fix Mistakes',
  tailor: 'Check & Tailor',
  templates: 'Templates',
  design: 'Design & Font',
  rearrange: 'Rearrange',
  history: 'History',
}

/** AI results need more room. */
const WIDE = new Set<EditorPanel>(['ai', 'fix', 'tailor'])

export function EditorSidePanel({ panel, cvId }: { panel: EditorPanel; cvId?: string }) {
  const closePanel = useEditorUi((s) => s.closePanel)
  const savedProfession = useCv(cvId).data?.professionId
  const professionId = isProfessionId(savedProfession) ? savedProfession : null
  return (
    <aside
      aria-label={TITLES[panel]}
      className={`${WIDE.has(panel) ? 'w-96' : 'w-72'} shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900`}
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
      {panel === 'templates' && <TemplatesPanel professionId={professionId} />}
      {panel === 'design' && <DesignPanel />}
      {panel === 'ai' && <AssistantPanel />}
      {panel === 'fix' && <FixMistakesPanel />}
      {panel === 'tailor' && <TailorPanel />}
      {panel === 'rearrange' && <RearrangePanel />}
      {panel === 'history' && cvId && <HistoryPanel cvId={cvId} />}
    </aside>
  )
}
