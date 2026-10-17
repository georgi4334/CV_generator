import { History, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cvApi } from '@/features/cv-editor/api'
import { cvKeys, useCvVersions } from '@/features/cv-editor/queries'
import { errorMessage } from '@/shared/api/errorMessage'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { flushSave } from '@/features/cv-editor/state/editorSession'
import { useQueryClient } from '@tanstack/react-query'
import { formatDateTime } from '@/features/cv-editor/lib/formatDateTime'
import { LoadingRegion, Skeleton } from '@/shared/ui/Skeleton'

/** Saved versions of the CV: save a named one, preview and restore. */
export function HistoryPanel({ cvId }: { cvId: string }) {
  const { t } = useTranslation()
  const versions = useCvVersions(cvId)
  const queryClient = useQueryClient()
  const { previewVersionId, setPreviewVersion, notify } = useEditorUi()
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const saveVersion = async () => {
    setSaving(true)
    try {
      // Make sure the version contains the latest edits.
      if (!(await flushSave())) throw new Error(t('editor.history.unsavedChanges'))
      await cvApi.createVersion(cvId, label.trim() || undefined)
      setLabel('')
      await queryClient.invalidateQueries({ queryKey: cvKeys.versions(cvId) })
      notify(t('editor.history.saved'), 'success')
    } catch (e) {
      notify(t('editor.history.notSaved', { reason: errorMessage(e) }), 'error')
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
          aria-label={t('editor.history.versionName')}
          placeholder={t('editor.history.namePlaceholder')}
          maxLength={100}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="min-w-0 flex-1 rounded-tight border border-line-strong bg-surface px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-tight bg-brand px-2.5 py-1.5 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-60"
        >
          <Save className="size-4" /> {t('common.save')}
        </button>
      </form>
      <p className="mb-3 text-xs text-fg-muted">{t('editor.history.hint')}</p>

      {versions.isLoading && (
        <LoadingRegion className="space-y-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 px-2.5 py-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </LoadingRegion>
      )}
      {versions.isError && <p className="text-sm text-danger-fg">{errorMessage(versions.error)}</p>}
      {versions.data?.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <History className="size-4" /> {t('editor.history.none')}
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
                className={`w-full rounded-tight px-2.5 py-2 text-left text-sm ${
                  selected
                    ? 'bg-brand-soft text-brand-fg-strong ring-1 ring-brand-line '
                    : 'hover:bg-glass-hover '
                }`}
              >
                <span className="block font-medium">
                  {version.label ??
                    (version.auto
                      ? t('editor.history.automatic')
                      : t('editor.history.savedVersion'))}
                </span>
                <span className="text-xs text-fg-muted">{formatDateTime(version.createdAt)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
