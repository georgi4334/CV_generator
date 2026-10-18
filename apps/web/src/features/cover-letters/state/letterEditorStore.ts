import {
  letterDesign,
  type CoverLetterDocument,
  type CvDesign,
  type CvHeader,
  type CvLanguage,
} from '@cv/shared'
import { produce, type Draft } from 'immer'
import { create } from 'zustand'
import { setAtPath } from '@/features/cv-editor/state/documentPath'

const HISTORY_LIMIT = 100
const MAX_PARAGRAPHS = 20

interface LetterEditorState {
  docId: string | null
  letter: CoverLetterDocument | null
  past: CoverLetterDocument[]
  future: CoverLetterDocument[]
  /** Consecutive edits with the same key (typing in one field) form one undo step. */
  coalesceKey: string | null
  /** Field to keep focused when it re-mounts (e.g. after adding a paragraph). */
  focusedPath: string | null

  load: (docId: string, letter: CoverLetterDocument) => void
  change: (recipe: (draft: Draft<CoverLetterDocument>) => void, coalesceKey?: string) => void
  setField: (path: string, value: string) => void
  endTyping: () => void
  setFocusedPath: (path: string | null) => void
  undo: () => void
  redo: () => void

  updateHeader: (patch: Partial<CvHeader>) => void
  updateDesign: (patch: Partial<CvDesign>, coalesceKey?: string) => void
  setLanguage: (language: CvLanguage) => void
  addParagraph: (afterIndex: number) => void
  removeParagraph: (index: number) => void
  /** Copies the linked CV's header (name, contacts, photo) and design again. */
  applyFromCv: (header: CvHeader, design: CvDesign) => void
}

/** The cover letter open in the editor, with undo/redo (same model as the CV editor). */
export const useLetterEditor = create<LetterEditorState>()((set, get) => ({
  docId: null,
  letter: null,
  past: [],
  future: [],
  coalesceKey: null,
  focusedPath: null,

  load: (docId, letter) =>
    set({ docId, letter, past: [], future: [], coalesceKey: null, focusedPath: null }),

  change: (recipe, coalesceKey) => {
    const { letter, past, coalesceKey: lastKey } = get()
    if (!letter) return
    const next = produce(letter, recipe)
    if (next === letter) return
    const merge = coalesceKey !== undefined && coalesceKey === lastKey
    set({
      letter: next,
      past: merge ? past : [...past, letter].slice(-HISTORY_LIMIT),
      future: [],
      coalesceKey: coalesceKey ?? null,
    })
  },

  setField: (path, value) => get().change((draft) => void setAtPath(draft, path, value), path),
  endTyping: () => set({ coalesceKey: null }),
  setFocusedPath: (focusedPath) => set({ focusedPath }),

  undo: () => {
    const { letter, past, future } = get()
    const previous = past[past.length - 1]
    if (!letter || !previous) return
    set({
      letter: previous,
      past: past.slice(0, -1),
      future: [letter, ...future],
      coalesceKey: null,
    })
  },

  redo: () => {
    const { letter, past, future } = get()
    const next = future[0]
    if (!letter || !next) return
    set({ letter: next, past: [...past, letter], future: future.slice(1), coalesceKey: null })
  },

  updateHeader: (patch) => get().change((draft) => void Object.assign(draft.header, patch)),
  updateDesign: (patch, coalesceKey) =>
    get().change((draft) => void Object.assign(draft.design, patch), coalesceKey),
  setLanguage: (language) =>
    get().change((draft) => {
      draft.language = language
    }),

  addParagraph: (afterIndex) => {
    const { letter } = get()
    if (!letter || letter.paragraphs.length >= MAX_PARAGRAPHS) return
    get().change((draft) => void draft.paragraphs.splice(afterIndex + 1, 0, ''))
    set({ focusedPath: `paragraphs.${afterIndex + 1}` })
  },

  removeParagraph: (index) => {
    const { letter } = get()
    if (!letter || letter.paragraphs.length <= 1) return
    get().change((draft) => void draft.paragraphs.splice(index, 1))
    set({ focusedPath: `paragraphs.${Math.max(0, index - 1)}` })
  },

  applyFromCv: (header, design) =>
    get().change((draft) => {
      // Keep the letter's own signature unless it was the old name.
      if (draft.signature === draft.header.name) draft.signature = header.name
      draft.header = { ...header }
      draft.design = letterDesign(design)
    }),
}))
