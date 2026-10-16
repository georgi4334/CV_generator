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
import { useTranslation } from 'react-i18next'
import { getTemplate } from '@/renderer'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { sectionsIn } from '@/features/cv-editor/state/sectionOrder'

const COLUMN_PREFIX = 'column:'
const COLUMNS: Column[] = ['main', 'sidebar']
/** Sections that usually live in the main column when added. */
const MAIN_TYPES = new Set<SectionType>(['summary', 'experience', 'education', 'projects'])

interface RowProps {
  section: Section
  language: CvLanguage
  overlay?: boolean
}

function SectionRowContent({ section, language, handle }: RowProps & { handle?: ReactNode }) {
  const { t } = useTranslation()
  const { renameSection, setSectionVisible, removeSection, endTyping } = useCvEditor.getState()
  const notify = useEditorUi((s) => s.notify)
  const defaultTitle = DEFAULT_SECTION_TITLES[language][section.type]
  const VisibilityIcon = section.visible ? Eye : EyeOff
  const iconButton = 'rounded-tight p-1 text-fg-muted hover:bg-muted hover:text-fg'

  return (
    <div
      className={`flex items-center gap-1 rounded-control border border-line bg-surface px-1.5 py-1 shadow-card ${
        section.visible ? '' : 'opacity-60'
      }`}
    >
      {handle}
      <input
        aria-label={t('editor.rearrange.titleOf', { title: defaultTitle })}
        className="min-w-0 flex-1 rounded-tight bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-fg focus:bg-muted"
        placeholder={defaultTitle}
        value={section.title ?? ''}
        onChange={(e) => renameSection(section.id, e.target.value)}
        onBlur={endTyping}
      />
      <button
        type="button"
        className={iconButton}
        aria-label={
          section.visible
            ? t('editor.rearrange.hide', { title: defaultTitle })
            : t('editor.rearrange.show', { title: defaultTitle })
        }
        title={
          section.visible ? t('editor.rearrange.hideSection') : t('editor.rearrange.showSection')
        }
        onClick={() => setSectionVisible(section.id, !section.visible)}
      >
        <VisibilityIcon className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label={t('editor.rearrange.delete', { title: defaultTitle })}
        title={t('editor.rearrange.deleteSection')}
        onClick={() => {
          removeSection(section.id)
          notify(t('editor.rearrange.deleted'))
        }}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

function SortableSectionRow({ section, language }: RowProps) {
  const { t } = useTranslation()
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
      className="cursor-grab touch-none rounded-tight p-1 text-fg-faint hover:text-fg-soft active:cursor-grabbing"
      aria-label={t('editor.rearrange.drag', {
        title: DEFAULT_SECTION_TITLES[language][section.type],
      })}
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
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}${column}` })
  return (
    <section aria-label={label} className="mb-5">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-fg-muted uppercase">{label}</h3>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={`min-h-12 space-y-1.5 rounded-control p-1 ${
            isOver ? 'bg-brand-soft ' : 'bg-page '
          }`}
        >
          {sections.map((section) => (
            <SortableSectionRow key={section.id} section={section} language={language} />
          ))}
          {sections.length === 0 && (
            <li className="px-2 py-3 text-center text-xs text-fg-faint">
              {t('editor.rearrange.dropHere')}
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  )
}

function AddSectionMenu({ sections, language }: { sections: Section[]; language: CvLanguage }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const addSection = useCvEditor((s) => s.addSection)
  const present = new Set(sections.map((s) => s.type))

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-line-strong py-2 text-sm font-medium text-fg-soft hover:border-brand-line hover:text-brand-fg"
      >
        <Plus className="size-4" /> {t('editor.rearrange.addSection')}
      </button>
      {open && (
        <ul
          role="menu"
          aria-label={t('editor.rearrange.sectionTypes')}
          className="mt-2 grid grid-cols-2 gap-1.5"
        >
          {SECTION_TYPES.map((type) => {
            // Only one of each section type, except custom sections.
            const taken = type !== 'custom' && present.has(type)
            return (
              <li key={type}>
                <button
                  type="button"
                  role="menuitem"
                  disabled={taken}
                  title={taken ? t('editor.rearrange.alreadyOnCv') : undefined}
                  onClick={() => {
                    addSection(type, MAIN_TYPES.has(type) ? 'main' : 'sidebar')
                    setOpen(false)
                  }}
                  className="w-full rounded-tight border border-line px-2 py-1.5 text-left text-xs hover:border-brand-line disabled:cursor-not-allowed disabled:opacity-40"
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
  const { t } = useTranslation()
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
      <p className="mb-4 text-xs text-fg-muted">{t('editor.rearrange.hint')}</p>
      {singleColumn && (
        <p className="mb-4 rounded-tight bg-warning-soft px-3 py-2 text-xs text-warning-fg">
          {t('editor.rearrange.singleColumn')}
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
        {COLUMNS.map((id) => (
          <ColumnList
            key={id}
            column={id}
            label={id === 'main' ? t('editor.rearrange.mainColumn') : t('editor.rearrange.sidebar')}
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
