import type { ResignationDocument, ResignationRecord } from '@cv/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { LetterActions } from '@/renderer/document/LetterRenderer'
import type { EditorApi } from '@/renderer/editing/editorApi'
import { AutosaveController } from '@/features/cv-editor/state/autosave'
import { useSaveState } from '@/features/cv-editor/state/editorSession'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { resignationApi } from '@/features/resignation/api'
import { rememberResignation } from '@/features/resignation/queries'
import { useResignationEditor } from './resignationEditorStore'

const session: {
  controller: AutosaveController<ResignationDocument, ResignationRecord> | null
} = { controller: null }

/** Replaces the editor content with a record from the server ("load the other version"). */
export function loadResignationIntoEditor(record: ResignationRecord) {
  session.controller?.start(record)
  useResignationEditor.getState().load(record.id, record.document)
}

/** After a conflict: keep this editor's version and overwrite the server copy. */
export function overwriteResignationServerCopy(serverRevision: number) {
  session.controller?.overwrite(serverRevision)
}

/** Saves pending changes now; resolves false if they could not be saved. */
export function flushResignationSave(): Promise<boolean> {
  return session.controller?.flush() ?? Promise.resolve(true)
}

/** Loads a letter into the editor and keeps it saved, like the other editors do. */
export function useResignationSession(record: ResignationRecord) {
  const queryClient = useQueryClient()
  const initial = useRef(record)

  useEffect(() => {
    const start = initial.current
    const controller = new AutosaveController<ResignationDocument, ResignationRecord>({
      save: (document, revision) => resignationApi.update(start.id, { revision, document }),
      onState: (state) => useSaveState.setState(state, true),
      onSaved: (saved) => rememberResignation(queryClient, saved),
    })
    session.controller = controller
    loadResignationIntoEditor(start)

    const unsubscribe = useResignationEditor.subscribe((state, previous) => {
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

const s = () => useResignationEditor.getState()
const none = () => {}

/** What the renderer needs to edit a resignation letter in place (CV-only edits do not apply). */
export const resignationEditorApi: EditorApi = {
  setField: (path, value) => s().setField(path, value),
  endTyping: () => s().endTyping(),
  getFocusedPath: () => s().focusedPath,
  setFocusedPath: (path) => s().setFocusedPath(path),
  updateHeader: none,
  updateItem: none,
  addItem: none,
  duplicateItem: none,
  removeItem: none,
  moveItem: none,
  addBullet: none,
  removeBullet: none,
  updateSection: none,
  uploadImage: async () => '',
  notify: (message) => useEditorUi.getState().notify(message),
}

export const resignationActions: LetterActions = {
  addParagraph: (afterIndex) => s().addParagraph(afterIndex),
  removeParagraph: (index) => s().removeParagraph(index),
}
