import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cvApi } from '@/features/cv-editor/api'
import { cvKeys, rememberCv, useCvVersion } from '@/features/cv-editor/queries'
import { errorMessage } from '@/shared/api/errorMessage'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { flushSave, loadIntoEditor } from '@/features/cv-editor/state/editorSession'
import { formatDateTime } from '@/features/cv-editor/lib/formatDateTime'
import { PageCanvas } from '@/features/cv-editor/layout/PageCanvas'
import { LoadingRegion, PaperSkeleton } from '@/shared/ui/Skeleton'

/** A saved version shown read-only, with "Restore" and "Back to editing". */
export function VersionPreview({ cvId, versionId }: { cvId: string; versionId: string }) {
  const { t } = useTranslation()
  const version = useCvVersion(cvId, versionId)
  const queryClient = useQueryClient()
  const { setPreviewVersion, notify } = useEditorUi()
  const [restoring, setRestoring] = useState(false)

  const restore = async () => {
    setRestoring(true)
    try {
      // Save current edits first, so "Before restore" really holds them.
      if (!(await flushSave())) throw new Error(t('editor.history.unsavedChanges'))
      const record = await cvApi.restoreVersion(cvId, versionId)
      rememberCv(queryClient, record)
      loadIntoEditor(record)
      await queryClient.invalidateQueries({ queryKey: cvKeys.versions(cvId) })
      setPreviewVersion(null)
      notify(t('editor.version.restored'))
    } catch (e) {
      notify(t('editor.version.notRestored', { reason: errorMessage(e) }))
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        role="region"
        aria-label={t('editor.version.region')}
        className="sticky top-0 z-(--z-raised) flex w-full max-w-paper flex-wrap items-center gap-3 rounded-control bg-inverse px-4 py-2.5 text-sm text-on-inverse shadow-overlay"
      >
        <span className="flex-1">
          {t('editor.version.viewing')}{' '}
          <strong>
            {version.data?.label ??
              (version.data?.auto
                ? t('editor.version.automaticName')
                : t('editor.version.versionName'))}
          </strong>
          {version.data &&
            ` ${t('editor.version.from', { date: formatDateTime(version.data.createdAt) })}`}
        </span>
        <button
          type="button"
          onClick={() => setPreviewVersion(null)}
          className="rounded-tight px-3 py-1 hover:bg-on-inverse/10"
        >
          {t('editor.version.backToEditing')}
        </button>
        <button
          type="button"
          disabled={restoring || !version.data}
          onClick={restore}
          className="rounded-tight bg-brand px-3 py-1 font-medium text-on-brand hover:bg-brand-hover disabled:opacity-60"
        >
          {t('editor.version.restore')}
        </button>
      </div>
      {version.isLoading && (
        <LoadingRegion label={t('editor.version.loading')} className="flex w-full justify-center">
          <PaperSkeleton />
        </LoadingRegion>
      )}
      {version.isError && <p className="text-sm text-danger-fg">{errorMessage(version.error)}</p>}
      {version.data && <PageCanvas cv={version.data.document} mode="preview" />}
    </div>
  )
}
