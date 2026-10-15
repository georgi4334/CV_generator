import { useState } from 'react'
import { toApiRequestError } from '../../lib/api'
import { cvApi } from '../../lib/cvApi'
import { useRememberCv } from '../../lib/cvQueries'
import { loadIntoEditor, overwriteServerCopy, useSaveState } from './editorSession'

/** The CV editor's banner: reloads or overwrites through the CV session. */
export function CvConflictBanner({ cvId }: { cvId: string }) {
  const remember = useRememberCv()
  return (
    <ConflictBanner
      what="CV"
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
  what,
  reload,
  overwrite,
}: {
  /** "CV" or "cover letter". */
  what: string
  /** Replaces the editor content with the server's version. */
  reload: () => Promise<void>
  /** Keeps this editor's version, saving it over the server's revision. */
  overwrite: (serverRevision: number) => void
}) {
  const { status, error } = useSaveState()
  const [busy, setBusy] = useState(false)
  if (status !== 'conflict') return null

  const serverRevision = (error?.details as { revision?: number } | undefined)?.revision

  const loadLatest = async () => {
    setBusy(true)
    try {
      await reload()
    } catch (e) {
      alert(toApiRequestError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
    >
      <span className="flex-1">
        This {what} was changed in another tab or window. Your latest edits are not saved yet.
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={loadLatest}
        className="rounded-md border border-red-300 bg-white px-3 py-1 font-medium hover:bg-red-100 dark:border-red-800 dark:bg-transparent dark:hover:bg-red-900"
      >
        Load the other version
      </button>
      <button
        type="button"
        disabled={busy || serverRevision === undefined}
        onClick={() => overwrite(serverRevision!)}
        className="rounded-md bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-700"
      >
        Keep my version
      </button>
    </div>
  )
}
