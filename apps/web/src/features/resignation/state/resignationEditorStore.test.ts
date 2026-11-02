import { createResignationLetter } from '@cv/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { useResignationEditor } from './resignationEditorStore'

const store = () => useResignationEditor.getState()

beforeEach(() => store().load('res-1', createResignationLetter({ company: 'Acme' })))

describe('resignation editor store', () => {
  it('merges typing in one field into a single undo step and undoes it', () => {
    const before = store().letter!.sender.name
    for (const text of ['M', 'Ma', 'Mar']) store().setField('sender.name', text)
    expect(store().past).toHaveLength(1)
    store().undo()
    expect(store().letter!.sender.name).toBe(before)
    store().redo()
    expect(store().letter!.sender.name).toBe('Mar')
  })

  it('undo and redo with an empty history do nothing', () => {
    const start = store().letter
    store().undo()
    store().redo()
    expect(store().letter).toBe(start)
  })

  it('ignores every edit while nothing is loaded', () => {
    useResignationEditor.setState({ letter: null, past: [], future: [] })
    store().setField('sender.name', 'x')
    store().addParagraph(0)
    store().removeParagraph(0)
    store().setLanguage('bg')
    store().updateDesign({ accentColor: '#000000' })
    store().undo()
    store().redo()
    expect(store().letter).toBeNull()
  })

  it('keeps at most 100 undo steps', () => {
    for (let i = 0; i < 250; i++) {
      store().setField('sender.name', `n${i}`)
      store().endTyping()
    }
    expect(store().past).toHaveLength(100)
  })

  it('stops adding paragraphs at 20 and never removes the last one', () => {
    for (let i = 0; i < 60; i++) store().addParagraph(0)
    expect(store().letter!.paragraphs).toHaveLength(20)
    for (let i = 0; i < 60; i++) store().removeParagraph(0)
    expect(store().letter!.paragraphs).toHaveLength(1)
  })

  it('focuses around added and removed paragraphs', () => {
    store().addParagraph(0)
    expect(store().focusedPath).toBe('paragraphs.1')
    store().removeParagraph(0)
    expect(store().focusedPath).toBe('paragraphs.0')
  })

  it('does not record a step for an unchanged design or a missing path', () => {
    store().updateDesign({ accentColor: store().letter!.design.accentColor })
    store().setField('nothing.here', 'x')
    expect(store().past).toHaveLength(0)
  })

  it('changing the language is one undoable step', () => {
    store().setLanguage('bg')
    expect(store().letter!.language).toBe('bg')
    store().undo()
    expect(store().letter!.language).toBe('en-US')
  })

  it('loading another letter clears history and focus', () => {
    store().setField('sender.name', 'Maria')
    store().addParagraph(0)
    store().load('res-2', createResignationLetter())
    expect(store().past).toHaveLength(0)
    expect(store().focusedPath).toBeNull()
    expect(store().docId).toBe('res-2')
  })
})
