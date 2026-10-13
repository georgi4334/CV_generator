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
