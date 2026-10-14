import type { CvRecord } from '@cv/shared'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { toApiRequestError } from '../../lib/api'
import { useCv, useRenameCv } from '../../lib/cvQueries'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { printCv } from '../print/printCv'
import { ShareDialog } from '../share/ShareDialog'
import { useEditorUi } from '../../stores/editorUi'
import { ConflictBanner } from './ConflictBanner'
import { useCvEditor } from './cvEditorStore'
import { EditableTitle } from './EditableTitle'
import { cvEditorApi } from './editorApi'
import { useCvSession } from './editorSession'
import { EditorLayout } from './EditorLayout'
import { LoadError, PageLoading } from './LoadStates'
import { PageCanvas } from './PageCanvas'
import { SaveIndicator } from './SaveIndicator'
import { useUndoShortcuts } from './useUndoShortcuts'
import { VersionPreview } from './VersionPreview'

function CvEditor({ record }: { record: CvRecord }) {
  useCvSession(record)
  useUndoShortcuts()
  const cv = useCvEditor((s) => (s.docId === record.id ? s.cv : null))
  const previewVersionId = useEditorUi((s) => s.previewVersionId)
  const rename = useRenameCv()
  const notify = useEditorUi((s) => s.notify)
  const [sharing, setSharing] = useState(false)

  const download = () => {
    notify('In the print dialog, choose “Save as PDF” as the destination.')
    // The latest edits, even if they are still being saved.
    printCv(useCvEditor.getState().cv ?? record.document, record.title)
  }

  return (
    <EditorLayout
      title={
        <EditableTitle
          value={record.title}
          onRename={(title) =>
            rename.mutate(
              { id: record.id, title },
              { onError: (e) => notify(`Not renamed: ${toApiRequestError(e).message}`) },
            )
          }
        />
      }
      status={<SaveIndicator />}
      backTo="/documents/cvs"
      previewTo={`/cvs/${record.id}/preview`}
      cvId={record.id}
      banner={<ConflictBanner cvId={record.id} />}
      onDownload={download}
      onShare={() => setSharing(true)}
    >
      {previewVersionId ? (
        <VersionPreview cvId={record.id} versionId={previewVersionId} />
      ) : (
        <PageCanvas
          cv={cv ?? record.document}
          title={record.title}
          mode="edit"
          editor={cvEditorApi}
        />
      )}
      {sharing && (
        <ShareDialog cvId={record.id} title={record.title} onClose={() => setSharing(false)} />
      )}
    </EditorLayout>
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
