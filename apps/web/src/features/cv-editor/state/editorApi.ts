import type { EditorApi } from '@/renderer/editing/editorApi'
import { cvApi } from '@/features/cv-editor/api'
import { useEditorUi } from './editorUi'
import { useCvEditor } from './cvEditorStore'

const s = () => useCvEditor.getState()

/** Stable adapter from the editor store to what the renderer needs. */
export const cvEditorApi: EditorApi = {
  setField: (path, value) => s().setField(path, value),
  endTyping: () => s().endTyping(),
  getFocusedPath: () => s().focusedPath,
  setFocusedPath: (path) => s().setFocusedPath(path),
  updateHeader: (patch) => s().updateHeader(patch),
  updateItem: (sectionId, itemId, patch) => s().updateItem(sectionId, itemId, patch),
  addItem: (sectionId, afterItemId) => s().addItem(sectionId, afterItemId),
  duplicateItem: (sectionId, itemId) => s().duplicateItem(sectionId, itemId),
  removeItem: (sectionId, itemId) => s().removeItem(sectionId, itemId),
  moveItem: (sectionId, itemId, direction) => s().moveItem(sectionId, itemId, direction),
  addBullet: (sectionId, itemId, afterIndex) => s().addBullet(sectionId, itemId, afterIndex),
  removeBullet: (sectionId, itemId, index) => s().removeBullet(sectionId, itemId, index),
  updateSection: (sectionId, patch) => s().updateSection(sectionId, patch),
  uploadImage: async (image) => (await cvApi.uploadImage(image)).url,
  notify: (message) => useEditorUi.getState().notify(message),
}
