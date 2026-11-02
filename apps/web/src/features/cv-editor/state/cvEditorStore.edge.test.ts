import { createEmptyCv, createExampleCv, type Section, type SectionOf } from '@cv/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCvEditor } from './cvEditorStore'

const store = () => useCvEditor.getState()
const sections = () => store().cv!.sections
const experience = () => sections().find((s) => s.type === 'experience') as SectionOf<'experience'>
const MISSING = 'does-not-exist'

beforeEach(() => store().load('cv-test', createEmptyCv()))

describe('undo and redo at the edges', () => {
  it('undo with an empty history does nothing and does not throw', () => {
    const before = store().cv
    expect(() => store().undo()).not.toThrow()
    expect(store().cv).toBe(before)
    expect(store().future).toHaveLength(0)
  })

  it('redo with nothing to redo does nothing', () => {
    store().setField('header.name', 'Maria')
    const before = store().cv
    store().redo()
    expect(store().cv).toBe(before)
  })

  it('undoing more often than there are steps stops at the first state', () => {
    for (const name of ['A', 'B', 'C']) {
      store().setField('header.name', name)
      store().endTyping()
    }
    for (let i = 0; i < 20; i++) store().undo()
    expect(store().cv!.header.name).toBe('')
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(3)
  })

  it('redoing more often than there are steps ends at the latest state', () => {
    for (const name of ['A', 'B', 'C']) {
      store().setField('header.name', name)
      store().endTyping()
    }
    for (let i = 0; i < 3; i++) store().undo()
    for (let i = 0; i < 20; i++) store().redo()
    expect(store().cv!.header.name).toBe('C')
    expect(store().future).toHaveLength(0)
  })

  it('undo and redo with no document loaded do nothing', () => {
    useCvEditor.setState({ cv: null, past: [], future: [] })
    expect(() => {
      store().undo()
      store().redo()
    }).not.toThrow()
    expect(store().cv).toBeNull()
  })

  it('ignores every edit while no document is loaded', () => {
    useCvEditor.setState({ cv: null, past: [], future: [] })
    store().setField('header.name', 'x')
    store().updateHeader({ name: 'y' })
    store().setLanguage('bg')
    store().updateDesign({ accentColor: '#112233' })
    expect(store().cv).toBeNull()
    expect(store().past).toHaveLength(0)
  })

  it('an undo step cannot be merged into after undo (typing starts a new step)', () => {
    store().setField('header.name', 'A')
    store().endTyping()
    store().setField('header.name', 'AB')
    store().undo()
    store().setField('header.name', 'AC')
    expect(store().past).toHaveLength(2)
    store().undo()
    expect(store().cv!.header.name).toBe('A')
  })

  it('loading another document clears the history of the previous one', () => {
    store().setField('header.name', 'Maria')
    store().load('cv-2', createEmptyCv())
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(0)
    store().undo()
    expect(store().cv!.header.name).toBe('')
    expect(store().docId).toBe('cv-2')
  })
})

describe('a long editing session', () => {
  it('keeps at most 100 undo steps after thousands of edits', () => {
    for (let i = 1; i <= 3000; i++) {
      store().setField('header.name', `name ${i}`)
      store().endTyping()
    }
    expect(store().past).toHaveLength(100)
    expect(store().cv!.header.name).toBe('name 3000')
  })

  it('can undo exactly 100 steps back, the oldest ones are forgotten', () => {
    for (let i = 1; i <= 150; i++) {
      store().setField('header.name', `n${i}`)
      store().endTyping()
    }
    for (let i = 0; i < 500; i++) store().undo()
    expect(store().cv!.header.name).toBe('n50')
    expect(store().future).toHaveLength(100)
  })

  it('history entries share structure instead of copying the document each time', () => {
    for (let i = 1; i <= 50; i++) {
      store().setField('header.headline', `h${i}`)
      store().endTyping()
    }
    const [first, second] = store().past
    // Unchanged parts of the document are the same objects in every snapshot (memory stays small).
    expect(first!.sections).toBe(second!.sections)
    expect(first!.design).toBe(second!.design)
  })

  it('typing thousands of characters in one field is one undo step', () => {
    let text = ''
    for (let i = 0; i < 2000; i++) {
      text += 'x'
      store().setField('header.name', text)
    }
    expect(store().past).toHaveLength(1)
    store().undo()
    expect(store().cv!.header.name).toBe('')
  })

  it('handles a single 1 MB paste', () => {
    const big = 'lorem ipsum '.repeat(90_000)
    store().setField('header.headline', big)
    expect(store().cv!.header.headline).toHaveLength(big.length)
    store().undo()
    expect(store().cv!.header.headline).toBe('')
  })

  it('keeps emoji, combining marks and right-to-left text exactly', () => {
    const texts = ['👩🏽‍💻 Développeuse 🚀', 'é å', 'مطور برمجيات — עובד תוכנה', '‮evil‬']
    for (const [i, text] of texts.entries()) {
      store().setField('header.name', text)
      store().endTyping()
      expect(store().cv!.header.name, String(i)).toBe(text)
    }
  })

  it('stores whitespace and newlines as typed (trimming is the server schema job)', () => {
    store().setField('header.name', '  \n\t ')
    expect(store().cv!.header.name).toBe('  \n\t ')
  })

  it('survives 300 sections added and removed again', () => {
    const ids = Array.from({ length: 300 }, () => store().addSection('custom', 'main'))
    expect(sections().length).toBe(6 + 300)
    for (const id of ids) store().removeSection(id)
    expect(sections().length).toBe(6)
  })

  it('adds 100 entries with 20 bullets each and undoes all of it back to the start', () => {
    const sectionId = experience().id
    for (let i = 0; i < 100; i++) store().addItem(sectionId)
    for (const item of experience().items) {
      for (let b = 1; b < 20; b++) store().addBullet(sectionId, item.id, b - 1)
    }
    expect(experience().items).toHaveLength(101)
    expect(experience().items.every((item) => item.bullets.length === 20)).toBe(true)
    // Only the newest 100 steps are kept, so undoing walks back exactly that far.
    for (let i = 0; i < 1000; i++) store().undo()
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(100)
  })
})

describe('edits that point at something that does not exist', () => {
  const snapshot = () => store().cv

  it.each([
    ['updateItem on a missing section', () => store().updateItem(MISSING, 'x', { title: 'a' })],
    [
      'updateItem on a missing item',
      () => store().updateItem(experience().id, MISSING, { title: 'a' }),
    ],
    ['addItem to a missing section', () => store().addItem(MISSING)],
    ['duplicateItem of a missing item', () => store().duplicateItem(experience().id, MISSING)],
    ['duplicateItem in a missing section', () => store().duplicateItem(MISSING, 'x')],
    ['removeItem of a missing item', () => store().removeItem(experience().id, MISSING)],
    ['removeItem in a missing section', () => store().removeItem(MISSING, 'x')],
    ['moveItem of a missing item', () => store().moveItem(experience().id, MISSING, 1)],
    ['moveItem in a missing section', () => store().moveItem(MISSING, 'x', -1)],
    ['addBullet to a missing item', () => store().addBullet(experience().id, MISSING, 0)],
    ['removeBullet from a missing item', () => store().removeBullet(experience().id, MISSING, 0)],
    ['moveSection of a missing section', () => store().moveSection(MISSING, 'main', 0)],
    ['setSectionVisible of a missing section', () => store().setSectionVisible(MISSING, false)],
    ['updateSection of a missing section', () => store().updateSection(MISSING, { title: 'x' })],
    ['renameSection of a missing section', () => store().renameSection(MISSING, 'x')],
    ['setField on a missing path', () => store().setField('sections.nope.items.x.title', 'a')],
    ['setField with an empty path', () => store().setField('', 'a')],
    ['setField on a field that does not exist', () => store().setField('header.notAField', 'a')],
    [
      'setField on an out-of-range bullet',
      () =>
        store().setField(
          `sections.${experience().id}.items.${experience().items[0]!.id}.bullets.99`,
          'a',
        ),
    ],
  ])('%s changes nothing and records no history step', (_, act) => {
    const before = snapshot()
    expect(act).not.toThrow()
    expect(store().cv).toBe(before)
    expect(store().past).toHaveLength(0)
  })

  // BUG (minor): removeSection with an id that is not in the document still replaces
  // `draft.sections` with a new (equal) array, so the document changes identity: it records an
  // undo step that undoes nothing and makes autosave send an identical document.
  // Repro: useCvEditor.getState().removeSection('does-not-exist') -> past.length === 1.
  it.fails('removeSection of a missing section changes nothing and records no history step', () => {
    const before = snapshot()
    store().removeSection(MISSING)
    expect(store().cv).toBe(before)
    expect(store().past).toHaveLength(0)
  })

  it('addItem to a section type without items (summary) does nothing', () => {
    const summary = sections().find((s) => s.type === 'summary')!
    const before = snapshot()
    store().addItem(summary.id)
    expect(store().cv).toBe(before)
  })

  it('updateItem cannot reach an item of a summary section', () => {
    const summary = sections().find((s) => s.type === 'summary')!
    const before = snapshot()
    store().updateItem(summary.id, 'x', { title: 'a' })
    expect(store().cv).toBe(before)
  })

  it('addBullet on an item without a bullets list (skills) does nothing', () => {
    const skills = sections().find((s) => s.type === 'skills') as SectionOf<'skills'>
    const before = snapshot()
    store().addBullet(skills.id, skills.items[0]!.id, 0)
    expect(store().cv).toBe(before)
  })

  it('removeBullet at a negative or too large index does not delete the wrong bullet', () => {
    const sectionId = experience().id
    const itemId = experience().items[0]!.id
    store().addBullet(sectionId, itemId, 0)
    store().setField(`sections.${sectionId}.items.${itemId}.bullets.0`, 'keep me')
    store().endTyping()
    store().removeBullet(sectionId, itemId, 99)
    expect(experience().items[0]!.bullets).toEqual(['keep me', ''])
  })

  it('addItem after an item that is not in the list still adds one entry (at the start)', () => {
    store().addItem(experience().id, MISSING)
    expect(experience().items).toHaveLength(2)
  })
})

describe('moving and deleting', () => {
  const populated = () => {
    store().load('cv-test', createExampleCv('software-developer'))
    return sections().find((s) => s.type === 'experience') as SectionOf<'experience'>
  }

  it('moving the first entry up or the last entry down is a no-op without a history step', () => {
    const section = populated()
    const items = section.items
    expect(items.length).toBeGreaterThan(1)
    const before = store().cv
    store().moveItem(section.id, items[0]!.id, -1)
    store().moveItem(section.id, items.at(-1)!.id, 1)
    expect(store().cv).toBe(before)
    expect(store().past).toHaveLength(0)
  })

  it('moves an entry down and back up to where it was', () => {
    const section = populated()
    const ids = section.items.map((i) => i.id)
    store().moveItem(section.id, ids[0]!, 1)
    store().moveItem(section.id, ids[0]!, -1)
    expect(experience().items.map((i) => i.id)).toEqual(ids)
  })

  it('can delete every entry of a section and then add one again', () => {
    const section = populated()
    for (const item of [...section.items]) store().removeItem(section.id, item.id)
    expect(experience().items).toHaveLength(0)
    store().addItem(section.id)
    expect(experience().items).toHaveLength(1)
  })

  it('duplicates an entry deeply: editing the copy leaves the original alone', () => {
    const section = populated()
    const original = section.items[0]!
    store().duplicateItem(section.id, original.id)
    const copy = experience().items[1]!
    store().updateItem(section.id, copy.id, { title: 'Changed copy' })
    store().setField(`sections.${section.id}.items.${copy.id}.bullets.0`, 'copy bullet')
    expect(experience().items[0]!.title).toBe(original.title)
    expect(experience().items[0]!.bullets[0]).toBe(original.bullets[0])
  })

  it('duplicate then delete the copy gives back the original document content', () => {
    const section = populated()
    const before = JSON.stringify(store().cv)
    store().duplicateItem(section.id, section.items[0]!.id)
    store().removeItem(section.id, experience().items[1]!.id)
    expect(JSON.stringify(store().cv)).toBe(before)
  })

  it('duplicating 200 times gives 200 distinct ids', () => {
    const section = populated()
    const first = section.items[0]!.id
    for (let i = 0; i < 200; i++) store().duplicateItem(section.id, first)
    const ids = experience().items.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('deleting the last section leaves an empty but valid document', () => {
    for (const section of [...sections()]) store().removeSection(section.id)
    expect(sections()).toEqual([])
    expect(store().cv!.header).toBeDefined()
    store().undo()
    expect(sections()).toHaveLength(1)
  })

  it('a section can be added to an empty document', () => {
    for (const section of [...sections()]) store().removeSection(section.id)
    const id = store().addSection('skills', 'sidebar')
    expect(sections().map((s) => s.id)).toEqual([id])
  })

  it('moving a section far past either end clamps to the ends', () => {
    const [first] = sections().filter((s) => s.column === 'main')
    store().moveSection(first!.id, 'main', 10_000)
    expect(
      sections()
        .filter((s) => s.column === 'main')
        .at(-1)!.id,
    ).toBe(first!.id)
    store().moveSection(first!.id, 'main', -10_000)
    expect(sections().filter((s) => s.column === 'main')[0]!.id).toBe(first!.id)
  })

  it('moving a section to the place it already is changes nothing', () => {
    const [first] = sections().filter((s) => s.column === 'main')
    const before = store().cv
    store().moveSection(first!.id, 'main', 0)
    expect(store().cv).toBe(before)
    expect(store().past).toHaveLength(0)
  })

  it('moving the only section of a column into the other column leaves the first column empty', () => {
    const summary = sections().find((s) => s.type === 'summary')!
    const experienceSection = experience()
    store().moveSection(summary.id, 'sidebar', 0)
    store().moveSection(experienceSection.id, 'sidebar', 0)
    expect(sections().every((s: Section) => s.column === 'sidebar')).toBe(true)
  })

  it('renaming a section to emoji or a very long title keeps it', () => {
    const summary = sections().find((s) => s.type === 'summary')!
    store().renameSection(summary.id, '🚀'.repeat(500))
    expect(sections()[0]!.title).toBe('🚀'.repeat(500))
  })

  it('an unchanged design patch records no history', () => {
    store().updateDesign({ accentColor: store().cv!.design.accentColor })
    expect(store().past).toHaveLength(0)
  })

  it('dragging a slider through 100 values is one undo step', () => {
    for (let level = 0; level < 100; level++) {
      store().updateDesign({ pageMargins: ((level % 5) + 1) as 1 }, 'slider:margins')
    }
    expect(store().past.length).toBeLessThanOrEqual(1)
  })

  it('changing the language twice to the same value records one step', () => {
    store().setLanguage('bg')
    store().setLanguage('bg')
    expect(store().past).toHaveLength(1)
  })
})
