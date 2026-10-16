import { isProfessionId } from '@cv/shared'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCv } from '@/features/cv-editor/queries'
import { useEditorUi, type EditorPanel } from '@/features/cv-editor/state/editorUi'
import { AssistantPanel } from '@/features/ai/panels/AssistantPanel'
import { FixMistakesPanel } from '@/features/ai/panels/FixMistakesPanel'
import { TailorPanel } from '@/features/ai/panels/TailorPanel'
import { DesignPanel } from '@/features/cv-editor/panels/DesignPanel'
import { HistoryPanel } from '@/features/cv-editor/panels/HistoryPanel'
import { RearrangePanel } from '@/features/cv-editor/panels/RearrangePanel'
import { TemplatesPanel } from '@/features/cv-editor/panels/TemplatesPanel'

/** AI results need more room. */
const WIDE = new Set<EditorPanel>(['ai', 'fix', 'tailor'])

/**
 * The tool panel: a column left of the page on large screens, a bottom sheet
 * over the lower part of the screen on phones and small tablets (`sheet`).
 */
export function EditorSidePanel({
  panel,
  cvId,
  sheet = false,
}: {
  panel: EditorPanel
  cvId?: string
  sheet?: boolean
}) {
  const { t } = useTranslation()
  const title = t(`editor.panels.${panel}`)
  const closePanel = useEditorUi((s) => s.closePanel)
  const savedProfession = useCv(cvId).data?.professionId
  const professionId = isProfessionId(savedProfession) ? savedProfession : null
  const width = WIDE.has(panel) ? 'w-panel-wide' : 'w-panel'
  const content = (
    <aside
      aria-label={title}
      className={
        sheet
          ? 'pb-safe fixed inset-x-0 bottom-0 z-(--z-overlay) max-h-sheet overflow-y-auto rounded-t-card border-t border-line bg-surface p-4 shadow-overlay'
          : `${width} shrink-0 overflow-y-auto border-r border-line bg-surface p-4`
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          type="button"
          onClick={closePanel}
          aria-label={t('editor.closePanel', { panel: title })}
          className="btn-icon"
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
  if (!sheet) return content
  return (
    <>
      {/* Tapping the dimmed page above the sheet closes it. */}
      <div
        aria-hidden
        className="fixed inset-0 z-(--z-overlay) bg-backdrop/40"
        onClick={closePanel}
      />
      {content}
    </>
  )
}
