import { Bot, Crown, Download, Eye, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'

const railButton =
  'flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50'

interface EditorRightRailProps {
  previewTo: string
  /** Not set for cover letters yet (Step 13). */
  onDownload?: () => void
  onShare?: () => void
}

export function EditorRightRail({ previewTo, onDownload, onShare }: EditorRightRailProps) {
  const { t } = useTranslation()
  const { togglePanel, notify } = useEditorUi()

  return (
    <div className="sticky top-6 flex flex-col gap-2 self-start">
      <Link
        to={previewTo}
        className={railButton}
        aria-label={t('editor.rail.preview')}
        title={t('editor.rail.preview')}
      >
        <Eye className="size-5" />
      </Link>
      <button
        type="button"
        className={railButton}
        aria-label={t('editor.rail.downloadPdf')}
        title={t('editor.rail.downloadPdf')}
        onClick={onDownload ?? (() => notify(t('editor.rail.letterDownloads')))}
      >
        <Download className="size-5" />
      </button>
      <button
        type="button"
        className={railButton}
        aria-label={t('editor.rail.shareLink')}
        title={t('editor.rail.shareLink')}
        onClick={onShare ?? (() => notify(t('editor.rail.letterLinks')))}
      >
        <Link2 className="size-5" />
      </button>
      <button
        type="button"
        className={railButton}
        aria-label={t('editor.rail.aiAssistant')}
        title={t('editor.rail.aiAssistant')}
        onClick={() => togglePanel('ai')}
      >
        <Bot className="size-5" />
      </button>
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-md bg-amber-400 text-amber-950 hover:bg-amber-300"
        aria-label={t('editor.rail.premium')}
        title={t('editor.rail.premium')}
        onClick={() => notify(t('editor.rail.premiumPlanned'))}
      >
        <Crown className="size-5" />
      </button>
    </div>
  )
}
