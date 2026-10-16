import type { CoverLetterRecord, TemplateId } from '@cv/shared'
import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { LetterRenderer, LetterThumbnail, templateChoice } from '@/renderer'
import { toApiRequestError } from '@/shared/api/client'
import { errorMessage } from '@/shared/api/errorMessage'
import { coverLetterApi } from '@/features/cover-letters/api'
import { useCvList, useLoadCv } from '@/features/cv-editor/queries'
import { useJobs, useUpdateJob } from '@/features/jobs/queries'
import {
  useCoverLetter,
  useLinkLetter,
  useRememberLetter,
  useRenameLetter,
} from '@/features/cover-letters/queries'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { ConflictBanner } from '@/features/cv-editor/layout/ConflictBanner'
import { DesignTargetContext, type DesignTarget } from '@/features/cv-editor/state/designTarget'
import { EditableTitle } from '@/features/cv-editor/layout/EditableTitle'
import { EditorLayout } from '@/features/cv-editor/layout/EditorLayout'
import { LoadError, PageLoading } from '@/shared/ui/LoadStates'
import { SaveIndicator } from '@/features/cv-editor/layout/SaveIndicator'
import { useUndoShortcuts } from '@/features/cv-editor/layout/useUndoShortcuts'
import { AiTargetContext } from '@/features/ai/aiTarget'
import { useLetterAiTarget } from '@/features/ai/useAiTargets'
import { printLetter } from '@/features/print/printCv'
import { ShareDialog } from '@/features/share/ShareDialog'
import { useLetterEditor } from '@/features/cover-letters/state/letterEditorStore'
import {
  letterActions,
  letterEditorApi,
  loadLetterIntoEditor,
  overwriteLetterServerCopy,
  useLetterSession,
} from '@/features/cover-letters/state/letterSession'

const letterHistory = () => useLetterEditor.getState()

const select = 'input input-sm w-auto max-w-56'

/** Under the top bar: which CV and job the letter belongs to, and "copy the CV's look". */
function LinkBar({ record }: { record: CoverLetterRecord }) {
  const { t } = useTranslation()
  const cvs = useCvList().data?.filter((doc) => doc.type === 'cv') ?? []
  const jobs = useJobs().data ?? []
  const link = useLinkLetter()
  const updateJob = useUpdateJob()
  const loadCv = useLoadCv()
  const notify = useEditorUi((s) => s.notify)
  const applyFromCv = useLetterEditor((s) => s.applyFromCv)
  const [copying, setCopying] = useState(false)
  const failed = (e: unknown) => notify(t('letters.notSaved', { message: errorMessage(e) }))

  const copyFromCv = async () => {
    if (!record.cvId) return
    setCopying(true)
    try {
      const cv = await loadCv(record.cvId)
      applyFromCv(cv.document.header, cv.document.design)
      notify(t('letters.copied', { title: cv.title }))
    } catch (e) {
      failed(e)
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-fg-muted">{t('letters.cv')}</span>
        <select
          aria-label={t('letters.linkedCv')}
          value={record.cvId ?? ''}
          onChange={(e) =>
            link.mutate({ id: record.id, cvId: e.target.value || null }, { onError: failed })
          }
          className={select}
        >
          <option value="">{t('common.none')}</option>
          {cvs.map((cv) => (
            <option key={cv.id} value={cv.id}>
              {cv.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => void copyFromCv()}
        disabled={!record.cvId || copying}
        title={t('letters.useCvDesignHint')}
        className="inline-flex items-center gap-1.5 rounded-tight px-2 py-1 font-medium text-brand-fg hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw className={`size-3.5 ${copying ? 'animate-spin' : ''}`} aria-hidden />
        {t('letters.useCvDesign')}
      </button>
      <label className="flex items-center gap-2">
        <span className="text-fg-muted">{t('letters.job')}</span>
        <select
          aria-label={t('letters.job')}
          value={record.jobId ?? ''}
          onChange={(e) => {
            const jobId = e.target.value || null
            link.mutate({ id: record.id, jobId }, { onError: failed })
            // The job's "Cover letter" column shows this letter if it had none.
            const job = jobs.find((j) => j.id === jobId)
            if (job && !job.coverLetterId)
              updateJob.mutate({ id: job.id, change: { coverLetterId: record.id } })
          }}
          className={select}
        >
          <option value="">{t('common.none')}</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {t('letters.jobOption', { position: job.position, company: job.company })}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function LetterEditor({ record }: { record: CoverLetterRecord }) {
  useLetterSession(record)
  useUndoShortcuts(letterHistory)
  const letter = useLetterEditor((s) => (s.docId === record.id ? s.letter : null))
  const canUndo = useLetterEditor((s) => s.past.length > 0)
  const canRedo = useLetterEditor((s) => s.future.length > 0)
  const store = useLetterEditor.getState()
  const rename = useRenameLetter()
  const remember = useRememberLetter()
  const notify = useEditorUi((s) => s.notify)
  const { t } = useTranslation()
  const [sharing, setSharing] = useState(false)
  const current = letter ?? record.document
  const aiTarget = useLetterAiTarget(record, current)

  const designTarget = useMemo<DesignTarget>(
    () => ({
      kind: 'coverLetter',
      design: current.design,
      language: current.language,
      updateDesign: store.updateDesign,
      endTyping: store.endTyping,
      setLanguage: store.setLanguage,
      renderThumbnail: (templateId: TemplateId) => (
        <LetterThumbnail
          letter={{ ...current, design: { ...current.design, ...templateChoice(templateId) } }}
          width={120}
        />
      ),
    }),
    [current, store],
  )

  return (
    <DesignTargetContext.Provider value={designTarget}>
      <AiTargetContext.Provider value={aiTarget}>
        <EditorLayout
          kind="coverLetter"
          pageSize={current.design.pageSize}
          title={
            <EditableTitle
              value={record.title}
              onRename={(title) =>
                rename.mutate(
                  { id: record.id, title },
                  { onError: (e) => notify(t('letters.notRenamed', { message: errorMessage(e) })) },
                )
              }
            />
          }
          status={<SaveIndicator />}
          backTo="/documents/cover-letters"
          previewTo={`/cover-letters/${record.id}/preview`}
          banner={
            <>
              <ConflictBanner
                kind="coverLetter"
                reload={async () => {
                  const latest = await coverLetterApi.get(record.id)
                  remember(latest)
                  loadLetterIntoEditor(latest)
                }}
                overwrite={overwriteLetterServerCopy}
              />
              <LinkBar record={record} />
            </>
          }
          undoRedo={{ canUndo, canRedo, undo: store.undo, redo: store.redo }}
          onDownload={() => {
            notify(t('letters.printHint'))
            printLetter(useLetterEditor.getState().letter ?? record.document, record.title)
          }}
          onShare={() => setSharing(true)}
        >
          <LetterRenderer
            letter={current}
            mode="edit"
            editor={letterEditorApi}
            actions={letterActions}
            pageClassName="shrink-0 shadow-paper"
          />
          {sharing && (
            <ShareDialog
              type="coverLetter"
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

/** /cover-letters/:id/edit: loads the letter from the API and opens the editor. */
export function LetterEditorPage() {
  const { id } = useParams()
  const query = useCoverLetter(id)
  const closePanel = useEditorUi((s) => s.closePanel)

  // Start each document with the side panel closed.
  useEffect(() => closePanel, [id, closePanel])

  if (query.isPending) return <PageLoading />
  if (query.isError) {
    const error = toApiRequestError(query.error)
    if (error.status === 404 || error.status === 400) return <NotFoundPage />
    return <LoadError error={error} onRetry={() => void query.refetch()} />
  }
  // key: a different letter gets a fresh session.
  return <LetterEditor key={query.data.id} record={query.data} />
}
