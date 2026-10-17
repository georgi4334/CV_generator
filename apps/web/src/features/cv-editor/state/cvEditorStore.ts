import {
  createId,
  createItem,
  createSection,
  type Column,
  type CvDesign,
  type CvDocument,
  type CvHeader,
  type CvLanguage,
  type Section,
  type SectionType,
} from '@cv/shared'
import { produce, type Draft } from 'immer'
import { create } from 'zustand'
import { setAtPath } from './documentPath'
import { moveSection } from './sectionOrder'

const HISTORY_LIMIT = 100

type ItemSection = Extract<Section, { items: unknown[] }>
type AnyItem = ItemSection['items'][number]

interface CvEditorState {
  docId: string | null
  cv: CvDocument | null
  past: CvDocument[]
  future: CvDocument[]
  /** Consecutive edits with the same key (typing in one field) form one undo step. */
  coalesceKey: string | null
  /** Field to keep focused when it re-mounts, e.g. after moving to another page. */
  focusedPath: string | null

  load: (docId: string, cv: CvDocument) => void
  change: (recipe: (draft: Draft<CvDocument>) => void, coalesceKey?: string) => void
  setField: (path: string, value: string) => void
  endTyping: () => void
  setFocusedPath: (path: string | null) => void
  undo: () => void
  redo: () => void

  updateHeader: (patch: Partial<CvHeader>) => void
  updateItem: (sectionId: string, itemId: string, patch: Record<string, unknown>) => void
  addItem: (sectionId: string, afterItemId?: string) => void
  duplicateItem: (sectionId: string, itemId: string) => void
  removeItem: (sectionId: string, itemId: string) => void
  moveItem: (sectionId: string, itemId: string, direction: -1 | 1) => void
  addBullet: (sectionId: string, itemId: string, afterIndex: number) => void
  removeBullet: (sectionId: string, itemId: string, index: number) => void

  /** `coalesceKey` lets a whole drag count as one undo step. */
  moveSection: (sectionId: string, toColumn: Column, toIndex: number, coalesceKey?: string) => void
  setSectionVisible: (sectionId: string, visible: boolean) => void
  updateSection: (sectionId: string, patch: Record<string, unknown>) => void
  /** Empty or null restores the default title for the CV language. */
  renameSection: (sectionId: string, title: string | null) => void
  addSection: (type: SectionType, column: Column) => string
  removeSection: (sectionId: string) => void

  /** Pass a key per control so dragging a slider is one undo step. */
  updateDesign: (patch: Partial<CvDesign>, coalesceKey?: string) => void
  setLanguage: (language: CvLanguage) => void
}

function findItemSection(draft: Draft<CvDocument>, sectionId: string) {
  const section = draft.sections.find((s) => s.id === sectionId)
  return section && 'items' in section ? (section as Draft<ItemSection>) : undefined
}

function findItem(draft: Draft<CvDocument>, sectionId: string, itemId: string) {
  const items = findItemSection(draft, sectionId)?.items as Draft<AnyItem>[] | undefined
  return items?.find((item) => item.id === itemId)
}

export const useCvEditor = create<CvEditorState>()((set, get) => ({
  docId: null,
  cv: null,
  past: [],
  future: [],
  coalesceKey: null,
  focusedPath: null,

  load: (docId, cv) =>
    set({ docId, cv, past: [], future: [], coalesceKey: null, focusedPath: null }),

  change: (recipe, coalesceKey) => {
    const { cv, past, coalesceKey: lastKey } = get()
    if (!cv) return
    const next = produce(cv, recipe)
    if (next === cv) return
    const merge = coalesceKey !== undefined && coalesceKey === lastKey
    set({
      cv: next,
      past: merge ? past : [...past, cv].slice(-HISTORY_LIMIT),
      future: [],
      coalesceKey: coalesceKey ?? null,
    })
  },

  setField: (path, value) => get().change((draft) => void setAtPath(draft, path, value), path),
  endTyping: () => set({ coalesceKey: null }),
  setFocusedPath: (focusedPath) => set({ focusedPath }),

  undo: () => {
    const { cv, past, future } = get()
    const previous = past[past.length - 1]
    if (!cv || !previous) return
    set({ cv: previous, past: past.slice(0, -1), future: [cv, ...future], coalesceKey: null })
  },

  redo: () => {
    const { cv, past, future } = get()
    const next = future[0]
    if (!cv || !next) return
    set({ cv: next, past: [...past, cv], future: future.slice(1), coalesceKey: null })
  },

  updateHeader: (patch) => get().change((draft) => void Object.assign(draft.header, patch)),

  updateItem: (sectionId, itemId, patch) =>
    get().change((draft) => {
      const item = findItem(draft, sectionId, itemId)
      if (item) Object.assign(item, patch)
    }),

  addItem: (sectionId, afterItemId) => {
    const section = get().cv?.sections.find((s) => s.id === sectionId)
    if (!section || section.type === 'summary') return
    const item = createItem(section.type)
    get().change((draft) => {
      const items = findItemSection(draft, sectionId)!.items as AnyItem[]
      const index = afterItemId ? items.findIndex((i) => i.id === afterItemId) + 1 : items.length
      items.splice(index, 0, item)
    })
    // Put the cursor in the new item's first text field.
    const firstField = Object.entries(item).find(
      ([key, value]) => key !== 'id' && key !== 'icon' && typeof value === 'string',
    )?.[0]
    if (firstField) set({ focusedPath: `sections.${sectionId}.items.${item.id}.${firstField}` })
  },

  duplicateItem: (sectionId, itemId) =>
    get().change((draft) => {
      const items = findItemSection(draft, sectionId)?.items as AnyItem[] | undefined
      const index = items?.findIndex((i) => i.id === itemId) ?? -1
      if (!items || index < 0) return
      const copy = { ...(JSON.parse(JSON.stringify(items[index])) as AnyItem), id: createId() }
      items.splice(index + 1, 0, copy)
    }),

  removeItem: (sectionId, itemId) =>
    get().change((draft) => {
      const section = findItemSection(draft, sectionId)
      if (!section) return
      const items = section.items as AnyItem[]
      const index = items.findIndex((i) => i.id === itemId)
      if (index >= 0) items.splice(index, 1)
    }),

  moveItem: (sectionId, itemId, direction) =>
    get().change((draft) => {
      const items = findItemSection(draft, sectionId)?.items as AnyItem[] | undefined
      const index = items?.findIndex((i) => i.id === itemId) ?? -1
      const target = index + direction
      if (!items || index < 0 || target < 0 || target >= items.length) return
      const [moved] = items.splice(index, 1)
      items.splice(target, 0, moved!)
    }),

  addBullet: (sectionId, itemId, afterIndex) => {
    get().change((draft) => {
      const item = findItem(draft, sectionId, itemId)
      if (item && 'bullets' in item) item.bullets.splice(afterIndex + 1, 0, '')
    })
    set({ focusedPath: `sections.${sectionId}.items.${itemId}.bullets.${afterIndex + 1}` })
  },

  removeBullet: (sectionId, itemId, index) => {
    get().change((draft) => {
      const item = findItem(draft, sectionId, itemId)
      if (item && 'bullets' in item) item.bullets.splice(index, 1)
    })
    if (index > 0)
      set({ focusedPath: `sections.${sectionId}.items.${itemId}.bullets.${index - 1}` })
  },

  moveSection: (sectionId, toColumn, toIndex, coalesceKey) =>
    get().change((draft) => {
      const next = moveSection(draft.sections as Section[], sectionId, toColumn, toIndex)
      const changed = next.some(
        (s, i) => s.id !== draft.sections[i]?.id || s.column !== draft.sections[i]?.column,
      )
      if (changed) draft.sections = next as Draft<Section>[]
    }, coalesceKey),

  setSectionVisible: (sectionId, visible) =>
    get().change((draft) => {
      const section = draft.sections.find((s) => s.id === sectionId)
      if (section) section.visible = visible
    }),

  updateSection: (sectionId, patch) =>
    get().change((draft) => {
      const section = draft.sections.find((s) => s.id === sectionId)
      if (section) Object.assign(section, patch)
    }),

  renameSection: (sectionId, title) =>
    get().change((draft) => {
      const section = draft.sections.find((s) => s.id === sectionId)
      if (section) section.title = title?.trim() ? title : null
    }, `title:${sectionId}`),

  addSection: (type, column) => {
    const section = createSection(type, column)
    get().change((draft) => {
      draft.sections = moveSection(
        [...(draft.sections as Section[]), section],
        section.id,
        column,
        Infinity,
      ) as Draft<Section>[]
    })
    return section.id
  },

  removeSection: (sectionId) =>
    get().change((draft) => {
      draft.sections = draft.sections.filter((s) => s.id !== sectionId)
    }),

  updateDesign: (patch, coalesceKey) =>
    get().change((draft) => {
      for (const [key, value] of Object.entries(patch) as Array<[keyof CvDesign, never]>) {
        if (draft.design[key] !== value) draft.design[key] = value
      }
    }, coalesceKey),

  setLanguage: (language) =>
    get().change((draft) => {
      draft.language = language
    }),
}))
