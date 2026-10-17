import { create } from 'zustand'
import { showToast, type ToastTone } from '@/shared/stores/toasts'

/** Panels that open in the editor's left side panel. */
export type EditorPanel = 'ai' | 'fix' | 'tailor' | 'templates' | 'design' | 'rearrange' | 'history'

/** Page zoom limits and step, in percent of the real size. */
export const ZOOM_MIN = 25
export const ZOOM_MAX = 200
export const ZOOM_STEP = 10

export const clampZoom = (percent: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(percent)))

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
  /** Page zoom in percent; `null` fits the page to the screen (100% where it fits). */
  zoom: number | null
  setZoom: (zoom: number | null) => void
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
  zoom: null,
  setZoom: (zoom) => set({ zoom: zoom === null ? null : clampZoom(zoom) }),
}))
