import type { CoverLetterDocument, CoverLetterRecord } from '@cv/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { EditorApi } from '@/renderer/editing/editorApi'
import type { LetterActions } from '@/renderer/document/LetterRenderer'
import { coverLetterApi } from '@/features/cover-letters/api'
import { cvApi } from '@/features/cv-editor/api'
import { rememberLetter } from '@/features/cover-letters/queries'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { AutosaveController } from '@/features/cv-editor/state/autosave'
import { useSaveState } from '@/features/cv-editor/state/editorSession'
import { useLetterEditor } from './letterEditorStore'

const session: {
  controller: AutosaveController<CoverLetterDocument, CoverLetterRecord> | null
} = { controller: null }

/** Replaces the editor content with a record from the server ("load the other version"). */
export function loadLetterIntoEditor(record: CoverLetterRecord) {
  session.controller?.start(record)
  useLetterEditor.getState().load(record.id, record.document)
}

/** After a conflict: keep this editor's version and overwrite the server copy. */
export function overwriteLetterServerCopy(serverRevision: number) {
  session.controller?.overwrite(serverRevision)
}

/** Saves pending changes now; resolves false if they could not be saved. */
export function flushLetterSave(): Promise<boolean> {
  return session.controller?.flush() ?? Promise.resolve(true)
}

/** Loads a letter into the editor and keeps it saved, like the CV editor does. */
export function useLetterSession(record: CoverLetterRecord) {
  const queryClient = useQueryClient()
  const initial = useRef(record)

  useEffect(() => {
    const start = initial.current
    const controller = new AutosaveController<CoverLetterDocument, CoverLetterRecord>({
      save: (document, revision) => coverLetterApi.update(start.id, { revision, document }),
      onState: (state) => useSaveState.setState(state, true),
      onSaved: (saved) => rememberLetter(queryClient, saved),
    })
    session.controller = controller
    loadLetterIntoEditor(start)

    const unsubscribe = useLetterEditor.subscribe((state, previous) => {
      if (state.docId === start.id && state.letter && state.letter !== previous.letter)
        controller.change(state.letter)
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

const s = () => useLetterEditor.getState()
const none = () => {}

/** What the renderer needs to edit a letter in place (item and bullet edits do not apply). */
export const letterEditorApi: EditorApi = {
  setField: (path, value) => s().setField(path, value),
  endTyping: () => s().endTyping(),
  getFocusedPath: () => s().focusedPath,
  setFocusedPath: (path) => s().setFocusedPath(path),
  updateHeader: (patch) => s().updateHeader(patch),
  updateItem: none,
  addItem: none,
  duplicateItem: none,
  removeItem: none,
  moveItem: none,
  addBullet: none,
  removeBullet: none,
  uploadImage: async (image) => (await cvApi.uploadImage(image)).url,
  notify: (message) => useEditorUi.getState().notify(message),
}

export const letterActions: LetterActions = {
  addParagraph: (afterIndex) => s().addParagraph(afterIndex),
  removeParagraph: (index) => s().removeParagraph(index),
}
