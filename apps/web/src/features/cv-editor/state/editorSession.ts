import type { CvDocument, CvRecord } from '@cv/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { cvApi } from '@/features/cv-editor/api'
import { rememberCv } from '@/features/cv-editor/queries'
import { AutosaveController, type SaveState } from './autosave'
import { useCvEditor } from './cvEditorStore'

/** Save status shown in the top bar. */
export const useSaveState = create<SaveState>()(() => ({
  status: 'saved',
  lastSavedAt: null,
  error: null,
}))

/** The open CV's autosave controller (one editor at a time). */
const session: { controller: AutosaveController<CvDocument, CvRecord> | null } = {
  controller: null,
}

/** Saves pending changes now; resolves false if they could not be saved. */
export function flushSave(): Promise<boolean> {
  return session.controller?.flush() ?? Promise.resolve(true)
}

/** Replaces the editor content with a record from the server (restore, "load latest"). */
export function loadIntoEditor(record: CvRecord) {
  session.controller?.start(record)
  useCvEditor.getState().load(record.id, record.document)
}

/** After a conflict: keep this editor's version and overwrite the server copy. */
export function overwriteServerCopy(serverRevision: number) {
  session.controller?.overwrite(serverRevision)
}

/**
 * Loads a CV into the editor and keeps it saved: every change goes to the
 * autosave controller; leaving the editor saves immediately; closing the tab
 * with unsaved changes asks for confirmation.
 */
export function useCvSession(record: CvRecord) {
  const queryClient = useQueryClient()
  const initial = useRef(record)

  useEffect(() => {
    const start = initial.current
    const controller = new AutosaveController<CvDocument, CvRecord>({
      save: (document, revision) => cvApi.update(start.id, { revision, document }),
      onState: (state) => useSaveState.setState(state, true),
      onSaved: (saved) => rememberCv(queryClient, saved),
    })
    session.controller = controller
    loadIntoEditor(start)

    const unsubscribe = useCvEditor.subscribe((state, previous) => {
      if (state.docId === start.id && state.cv && state.cv !== previous.cv)
        controller.change(state.cv)
    })
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!controller.hasUnsavedChanges()) return
      void controller.flush()
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      unsubscribe()
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (session.controller === controller) session.controller = null
      void controller.flush().finally(() => controller.dispose())
    }
  }, [queryClient])
}
