import type { CoverLetterRecord, TemplateId } from '@cv/shared'
import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { LetterRenderer, LetterThumbnail, templateChoice } from '../../cv-renderer'
import { toApiRequestError } from '../../lib/api'
import { coverLetterApi } from '../../lib/coverLetterApi'
import { useCvList, useLoadCv } from '../../lib/cvQueries'
import { useJobs, useUpdateJob } from '../../lib/jobQueries'
import {
  useCoverLetter,
  useLinkLetter,
  useRememberLetter,
  useRenameLetter,
} from '../../lib/letterQueries'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { useEditorUi } from '../../stores/editorUi'
import { ConflictBanner } from '../editor/ConflictBanner'
import { DesignTargetContext, type DesignTarget } from '../editor/designTarget'
import { EditableTitle } from '../editor/EditableTitle'
import { EditorLayout } from '../editor/EditorLayout'
import { LoadError, PageLoading } from '../editor/LoadStates'
import { SaveIndicator } from '../editor/SaveIndicator'
import { useUndoShortcuts } from '../editor/useUndoShortcuts'
import { AiTargetContext } from '../ai/aiTarget'
import { useLetterAiTarget } from '../ai/useAiTargets'
import { printLetter } from '../print/printCv'
import { ShareDialog } from '../share/ShareDialog'
import { useLetterEditor } from './letterEditorStore'
import {
  letterActions,
  letterEditorApi,
  loadLetterIntoEditor,
  overwriteLetterServerCopy,
  useLetterSession,
} from './letterSession'

const letterHistory = () => useLetterEditor.getState()

const select =
  'max-w-56 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'

/** Under the top bar: which CV and job the letter belongs to, and "copy the CV's look". */
function LinkBar({ record }: { record: CoverLetterRecord }) {
  const cvs = useCvList().data?.filter((doc) => doc.type === 'cv') ?? []
  const jobs = useJobs().data ?? []
  const link = useLinkLetter()
  const updateJob = useUpdateJob()
  const loadCv = useLoadCv()
  const notify = useEditorUi((s) => s.notify)
  const applyFromCv = useLetterEditor((s) => s.applyFromCv)
  const [copying, setCopying] = useState(false)
  const failed = (e: unknown) => notify(`Not saved: ${toApiRequestError(e).message}`)

  const copyFromCv = async () => {
    if (!record.cvId) return
    setCopying(true)
    try {
      const cv = await loadCv(record.cvId)
      applyFromCv(cv.document.header, cv.document.design)
      notify(`Header and design copied from “${cv.title}”.`)
    } catch (e) {
      failed(e)
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
      <label className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400">CV</span>
        <select
          aria-label="Linked CV"
          value={record.cvId ?? ''}
          onChange={(e) =>
            link.mutate({ id: record.id, cvId: e.target.value || null }, { onError: failed })
          }
          className={select}
        >
          <option value="">— None —</option>
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
        title="Copies your name, contacts, photo, template and design from the linked CV"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-teal-300 dark:hover:bg-teal-950"
      >
        <RefreshCw className={`size-3.5 ${copying ? 'animate-spin' : ''}`} aria-hidden />
        Use CV's header & design
      </button>
      <label className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400">Job</span>
        <select
          aria-label="Job"
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
          <option value="">— None —</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.position} at {job.company}
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
          backTo="/documents/cover-letters"
          previewTo={`/cover-letters/${record.id}/preview`}
          banner={
            <>
              <ConflictBanner
                what="cover letter"
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
            notify('In the print dialog, choose “Save as PDF” as the destination.')
            printLetter(useLetterEditor.getState().letter ?? record.document, record.title)
          }}
          onShare={() => setSharing(true)}
        >
          <LetterRenderer
            letter={current}
            mode="edit"
            editor={letterEditorApi}
            actions={letterActions}
            pageClassName="shrink-0 shadow-lg"
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
