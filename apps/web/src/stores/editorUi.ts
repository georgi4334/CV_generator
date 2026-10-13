import { create } from 'zustand'

/** Panels that open in the editor's left side panel. */
export type EditorPanel = 'ai' | 'templates' | 'design' | 'rearrange'

interface EditorUiState {
  activePanel: EditorPanel | null
  togglePanel: (panel: EditorPanel) => void
  closePanel: () => void
  /** Short message shown as a toast, e.g. for features that arrive in a later step. */
  notice: string | null
  notify: (message: string) => void
  clearNotice: () => void
}

export const useEditorUi = create<EditorUiState>()((set) => ({
  activePanel: null,
  togglePanel: (panel) =>
    set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),
  closePanel: () => set({ activePanel: null }),
  notice: null,
  notify: (message) => set({ notice: message }),
  clearNotice: () => set({ notice: null }),
}))
