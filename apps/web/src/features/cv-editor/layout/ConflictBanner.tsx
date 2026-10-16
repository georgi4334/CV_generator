import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '@/shared/api/errorMessage'
import { cvApi } from '@/features/cv-editor/api'
import { useRememberCv } from '@/features/cv-editor/queries'
import {
  loadIntoEditor,
  overwriteServerCopy,
  useSaveState,
} from '@/features/cv-editor/state/editorSession'

/** The CV editor's banner: reloads or overwrites through the CV session. */
export function CvConflictBanner({ cvId }: { cvId: string }) {
  const remember = useRememberCv()
  return (
    <ConflictBanner
      kind="cv"
      reload={async () => {
        const record = await cvApi.get(cvId)
        remember(record)
        loadIntoEditor(record)
      }}
      overwrite={overwriteServerCopy}
    />
  )
}

/** Shown when another tab or device saved this document first. */
export function ConflictBanner({
  kind,
  reload,
  overwrite,
}: {
  kind: 'cv' | 'coverLetter'
  /** Replaces the editor content with the server's version. */
  reload: () => Promise<void>
  /** Keeps this editor's version, saving it over the server's revision. */
  overwrite: (serverRevision: number) => void
}) {
  const { t } = useTranslation()
  const { status, error } = useSaveState()
  const [busy, setBusy] = useState(false)
  if (status !== 'conflict') return null

  const serverRevision = (error?.details as { revision?: number } | undefined)?.revision

  const loadLatest = async () => {
    setBusy(true)
    try {
      await reload()
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border-b border-danger-line bg-danger-soft px-4 py-2 text-sm text-danger-fg"
    >
      <span className="flex-1">
        {t(kind === 'cv' ? 'editor.conflict.cv' : 'editor.conflict.coverLetter')}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={loadLatest}
        className="rounded-tight border border-danger-line bg-surface px-3 py-1 font-medium hover:bg-danger-soft"
      >
        {t('editor.conflict.loadOther')}
      </button>
      <button
        type="button"
        disabled={busy || serverRevision === undefined}
        onClick={() => overwrite(serverRevision!)}
        className="rounded-tight bg-danger px-3 py-1 font-medium text-on-danger hover:bg-danger-hover"
      >
        {t('editor.conflict.keepMine')}
      </button>
    </div>
  )
}
