import { createEmptyCv, type SectionOf } from '@cv/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCvEditor } from './cvEditorStore'

const store = () => useCvEditor.getState()
const experience = () =>
  store().cv!.sections.find((s) => s.type === 'experience') as SectionOf<'experience'>

beforeEach(() => store().load('cv-test', createEmptyCv()))

describe('cvEditorStore', () => {
  it('merges typing in one field into a single undo step', () => {
    store().setField('header.name', 'M')
    store().setField('header.name', 'Ma')
    store().setField('header.name', 'Maria')
    expect(store().past).toHaveLength(1)
    store().undo()
    expect(store().cv!.header.name).toBe('')
  })

  it('starts a new undo step after leaving the field', () => {
    store().setField('header.name', 'Maria')
    store().endTyping()
    store().setField('header.name', 'Maria Ivanova')
    store().undo()
    expect(store().cv!.header.name).toBe('Maria')
  })

  it('redoes what was undone and clears redo after a new change', () => {
    store().setField('header.name', 'Maria')
    store().undo()
    store().redo()
    expect(store().cv!.header.name).toBe('Maria')
    store().undo()
    store().setField('header.headline', 'Designer')
    expect(store().future).toHaveLength(0)
  })

  it('adds, duplicates, moves and removes entries', () => {
    const sectionId = experience().id
    const firstId = experience().items[0]!.id
    store().updateItem(sectionId, firstId, { title: 'First' })
    store().addItem(sectionId, firstId)
    expect(experience().items).toHaveLength(2)
    expect(store().focusedPath).toBe(
      `sections.${sectionId}.items.${experience().items[1]!.id}.title`,
    )

    store().duplicateItem(sectionId, firstId)
    expect(experience().items[1]!.title).toBe('First')
    expect(experience().items[1]!.id).not.toBe(firstId)

    store().moveItem(sectionId, firstId, 1)
    expect(experience().items[1]!.id).toBe(firstId)

    store().removeItem(sectionId, firstId)
    expect(experience().items.map((i) => i.id)).not.toContain(firstId)
  })

  it('adds and removes bullets and moves focus', () => {
    const sectionId = experience().id
    const itemId = experience().items[0]!.id
    store().addBullet(sectionId, itemId, 0)
    expect(experience().items[0]!.bullets).toEqual(['', ''])
    expect(store().focusedPath).toBe(`sections.${sectionId}.items.${itemId}.bullets.1`)

    store().removeBullet(sectionId, itemId, 1)
    expect(experience().items[0]!.bullets).toEqual([''])
    expect(store().focusedPath).toBe(`sections.${sectionId}.items.${itemId}.bullets.0`)
  })

  it('does not record a history step when nothing changed', () => {
    store().moveItem(experience().id, experience().items[0]!.id, -1)
    expect(store().past).toHaveLength(0)
  })
})

describe('section actions', () => {
  const sections = () => store().cv!.sections
  const columnOrder = (column: 'main' | 'sidebar') =>
    sections()
      .filter((s) => s.column === column)
      .map((s) => s.type)

  it('moves a section between columns and undoes a whole drag in one step', () => {
    const skills = sections().find((s) => s.type === 'skills')!
    store().moveSection(skills.id, 'main', 0, 'drag:1')
    store().moveSection(skills.id, 'main', 1, 'drag:1')
    expect(columnOrder('main')).toEqual(['summary', 'skills', 'experience'])
    store().endTyping()
    store().undo()
    expect(columnOrder('main')).toEqual(['summary', 'experience'])
    expect(columnOrder('sidebar')).toContain('skills')
  })

  it('hides, renames and resets a section title', () => {
    const summary = sections().find((s) => s.type === 'summary')!
    store().setSectionVisible(summary.id, false)
    store().renameSection(summary.id, 'About me')
    expect(sections()[0]).toMatchObject({ visible: false, title: 'About me' })
    store().renameSection(summary.id, '  ')
    expect(sections()[0]!.title).toBeNull()
  })

  it('adds a section at the end of its column and removes it', () => {
    const id = store().addSection('languages', 'sidebar')
    expect(columnOrder('sidebar').at(-1)).toBe('languages')
    store().removeSection(id)
    expect(sections().some((s) => s.id === id)).toBe(false)
  })
})
