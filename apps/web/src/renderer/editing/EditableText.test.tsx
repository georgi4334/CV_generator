import { HEADER_LIMITS, TEXT_MAX } from '@cv/shared'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditableText } from './EditableText'
import type { EditorApi } from './editorApi'

function fakeEditor(focused: string | null = null) {
  const editor = {
    setField: vi.fn(),
    endTyping: vi.fn(),
    getFocusedPath: vi.fn(() => focused),
    setFocusedPath: vi.fn(),
  }
  return editor as typeof editor & EditorApi
}

const box = () => screen.getByRole('textbox') as HTMLSpanElement
const typeInto = (element: HTMLElement, text: string) => {
  element.textContent = text
  fireEvent.input(element)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('EditableText input', () => {
  it('reports every change of the text with its path', () => {
    const editor = fakeEditor()
    render(<EditableText editor={editor} path="header.name" value="" placeholder="Your Name" />)
    typeInto(box(), 'Ma')
    typeInto(box(), 'Maria')
    expect(editor.setField.mock.calls).toEqual([
      ['header.name', 'Ma'],
      ['header.name', 'Maria'],
    ])
  })

  it('shows the stored value, and replaces it when the value changes from outside (undo)', () => {
    const editor = fakeEditor()
    const { rerender } = render(
      <EditableText editor={editor} path="header.name" value="Maria" placeholder="Your Name" />,
    )
    expect(box().textContent).toBe('Maria')
    rerender(<EditableText editor={editor} path="header.name" value="" placeholder="Your Name" />)
    expect(box().textContent).toBe('')
  })

  it("cuts text longer than the field's limit and keeps the caret at the end", () => {
    const editor = fakeEditor()
    render(<EditableText editor={editor} path="header.name" value="" placeholder="Your Name" />)
    typeInto(box(), 'x'.repeat(HEADER_LIMITS.name + 500))
    expect(editor.setField).toHaveBeenLastCalledWith('header.name', 'x'.repeat(HEADER_LIMITS.name))
    expect(box().textContent).toHaveLength(HEADER_LIMITS.name)
  })

  it('cuts a 1 MB paste in a free text field to the general limit', () => {
    const editor = fakeEditor()
    render(
      <EditableText
        editor={editor}
        path="sections.s1.text"
        value=""
        placeholder="Summary"
        multiline
      />,
    )
    typeInto(box(), 'lorem ipsum '.repeat(90_000))
    const [, saved] = editor.setField.mock.lastCall!
    expect(saved).toHaveLength(TEXT_MAX)
  })

  it('turns line breaks into spaces in a single-line field and keeps them in a multi-line one', () => {
    const single = fakeEditor()
    const { unmount } = render(
      <EditableText editor={single} path="header.headline" value="" placeholder="Headline" />,
    )
    typeInto(box(), 'one\ntwo\nthree')
    expect(single.setField).toHaveBeenLastCalledWith('header.headline', 'one two three')
    unmount()

    const multi = fakeEditor()
    render(
      <EditableText
        editor={multi}
        path="sections.s1.text"
        value=""
        placeholder="Summary"
        multiline
      />,
    )
    typeInto(box(), 'one\ntwo')
    expect(multi.setField).toHaveBeenLastCalledWith('sections.s1.text', 'one\ntwo')
  })

  it('empties the element completely when the text is deleted, so the placeholder shows', () => {
    const editor = fakeEditor()
    render(<EditableText editor={editor} path="header.name" value="x" placeholder="Your Name" />)
    const element = box()
    element.innerHTML = '<br>'
    element.textContent = ''
    fireEvent.input(element)
    expect(element.childNodes).toHaveLength(0)
    expect(editor.setField).toHaveBeenLastCalledWith('header.name', '')
  })

  it.each([
    ['emoji', '👩🏽‍💻🚀'],
    ['right-to-left text', 'שלום עולם مرحبا'],
    ['combining marks', 'Zoë å'],
    ['HTML characters', '<b>bold</b> & "quotes"'],
    ['null characters', 'a\u0000b'],
  ])('passes %s through as plain text', (_, text) => {
    const editor = fakeEditor()
    render(<EditableText editor={editor} path="header.name" value="" placeholder="Your Name" />)
    typeInto(box(), text)
    expect(editor.setField).toHaveBeenLastCalledWith('header.name', text)
    expect(box().querySelector('b')).toBeNull()
  })
})

describe('EditableText keys', () => {
  it('Enter in a single-line field leaves the field instead of adding a line', () => {
    const editor = fakeEditor()
    render(<EditableText editor={editor} path="header.name" value="" placeholder="Your Name" />)
    box().focus()
    const allowed = fireEvent.keyDown(box(), { key: 'Enter' })
    expect(allowed).toBe(false)
    expect(document.activeElement).not.toBe(box())
  })

  it('Enter calls onEnter when given (e.g. a new bullet) and does not blur', () => {
    const editor = fakeEditor()
    const onEnter = vi.fn()
    render(
      <EditableText
        editor={editor}
        path="header.name"
        value="x"
        placeholder="Bullet"
        onEnter={onEnter}
      />,
    )
    box().focus()
    fireEvent.keyDown(box(), { key: 'Enter' })
    expect(onEnter).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(box())
  })

  it('Enter in a multi-line field is left to the browser', () => {
    const editor = fakeEditor()
    render(
      <EditableText editor={editor} path="sections.s.text" value="" placeholder="Text" multiline />,
    )
    expect(fireEvent.keyDown(box(), { key: 'Enter' })).toBe(true)
  })

  it('Backspace in an empty field calls onBackspaceEmpty, but not when there is text', () => {
    const editor = fakeEditor()
    const onBackspaceEmpty = vi.fn()
    const { rerender } = render(
      <EditableText
        editor={editor}
        path="p"
        value=""
        placeholder="Bullet"
        onBackspaceEmpty={onBackspaceEmpty}
      />,
    )
    fireEvent.keyDown(box(), { key: 'Backspace' })
    expect(onBackspaceEmpty).toHaveBeenCalledOnce()
    rerender(
      <EditableText
        editor={editor}
        path="p"
        value="text"
        placeholder="Bullet"
        onBackspaceEmpty={onBackspaceEmpty}
      />,
    )
    fireEvent.keyDown(box(), { key: 'Backspace' })
    expect(onBackspaceEmpty).toHaveBeenCalledOnce()
  })

  it('Backspace without a handler does nothing special', () => {
    const editor = fakeEditor()
    render(<EditableText editor={editor} path="p" value="" placeholder="Bullet" />)
    expect(fireEvent.keyDown(box(), { key: 'Backspace' })).toBe(true)
  })

  it('Escape leaves the field', () => {
    const editor = fakeEditor()
    render(<EditableText editor={editor} path="p" value="x" placeholder="Bullet" />)
    box().focus()
    fireEvent.keyDown(box(), { key: 'Escape' })
    expect(document.activeElement).not.toBe(box())
  })
})

describe('EditableText focus and paste', () => {
  it('ends the undo step when the field loses focus', () => {
    const editor = fakeEditor()
    render(<EditableText editor={editor} path="p" value="" placeholder="Bullet" />)
    fireEvent.focus(box())
    expect(editor.setFocusedPath).toHaveBeenCalledWith('p')
    fireEvent.blur(box())
    expect(editor.endTyping).toHaveBeenCalledOnce()
  })

  it('forgets the focused path after blur, unless the field was removed from the page', () => {
    const editor = fakeEditor('p')
    const { unmount } = render(<EditableText editor={editor} path="p" value="" placeholder="B" />)
    fireEvent.blur(box())
    act(() => void vi.advanceTimersByTime(1))
    expect(editor.setFocusedPath).toHaveBeenLastCalledWith(null)
    unmount()

    const again = render(<EditableText editor={editor} path="p" value="" placeholder="B2" />)
    editor.setFocusedPath.mockClear()
    fireEvent.blur(again.getByRole('textbox', { name: 'B2' }))
    again.unmount()
    act(() => void vi.advanceTimersByTime(1))
    expect(editor.setFocusedPath).not.toHaveBeenCalled()
  })

  it('takes the focus back when it re-mounts as the remembered field', () => {
    const editor = fakeEditor('sections.s.items.i.title')
    render(
      <EditableText
        editor={editor}
        path="sections.s.items.i.title"
        value="Hi"
        placeholder="Title"
      />,
    )
    expect(document.activeElement).toBe(box())
  })

  it('does not steal the focus for another path', () => {
    const editor = fakeEditor('other')
    render(<EditableText editor={editor} path="p" value="Hi" placeholder="Title" />)
    expect(document.activeElement).not.toBe(box())
  })

  it('pastes as plain text through insertText', () => {
    const editor = fakeEditor()
    const exec = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })
    render(<EditableText editor={editor} path="p" value="" placeholder="Title" />)
    const text = '<b>rich</b>'.repeat(100_000)
    const event = fireEvent.paste(box(), { clipboardData: { getData: () => text } })
    expect(event).toBe(false)
    expect(exec).toHaveBeenCalledWith('insertText', false, text)
    delete (document as { execCommand?: unknown }).execCommand
  })

  it('exposes its label and multi-line state to screen readers', () => {
    const editor = fakeEditor()
    render(<EditableText editor={editor} path="p" value="" placeholder="Summary" multiline />)
    expect(box().getAttribute('aria-label')).toBe('Summary')
    expect(box().getAttribute('aria-multiline')).toBe('true')
  })
})
