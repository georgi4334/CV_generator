import { createCoverLetter, createEmptyCv, createExampleCv } from '@cv/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { useLetterEditor } from './letterEditorStore'

const store = () => useLetterEditor.getState()

beforeEach(() => store().load('letter-1', createCoverLetter({ cv: createEmptyCv() })))

describe('letter editor store', () => {
  it('merges typing in one field into a single undo step', () => {
    for (const text of ['D', 'De', 'Dea', 'Dear']) store().setField('greeting', text)
    expect(store().past).toHaveLength(1)
    store().undo()
    expect(store().letter!.greeting).not.toBe('Dear')
  })

  it('undo and redo past either end do nothing', () => {
    const start = store().letter
    store().undo()
    expect(store().letter).toBe(start)
    store().setField('greeting', 'Hi')
    store().redo()
    expect(store().letter!.greeting).toBe('Hi')
    for (let i = 0; i < 5; i++) store().undo()
    expect(store().letter).toBe(start)
  })

  it('ignores every edit while nothing is loaded', () => {
    useLetterEditor.setState({ letter: null, past: [], future: [] })
    store().setField('greeting', 'x')
    store().addParagraph(0)
    store().removeParagraph(0)
    store().setLanguage('bg')
    store().updateHeader({ name: 'x' })
    store().updateDesign({ accentColor: '#000000' })
    store().applyFromCv(createEmptyCv().header, createEmptyCv().design)
    store().undo()
    store().redo()
    expect(store().letter).toBeNull()
  })

  it('keeps at most 100 undo steps', () => {
    for (let i = 0; i < 400; i++) {
      store().setField('greeting', `g${i}`)
      store().endTyping()
    }
    expect(store().past).toHaveLength(100)
  })

  it('stops adding paragraphs at 20', () => {
    for (let i = 0; i < 50; i++) store().addParagraph(0)
    expect(store().letter!.paragraphs).toHaveLength(20)
  })

  it('never removes the last paragraph', () => {
    for (let i = 0; i < 10; i++) store().removeParagraph(0)
    expect(store().letter!.paragraphs).toHaveLength(1)
  })

  it('removing at an index past the end changes nothing but the focus', () => {
    const before = store().letter!.paragraphs
    store().removeParagraph(99)
    expect(store().letter!.paragraphs).toEqual(before)
  })

  it('focuses the new paragraph, and the previous one after a removal', () => {
    store().addParagraph(1)
    expect(store().focusedPath).toBe('paragraphs.2')
    store().removeParagraph(0)
    expect(store().focusedPath).toBe('paragraphs.0')
  })

  it('ignores a path that does not exist', () => {
    const before = store().letter
    store().setField('paragraphs.99', 'x')
    store().setField('nothing.here', 'x')
    expect(store().letter).toBe(before)
  })

  it('takes a 1 MB paragraph and undoes it', () => {
    store().setField('paragraphs.0', 'a'.repeat(1_000_000))
    expect(store().letter!.paragraphs[0]).toHaveLength(1_000_000)
    store().undo()
    expect(store().letter!.paragraphs[0]).toBe('')
  })

  describe('applyFromCv', () => {
    it('copies the header and uses a letter template for the design', () => {
      const cv = createExampleCv('designer')
      cv.design.templateId = 'portfolio'
      store().applyFromCv(cv.header, cv.design)
      expect(store().letter!.header).toEqual(cv.header)
      expect(store().letter!.design.templateId).toBe('creative')
    })

    it('updates the signature when it was the old name, keeps a custom one', () => {
      const cv = createExampleCv('designer')
      store().applyFromCv(cv.header, cv.design)
      expect(store().letter!.signature).toBe(cv.header.name)

      store().setField('signature', 'Best, M.')
      store().endTyping()
      const other = createExampleCv('healthcare')
      store().applyFromCv(other.header, other.design)
      expect(store().letter!.signature).toBe('Best, M.')
    })

    it('is undoable in one step', () => {
      const cv = createExampleCv('designer')
      const before = store().letter
      store().applyFromCv(cv.header, cv.design)
      store().undo()
      expect(store().letter).toBe(before)
    })

    it('does not share the header object with the CV', () => {
      const cv = createExampleCv('designer')
      store().applyFromCv(cv.header, cv.design)
      expect(store().letter!.header).not.toBe(cv.header)
    })
  })
})
