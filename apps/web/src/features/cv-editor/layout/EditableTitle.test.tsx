import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EditableTitle } from './EditableTitle'

const setup = (value = 'Frontend CV') => {
  const onRename = vi.fn()
  render(<EditableTitle value={value} onRename={onRename} />)
  const input = screen.getByRole('textbox') as HTMLInputElement
  fireEvent.focus(input)
  return { input, onRename }
}
const type = (input: HTMLInputElement, value: string) =>
  fireEvent.change(input, { target: { value } })

describe('EditableTitle', () => {
  it('renames on blur and on Enter, with the spaces around the title cut off', () => {
    const { input, onRename } = setup()
    type(input, '  Backend CV  ')
    fireEvent.blur(input)
    expect(onRename).toHaveBeenCalledExactlyOnceWith('Backend CV')

    fireEvent.focus(input)
    type(input, 'Another')
    input.focus()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(document.activeElement).not.toBe(input)
  })

  it.each([
    ['empty', ''],
    ['only spaces', '    '],
    ['only tabs and new lines', '\t\n'],
  ])('keeps the old title when the new one is %s', (_, text) => {
    const { input, onRename } = setup()
    type(input, text)
    fireEvent.blur(input)
    expect(onRename).not.toHaveBeenCalled()
    expect(input.value).toBe('Frontend CV')
  })

  it('does not rename when the title did not change (also with extra spaces)', () => {
    const { input, onRename } = setup()
    type(input, ' Frontend CV ')
    fireEvent.blur(input)
    expect(onRename).not.toHaveBeenCalled()
  })

  it('Escape throws the edit away', async () => {
    const { input, onRename } = setup()
    type(input, 'Typed then abandoned')
    fireEvent.keyDown(input, { key: 'Escape' })
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    fireEvent.blur(input)
    expect(onRename).not.toHaveBeenCalled()
    expect(input.value).toBe('Frontend CV')
  })

  it('limits the title to 200 characters in the field', () => {
    const { input } = setup()
    expect(input.maxLength).toBe(200)
  })

  it.each(['👩🏽‍💻 CV 🚀', 'سيرة ذاتية', '<b>CV</b> & "me"', 'x'.repeat(200)])(
    'passes the title %s on unchanged',
    (title) => {
      const { input, onRename } = setup()
      type(input, title)
      fireEvent.blur(input)
      expect(onRename).toHaveBeenCalledWith(title)
    },
  )

  it('shows a title that changed from outside while not being edited', () => {
    const onRename = vi.fn()
    const { rerender } = render(<EditableTitle value="One" onRename={onRename} />)
    rerender(<EditableTitle value="Two" onRename={onRename} />)
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Two')
  })

  it('renames only once when Enter is followed by the blur it causes', () => {
    const { input, onRename } = setup()
    type(input, 'Once')
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.blur(input)
    expect(onRename).toHaveBeenCalledTimes(1)
  })
})
