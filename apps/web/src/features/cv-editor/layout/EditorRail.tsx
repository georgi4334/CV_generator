import type { DocumentType } from '@cv/shared'
import { Bot, Download, Eye, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { toolUnavailable } from './tools'

const railButton =
  'flex size-9 items-center justify-center rounded-pill text-fg-soft hover:bg-glass-strong hover:text-fg'

interface EditorRailProps {
  previewTo: string
  /** Not set for cover letters yet (Step 13). */
  onDownload?: () => void
  onShare?: () => void
  kind?: DocumentType
}

/**
 * Quick actions in a vertical glass pill beside the page: preview, PDF, share
 * link and AI assistant. It stays in view near the bottom of the screen.
 */
export function EditorRail({ previewTo, onDownload, onShare, kind = 'cv' }: EditorRailProps) {
  const { t } = useTranslation()
  const { togglePanel, notify } = useEditorUi()

  return (
    <div className="glass-pill sticky bottom-6 flex flex-col gap-1 self-end">
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
        onClick={() => {
          const reason = toolUnavailable(kind, 'ai')
          if (reason) notify(reason)
          else togglePanel('ai')
        }}
      >
        <Bot className="size-5" />
      </button>
    </div>
  )
}
