import { CircleHelp, Download, Eye, History, Link2, Mail, MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { LanguageSelect } from '@/shared/ui/LanguageSelect'
import { ThemeSelect } from '@/shared/ui/ThemeSelect'

const item = 'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted'

function Entry({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" className={item} onClick={onClick}>
      {icon}
      {label}
    </button>
  )
}

/**
 * Phones and small tablets: what the right rail and the end of the top bar
 * offer on large screens (preview, download, share, history, help, language, theme).
 */
export function EditorMoreMenu({
  previewTo,
  onDownload,
  onShare,
  historyEnabled,
}: {
  previewTo: string
  onDownload?: () => void
  onShare?: () => void
  historyEnabled: boolean
}) {
  const { t } = useTranslation()
  const { togglePanel, notify } = useEditorUi()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const run = (action: () => void) => () => {
    setOpen(false)
    action()
  }
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="btn-icon"
        aria-label={t('editor.topBar.more')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical className="size-5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-(--z-dropdown) mt-2 w-menu rounded-control border border-line bg-surface py-1 text-sm shadow-overlay"
        >
          <Link to={previewTo} role="menuitem" className={item}>
            <Eye className="size-4" aria-hidden />
            {t('editor.rail.preview')}
          </Link>
          <Entry
            icon={<Download className="size-4" aria-hidden />}
            label={t('editor.rail.downloadPdf')}
            onClick={run(onDownload ?? (() => notify(t('editor.rail.letterDownloads'))))}
          />
          <Entry
            icon={<Link2 className="size-4" aria-hidden />}
            label={t('editor.rail.shareLink')}
            onClick={run(onShare ?? (() => notify(t('editor.rail.letterLinks'))))}
          />
          <Entry
            icon={<History className="size-4" aria-hidden />}
            label={t('editor.panels.history')}
            onClick={run(() =>
              historyEnabled ? togglePanel('history') : notify(t('editor.topBar.historyOnCvs')),
            )}
          />
          {(['helpCenter', 'contactUs'] as const).map((key) => (
            <Entry
              key={key}
              icon={
                key === 'helpCenter' ? (
                  <CircleHelp className="size-4" aria-hidden />
                ) : (
                  <Mail className="size-4" aria-hidden />
                )
              }
              label={t(`editor.topBar.${key}`)}
              onClick={run(() =>
                notify(t('editor.topBar.notAvailable', { item: t(`editor.topBar.${key}`) })),
              )}
            />
          ))}
          <div className="flex items-center justify-between border-t border-line px-2 py-1">
            <LanguageSelect />
            <ThemeSelect compact />
          </div>
        </div>
      )}
    </div>
  )
}
