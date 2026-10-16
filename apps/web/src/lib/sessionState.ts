import type { QueryClient } from '@tanstack/react-query'
import { useCvEditor } from '../features/editor/cvEditorStore'
import { useSaveState } from '../features/editor/editorSession'
import { useLetterEditor } from '../features/letter/letterEditorStore'
import { usePrintJob } from '../features/print/printCv'
import { useEditorUi } from '../stores/editorUi'
import { authKeys } from './authKeys'
import type { User } from '@cv/shared'

/**
 * Forgets everything that belongs to the previous user: cached server data and
 * the documents open in the editors. Run when someone signs in, signs out or
 * deletes the account, so the next person never sees (or saves over) old data.
 */
export function resetClientState(queryClient: QueryClient, user: User | null) {
  queryClient.clear()
  useCvEditor.setState({ docId: null, cv: null, past: [], future: [] })
  useLetterEditor.setState({ docId: null, letter: null, past: [], future: [] })
  useSaveState.setState({ status: 'saved', lastSavedAt: null, error: null })
  useEditorUi.setState({ activePanel: null, notice: null, previewVersionId: null })
  usePrintJob.setState({ job: null })
  queryClient.setQueryData(authKeys.me, user)
}
