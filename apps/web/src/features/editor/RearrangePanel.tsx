import {
  DEFAULT_SECTION_TITLES,
  SECTION_TYPES,
  type Column,
  type CvLanguage,
  type Section,
  type SectionType,
} from '@cv/shared'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { getTemplate } from '../../cv-renderer'
import { useEditorUi } from '../../stores/editorUi'
import { useCvEditor } from './cvEditorStore'
import { sectionsIn } from './sectionOrder'

const COLUMN_PREFIX = 'column:'
const COLUMNS: Array<{ id: Column; label: string }> = [
  { id: 'main', label: 'Main column' },
  { id: 'sidebar', label: 'Sidebar' },
]
/** Sections that usually live in the main column when added. */
const MAIN_TYPES = new Set<SectionType>(['summary', 'experience', 'education', 'projects'])

interface RowProps {
  section: Section
  language: CvLanguage
  overlay?: boolean
}

function SectionRowContent({ section, language, handle }: RowProps & { handle?: ReactNode }) {
  const { renameSection, setSectionVisible, removeSection, endTyping } = useCvEditor.getState()
  const notify = useEditorUi((s) => s.notify)
  const defaultTitle = DEFAULT_SECTION_TITLES[language][section.type]
  const VisibilityIcon = section.visible ? Eye : EyeOff
  const iconButton =
    'rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100'

  return (
    <div
      className={`flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${
        section.visible ? '' : 'opacity-60'
      }`}
    >
      {handle}
      <input
        aria-label={`Title of ${defaultTitle}`}
        className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-slate-800 focus:bg-slate-100 dark:placeholder:text-slate-100 dark:focus:bg-slate-700"
        placeholder={defaultTitle}
        value={section.title ?? ''}
        onChange={(e) => renameSection(section.id, e.target.value)}
        onBlur={endTyping}
      />
      <button
        type="button"
        className={iconButton}
        aria-label={section.visible ? `Hide ${defaultTitle}` : `Show ${defaultTitle}`}
        title={section.visible ? 'Hide section' : 'Show section'}
        onClick={() => setSectionVisible(section.id, !section.visible)}
      >
        <VisibilityIcon className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label={`Delete ${defaultTitle}`}
        title="Delete section"
        onClick={() => {
          removeSection(section.id)
          notify('Section deleted. Press Ctrl+Z to undo.')
        }}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

function SortableSectionRow({ section, language }: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
  })
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="cursor-grab touch-none rounded p-1 text-slate-400 hover:text-slate-700 active:cursor-grabbing dark:hover:text-slate-200"
      aria-label={`Drag ${DEFAULT_SECTION_TITLES[language][section.type]}`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  )
  return (
    <li
      ref={setNodeRef}
      data-section-id={section.id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <SectionRowContent section={section} language={language} handle={handle} />
    </li>
  )
}

function ColumnList({
  column,
  label,
  sections,
  language,
}: {
  column: Column
  label: string
  sections: Section[]
  language: CvLanguage
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}${column}` })
  return (
    <section aria-label={label} className="mb-5">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</h3>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={`min-h-12 space-y-1.5 rounded-lg p-1 ${
            isOver ? 'bg-teal-50 dark:bg-teal-950/40' : 'bg-slate-50 dark:bg-slate-950/40'
          }`}
        >
          {sections.map((section) => (
            <SortableSectionRow key={section.id} section={section} language={language} />
          ))}
          {sections.length === 0 && (
            <li className="px-2 py-3 text-center text-xs text-slate-400">Drop sections here</li>
          )}
        </ul>
      </SortableContext>
    </section>
  )
}

function AddSectionMenu({ sections, language }: { sections: Section[]; language: CvLanguage }) {
  const [open, setOpen] = useState(false)
  const addSection = useCvEditor((s) => s.addSection)
  const present = new Set(sections.map((s) => s.type))

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-600 hover:border-teal-500 hover:text-teal-700 dark:border-slate-600 dark:text-slate-300 dark:hover:text-teal-300"
      >
        <Plus className="size-4" /> Add section
      </button>
      {open && (
        <ul role="menu" aria-label="Section types" className="mt-2 grid grid-cols-2 gap-1.5">
          {SECTION_TYPES.map((type) => {
            // Only one of each section type, except custom sections.
            const taken = type !== 'custom' && present.has(type)
            return (
              <li key={type}>
                <button
                  type="button"
                  role="menuitem"
                  disabled={taken}
                  title={taken ? 'Already on your CV' : undefined}
                  onClick={() => {
                    addSection(type, MAIN_TYPES.has(type) ? 'main' : 'sidebar')
                    setOpen(false)
                  }}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-left text-xs hover:border-teal-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                >
                  {DEFAULT_SECTION_TITLES[language][type]}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Left-panel content for "Rearrange": drag sections within and between columns. */
export function RearrangePanel() {
  const cv = useCvEditor((s) => s.cv)
  const moveSection = useCvEditor((s) => s.moveSection)
  const endTyping = useCvEditor((s) => s.endTyping)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!cv) return null
  const { sections, language } = cv
  const singleColumn = getTemplate(cv.design.templateId).columns === 1

  const locate = (id: string): { column: Column; index: number } | null => {
    if (id.startsWith(COLUMN_PREFIX)) {
      const column = id.slice(COLUMN_PREFIX.length) as Column
      return { column, index: sectionsIn(sections, column).length }
    }
    const section = sections.find((s) => s.id === id)
    if (!section) return null
    return {
      column: section.column,
      index: sectionsIn(sections, section.column).findIndex((s) => s.id === id),
    }
  }

  // Moving into the other column happens while dragging so the rows make room;
  // reordering inside a column is applied on drop.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    const from = locate(String(active.id))
    const to = over ? locate(String(over.id)) : null
    if (from && to && from.column !== to.column)
      moveSection(String(active.id), to.column, to.index, `drag:${active.id}`)
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const from = locate(String(active.id))
    const to = over ? locate(String(over.id)) : null
    if (from && to && from.column === to.column && from.index !== to.index) {
      moveSection(String(active.id), to.column, to.index, `drag:${active.id}`)
    }
    endTyping()
    setActiveId(null)
  }

  const active = sections.find((s) => s.id === activeId)

  return (
    <>
      <p className="mb-4 text-xs text-slate-500">
        Drag sections to reorder them or move them between columns. Click a title to rename it.
      </p>
      {singleColumn && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          This template uses one column: main sections come first, then sidebar sections.
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }: DragStartEvent) => setActiveId(String(active.id))}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          endTyping()
          setActiveId(null)
        }}
      >
        {COLUMNS.map(({ id, label }) => (
          <ColumnList
            key={id}
            column={id}
            label={label}
            sections={sectionsIn(sections, id)}
            language={language}
          />
        ))}
        <DragOverlay>
          {active ? <SectionRowContent section={active} language={language} /> : null}
        </DragOverlay>
      </DndContext>
      <AddSectionMenu sections={sections} language={language} />
    </>
  )
}
