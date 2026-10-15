import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toApiRequestError } from '../../lib/api'
import { cvApi } from '../../lib/cvApi'
import { cvKeys, rememberCv, useCvVersion } from '../../lib/cvQueries'
import { useEditorUi } from '../../stores/editorUi'
import { flushSave, loadIntoEditor } from './editorSession'
import { PageCanvas } from './PageCanvas'

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

/** A saved version shown read-only, with "Restore" and "Back to editing". */
export function VersionPreview({ cvId, versionId }: { cvId: string; versionId: string }) {
  const version = useCvVersion(cvId, versionId)
  const queryClient = useQueryClient()
  const { setPreviewVersion, notify } = useEditorUi()
  const [restoring, setRestoring] = useState(false)

  const restore = async () => {
    setRestoring(true)
    try {
      // Save current edits first, so "Before restore" really holds them.
      if (!(await flushSave())) throw new Error('Your latest changes are not saved yet')
      const record = await cvApi.restoreVersion(cvId, versionId)
      rememberCv(queryClient, record)
      loadIntoEditor(record)
      await queryClient.invalidateQueries({ queryKey: cvKeys.versions(cvId) })
      setPreviewVersion(null)
      notify('Version restored. Your previous content was kept as "Before restore".')
    } catch (e) {
      notify(`Not restored: ${toApiRequestError(e).message}`)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        role="region"
        aria-label="Version preview"
        className="sticky top-0 z-10 flex w-full max-w-[794px] flex-wrap items-center gap-3 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg"
      >
        <span className="flex-1">
          Viewing{' '}
          <strong>
            {version.data?.label ?? (version.data?.auto ? 'automatic snapshot' : 'version')}
          </strong>
          {version.data && ` from ${when.format(new Date(version.data.createdAt))}`}
        </span>
        <button
          type="button"
          onClick={() => setPreviewVersion(null)}
          className="rounded-md px-3 py-1 hover:bg-white/10"
        >
          Back to editing
        </button>
        <button
          type="button"
          disabled={restoring || !version.data}
          onClick={restore}
          className="rounded-md bg-teal-500 px-3 py-1 font-medium text-slate-950 hover:bg-teal-400 disabled:opacity-60"
        >
          Restore this version
        </button>
      </div>
      {version.isLoading && <p className="text-sm text-slate-500">Loading version…</p>}
      {version.isError && (
        <p className="text-sm text-red-600">{toApiRequestError(version.error).message}</p>
      )}
      {version.data && <PageCanvas cv={version.data.document} mode="preview" />}
    </div>
  )
}
