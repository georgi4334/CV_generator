import { useTranslation } from 'react-i18next'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { ALL_TOOLS, toolUnavailable } from './tools'

/** Phones and small tablets: the editor's tools as a tab bar at the bottom of the screen. */
export function EditorToolbar({ kind }: { kind: 'cv' | 'coverLetter' }) {
  const { t } = useTranslation()
  const { activePanel, togglePanel, notify } = useEditorUi()
  return (
    <nav
      aria-label={t('editor.topBar.tools')}
      data-bottom-bar
      className="pb-safe glass-bar shrink-0 border-t border-b-0"
    >
      <ul className="flex h-bottom-nav overflow-x-auto">
        {ALL_TOOLS.map(({ icon: Icon, panel }) => {
          const label = t(`editor.panels.${panel}`)
          const active = activePanel === panel
          return (
            <li key={panel} className="min-w-16 flex-1">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const reason = toolUnavailable(kind, panel)
                  if (reason) notify(reason)
                  else togglePanel(panel)
                }}
                className={`flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-2xs font-medium leading-tight ${
                  active ? 'bg-brand-soft text-brand-fg' : 'text-fg-muted'
                }`}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="line-clamp-2 text-center">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
