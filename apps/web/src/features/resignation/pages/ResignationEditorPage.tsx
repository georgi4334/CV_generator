import type { ResignationRecord } from '@cv/shared'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { ResignationRenderer } from '@/renderer'
import { toApiRequestError } from '@/shared/api/client'
import { errorMessage } from '@/shared/api/errorMessage'
import { EditorLoading, LoadError } from '@/shared/ui/LoadStates'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { AiTargetContext } from '@/features/ai/aiTarget'
import { useResignationAiTarget } from '@/features/ai/useAiTargets'
import { ConflictBanner } from '@/features/cv-editor/layout/ConflictBanner'
import { EditableTitle } from '@/features/cv-editor/layout/EditableTitle'
import { EditorLayout } from '@/features/cv-editor/layout/EditorLayout'
import { SaveIndicator } from '@/features/cv-editor/layout/SaveIndicator'
import { useUndoShortcuts } from '@/features/cv-editor/layout/useUndoShortcuts'
import { DesignTargetContext, type DesignTarget } from '@/features/cv-editor/state/designTarget'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { printDocument } from '@/features/print/printCv'
import { resignationApi } from '@/features/resignation/api'
import {
  useRememberResignation,
  useRenameResignation,
  useResignation,
} from '@/features/resignation/queries'
import { ShareDialog } from '@/features/share/ShareDialog'
import { useResignationEditor } from '@/features/resignation/state/resignationEditorStore'
import {
  loadResignationIntoEditor,
  overwriteResignationServerCopy,
  resignationActions,
  resignationEditorApi,
  useResignationSession,
} from '@/features/resignation/state/resignationSession'

const history = () => useResignationEditor.getState()

function ResignationEditor({ record }: { record: ResignationRecord }) {
  useResignationSession(record)
  useUndoShortcuts(history)
  const letter = useResignationEditor((s) => (s.docId === record.id ? s.letter : null))
  const canUndo = useResignationEditor((s) => s.past.length > 0)
  const canRedo = useResignationEditor((s) => s.future.length > 0)
  const store = useResignationEditor.getState()
  const rename = useRenameResignation()
  const remember = useRememberResignation()
  const notify = useEditorUi((s) => s.notify)
  const { t } = useTranslation()
  const [sharing, setSharing] = useState(false)
  const current = letter ?? record.document
  const aiTarget = useResignationAiTarget(current)

  const designTarget = useMemo<DesignTarget>(
    () => ({
      kind: 'resignation',
      design: current.design,
      language: current.language,
      updateDesign: store.updateDesign,
      endTyping: store.endTyping,
      setLanguage: store.setLanguage,
      // No photo or contact header: the sender's details are part of the letter.
      header: null,
      updateHeader: () => {},
    }),
    [current.design, current.language, store],
  )

  return (
    <DesignTargetContext.Provider value={designTarget}>
      <AiTargetContext.Provider value={aiTarget}>
        <EditorLayout
          kind="resignation"
          pageSize={current.design.pageSize}
          title={
            <EditableTitle
              value={record.title}
              onRename={(title) =>
                rename.mutate(
                  { id: record.id, title },
                  {
                    onError: (e) =>
                      notify(t('resignation.notRenamed', { message: errorMessage(e) }), 'error'),
                  },
                )
              }
            />
          }
          status={<SaveIndicator />}
          backTo="/documents/resignations"
          previewTo={`/resignations/${record.id}/preview`}
          banner={
            <ConflictBanner
              kind="resignation"
              reload={async () => {
                const latest = await resignationApi.get(record.id)
                remember(latest)
                loadResignationIntoEditor(latest)
              }}
              overwrite={overwriteResignationServerCopy}
            />
          }
          undoRedo={{ canUndo, canRedo, undo: store.undo, redo: store.redo }}
          onDownload={() => {
            notify(t('resignation.printHint'))
            printDocument(
              {
                kind: 'resignation',
                letter: useResignationEditor.getState().letter ?? record.document,
              },
              record.title,
            )
          }}
          onShare={() => setSharing(true)}
        >
          <ResignationRenderer
            letter={current}
            mode="edit"
            editor={resignationEditorApi}
            actions={resignationActions}
            pageClassName="shrink-0 shadow-paper"
          />
          {sharing && (
            <ShareDialog
              type="resignation"
              id={record.id}
              title={record.title}
              onClose={() => setSharing(false)}
            />
          )}
        </EditorLayout>
      </AiTargetContext.Provider>
    </DesignTargetContext.Provider>
  )
}

/** /resignations/:id/edit: loads the letter from the API and opens the editor. */
export function ResignationEditorPage() {
  const { id } = useParams()
  const query = useResignation(id)
  const closePanel = useEditorUi((s) => s.closePanel)

  // Start each document with the side panel closed.
  useEffect(() => closePanel, [id, closePanel])

  if (query.isPending) return <EditorLoading />
  if (query.isError) {
    const error = toApiRequestError(query.error)
    if (error.status === 404 || error.status === 400) return <NotFoundPage />
    return <LoadError error={error} onRetry={() => void query.refetch()} />
  }
  // key: a different letter gets a fresh session.
  return <ResignationEditor key={query.data.id} record={query.data} />
}
