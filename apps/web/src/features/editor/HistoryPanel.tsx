import { History, Save } from 'lucide-react'
import { useState } from 'react'
import { toApiRequestError } from '../../lib/api'
import { cvApi } from '../../lib/cvApi'
import { cvKeys, useCvVersions } from '../../lib/cvQueries'
import { useEditorUi } from '../../stores/editorUi'
import { flushSave } from './editorSession'
import { useQueryClient } from '@tanstack/react-query'

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

/** Saved versions of the CV: save a named one, preview and restore. */
export function HistoryPanel({ cvId }: { cvId: string }) {
  const versions = useCvVersions(cvId)
  const queryClient = useQueryClient()
  const { previewVersionId, setPreviewVersion, notify } = useEditorUi()
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const saveVersion = async () => {
    setSaving(true)
    try {
      // Make sure the version contains the latest edits.
      if (!(await flushSave())) throw new Error('Your latest changes are not saved yet')
      await cvApi.createVersion(cvId, label.trim() || undefined)
      setLabel('')
      await queryClient.invalidateQueries({ queryKey: cvKeys.versions(cvId) })
      notify('Version saved.')
    } catch (e) {
      notify(`Version not saved: ${toApiRequestError(e).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void saveVersion()
        }}
      >
        <input
          aria-label="Version name"
          placeholder="Name, e.g. Sent to Acme"
          maxLength={100}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          <Save className="size-4" /> Save
        </button>
      </form>
      <p className="mb-3 text-xs text-slate-500">
        A snapshot is also kept automatically while you edit (at most every 10 minutes). Click a
        version to preview it.
      </p>

      {versions.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {versions.isError && (
        <p className="text-sm text-red-600">{toApiRequestError(versions.error).message}</p>
      )}
      {versions.data?.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <History className="size-4" /> No versions yet.
        </p>
      )}
      <ul className="space-y-1">
        {versions.data?.map((version) => {
          const selected = version.id === previewVersionId
          return (
            <li key={version.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setPreviewVersion(selected ? null : version.id)}
                className={`w-full rounded-md px-2.5 py-2 text-left text-sm ${
                  selected
                    ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-600 dark:bg-teal-950 dark:text-teal-200'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="block font-medium">
                  {version.label ?? (version.auto ? 'Automatic snapshot' : 'Saved version')}
                </span>
                <span className="text-xs text-slate-500">
                  {when.format(new Date(version.createdAt))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
