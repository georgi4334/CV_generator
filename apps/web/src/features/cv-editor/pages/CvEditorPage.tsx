import type { CvRecord } from '@cv/shared'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toApiRequestError } from '@/shared/api/client'
import { errorMessage } from '@/shared/api/errorMessage'
import { useCv, useRenameCv } from '@/features/cv-editor/queries'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { AiTargetContext } from '@/features/ai/aiTarget'
import { useCvAiTarget } from '@/features/ai/useAiTargets'
import { printCv } from '@/features/print/printCv'
import { ShareDialog } from '@/features/share/ShareDialog'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { CvConflictBanner } from '@/features/cv-editor/layout/ConflictBanner'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { EditableTitle } from '@/features/cv-editor/layout/EditableTitle'
import { cvEditorApi } from '@/features/cv-editor/state/editorApi'
import { useCvSession } from '@/features/cv-editor/state/editorSession'
import { EditorLayout } from '@/features/cv-editor/layout/EditorLayout'
import { LoadError, PageLoading } from '@/shared/ui/LoadStates'
import { PageCanvas } from '@/features/cv-editor/layout/PageCanvas'
import { SaveIndicator } from '@/features/cv-editor/layout/SaveIndicator'
import { useUndoShortcuts } from '@/features/cv-editor/layout/useUndoShortcuts'
import { VersionPreview } from '@/features/cv-editor/panels/VersionPreview'

function CvEditor({ record }: { record: CvRecord }) {
  const { t } = useTranslation()
  useCvSession(record)
  useUndoShortcuts()
  const cv = useCvEditor((s) => (s.docId === record.id ? s.cv : null))
  const previewVersionId = useEditorUi((s) => s.previewVersionId)
  const rename = useRenameCv()
  const notify = useEditorUi((s) => s.notify)
  const [sharing, setSharing] = useState(false)
  const aiTarget = useCvAiTarget(record, cv ?? record.document)

  const download = () => {
    notify(t('editor.printHint'))
    // The latest edits, even if they are still being saved.
    printCv(useCvEditor.getState().cv ?? record.document, record.title)
  }

  return (
    <AiTargetContext.Provider value={aiTarget}>
      <EditorLayout
        pageSize={(cv ?? record.document).design.pageSize}
        title={
          <EditableTitle
            value={record.title}
            onRename={(title) =>
              rename.mutate(
                { id: record.id, title },
                {
                  onError: (e) => notify(t('editor.title.notRenamed', { reason: errorMessage(e) })),
                },
              )
            }
          />
        }
        status={<SaveIndicator />}
        backTo="/documents/cvs"
        previewTo={`/cvs/${record.id}/preview`}
        cvId={record.id}
        banner={<CvConflictBanner cvId={record.id} />}
        onDownload={download}
        onShare={() => setSharing(true)}
      >
        {previewVersionId ? (
          <VersionPreview cvId={record.id} versionId={previewVersionId} />
        ) : (
          <PageCanvas cv={cv ?? record.document} mode="edit" editor={cvEditorApi} />
        )}
        {sharing && (
          <ShareDialog id={record.id} title={record.title} onClose={() => setSharing(false)} />
        )}
      </EditorLayout>
    </AiTargetContext.Provider>
  )
}

/** /cvs/:id/edit: loads the CV from the API and opens the editor. */
export function CvEditorPage() {
  const { id } = useParams()
  const query = useCv(id)
  const closePanel = useEditorUi((s) => s.closePanel)

  // Start each document with the side panel closed.
  useEffect(() => closePanel, [id, closePanel])

  if (query.isPending) return <PageLoading />
  if (query.isError) {
    const error = toApiRequestError(query.error)
    if (error.status === 404 || error.status === 400) return <NotFoundPage />
    return <LoadError error={error} onRetry={() => void query.refetch()} />
  }
  // key: a different CV gets a fresh session.
  return <CvEditor key={query.data.id} record={query.data} />
}
