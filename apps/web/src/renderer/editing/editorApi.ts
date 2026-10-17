import type { CvHeader } from '@cv/shared'

/** What the renderer needs to edit a CV in place. Provided by the editor page; absent in preview. */
export interface EditorApi {
  setField: (path: string, value: string) => void
  endTyping: () => void
  getFocusedPath: () => string | null
  setFocusedPath: (path: string | null) => void
  updateHeader: (patch: Partial<CvHeader>) => void
  updateItem: (sectionId: string, itemId: string, patch: Record<string, unknown>) => void
  addItem: (sectionId: string, afterItemId?: string) => void
  duplicateItem: (sectionId: string, itemId: string) => void
  removeItem: (sectionId: string, itemId: string) => void
  moveItem: (sectionId: string, itemId: string, direction: -1 | 1) => void
  addBullet: (sectionId: string, itemId: string, afterIndex: number) => void
  removeBullet: (sectionId: string, itemId: string, index: number) => void
  /** Changes a section's own settings, e.g. how a skills section looks. */
  updateSection: (sectionId: string, patch: Record<string, unknown>) => void
  /** Uploads an image (photo, logo) and returns the URL to store in the CV. */
  uploadImage: (image: Blob) => Promise<string>
  /** Shows a short message to the user. */
  notify: (message: string) => void
}

export const itemPath = (sectionId: string, itemId: string) =>
  `sections.${sectionId}.items.${itemId}`
