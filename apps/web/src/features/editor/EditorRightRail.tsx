import { Bot, Crown, Download, Eye, Link2 } from 'lucide-react'
import { Link } from 'react-router'
import { useEditorUi } from '../../stores/editorUi'

const railButton =
  'flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50'

interface EditorRightRailProps {
  previewTo: string
  /** Not set for cover letters yet (Step 13). */
  onDownload?: () => void
  onShare?: () => void
}

export function EditorRightRail({ previewTo, onDownload, onShare }: EditorRightRailProps) {
  const { togglePanel, notify } = useEditorUi()

  return (
    <div className="sticky top-6 flex flex-col gap-2 self-start">
      <Link to={previewTo} className={railButton} aria-label="Preview" title="Preview">
        <Eye className="size-5" />
      </Link>
      <button
        type="button"
        className={railButton}
        aria-label="Download PDF"
        title="Download PDF"
        onClick={onDownload ?? (() => notify('Cover letter downloads arrive in Step 13.'))}
      >
        <Download className="size-5" />
      </button>
      <button
        type="button"
        className={railButton}
        aria-label="Share link"
        title="Share link"
        onClick={onShare ?? (() => notify('Cover letter links arrive in Step 13.'))}
      >
        <Link2 className="size-5" />
      </button>
      <button
        type="button"
        className={railButton}
        aria-label="AI assistant"
        title="AI assistant"
        onClick={() => togglePanel('ai')}
      >
        <Bot className="size-5" />
      </button>
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-md bg-amber-400 text-amber-950 hover:bg-amber-300"
        aria-label="Premium"
        title="Premium"
        onClick={() => notify('Premium features are planned for Step 18.')}
      >
        <Crown className="size-5" />
      </button>
    </div>
  )
}
