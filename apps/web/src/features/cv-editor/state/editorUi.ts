import { create } from 'zustand'
import { showToast, type ToastTone } from '@/shared/stores/toasts'

/** Panels that open in the editor's left side panel. */
export type EditorPanel = 'ai' | 'fix' | 'tailor' | 'templates' | 'design' | 'rearrange' | 'history'

interface EditorUiState {
  activePanel: EditorPanel | null
  togglePanel: (panel: EditorPanel) => void
  closePanel: () => void
  /** Short message shown as a toast, e.g. for features that arrive in a later step. */
  notice: string | null
  /** Shows the message as a toast (info unless a tone is given). */
  notify: (message: string, tone?: ToastTone) => void
  clearNotice: () => void
  /** A saved version shown instead of the editable CV (History panel). */
  previewVersionId: string | null
  setPreviewVersion: (versionId: string | null) => void
}

export const useEditorUi = create<EditorUiState>()((set) => ({
  activePanel: null,
  togglePanel: (panel) =>
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
      previewVersionId: null,
    })),
  closePanel: () => set({ activePanel: null, previewVersionId: null }),
  notice: null,
  notify: (message, tone = 'info') => {
    set({ notice: message })
    showToast({ id: 'editor-notice', tone, message })
  },
  clearNotice: () => set({ notice: null }),
  previewVersionId: null,
  setPreviewVersion: (previewVersionId) => set({ previewVersionId }),
}))
