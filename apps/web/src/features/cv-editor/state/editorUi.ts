import { create } from 'zustand'

/** Panels that open in the editor's left side panel. */
export type EditorPanel = 'ai' | 'fix' | 'tailor' | 'templates' | 'design' | 'rearrange' | 'history'

interface EditorUiState {
  activePanel: EditorPanel | null
  togglePanel: (panel: EditorPanel) => void
  closePanel: () => void
  /** Short message shown as a toast, e.g. for features that arrive in a later step. */
  notice: string | null
  notify: (message: string) => void
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
  notify: (message) => set({ notice: message }),
  clearNotice: () => set({ notice: null }),
  previewVersionId: null,
  setPreviewVersion: (previewVersionId) => set({ previewVersionId }),
}))
