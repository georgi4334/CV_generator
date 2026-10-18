import { useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { fieldMaxLength, resignationFieldMaxLength, TEXT_MAX } from '@cv/shared'
import type { EditorApi } from './editorApi'

interface EditableTextProps {
  editor: EditorApi
  path: string
  value: string
  placeholder: string
  className?: string
  style?: CSSProperties
  multiline?: boolean
  /** Called on Enter (single-line fields); without it Enter just leaves the field. */
  onEnter?: () => void
  /** Called on Backspace in an empty field, e.g. to delete a bullet. */
  onBackspaceEmpty?: () => void
}

/**
 * Plain-text contentEditable. Uncontrolled while typing so the caret never
 * jumps; the DOM text is only replaced when the value changes from outside
 * (undo, redo, another field).
 */
export function EditableText({
  editor,
  path,
  value,
  placeholder,
  className,
  style,
  multiline = false,
  onEnter,
  onBackspaceEmpty,
}: EditableTextProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (el && el.textContent !== value) el.textContent = value
  }, [value])

  // If this field had focus before it re-mounted (e.g. its block moved to the
  // next page while typing, or it was just added), give focus back.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || editor.getFocusedPath() !== path || document.activeElement === el) return
    el.focus()
    const selection = window.getSelection()
    selection?.selectAllChildren(el)
    selection?.collapseToEnd()
  }, [editor, path])

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter') {
      if (multiline) return // new line inside the text
      e.preventDefault()
      if (onEnter) onEnter()
      else e.currentTarget.blur()
    } else if (e.key === 'Backspace' && onBackspaceEmpty && !e.currentTarget.textContent) {
      e.preventDefault()
      onBackspaceEmpty()
    } else if (e.key === 'Escape') {
      e.currentTarget.blur()
    }
  }

  return (
    <span
      ref={ref}
      role="textbox"
      aria-label={placeholder}
      aria-multiline={multiline || undefined}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      data-path={path}
      data-placeholder={placeholder}
      className={`cv-editable ${multiline ? 'whitespace-pre-wrap' : ''} ${className ?? ''}`}
      style={style}
      onFocus={() => editor.setFocusedPath(path)}
      onBlur={(e) => {
        editor.endTyping()
        const el = e.currentTarget
        // A field that is removed from the page also "blurs"; keep its path so it
        // can take focus back when it re-mounts elsewhere.
        setTimeout(() => {
          if (el.isConnected && editor.getFocusedPath() === path) editor.setFocusedPath(null)
        })
      }}
      onInput={(e) => {
        const el = e.currentTarget
        let text = el.textContent ?? ''
        const max = fieldMaxLength(path) ?? resignationFieldMaxLength(path) ?? TEXT_MAX
        if (max !== undefined && text.length > max) {
          text = text.slice(0, max)
          el.textContent = text
          const selection = window.getSelection()
          selection?.selectAllChildren(el)
          selection?.collapseToEnd()
        }
        if (text === '') el.replaceChildren() // keep :empty working for the placeholder
        editor.setField(path, multiline ? text : text.replace(/\n/g, ' '))
      }}
      onPaste={(e) => {
        // Paste as plain text in browsers without plaintext-only support.
        e.preventDefault()
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
      }}
      onKeyDown={handleKeyDown}
    />
  )
}
