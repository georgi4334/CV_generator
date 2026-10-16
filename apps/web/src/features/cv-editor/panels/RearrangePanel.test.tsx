import { createEmptyCv } from '@cv/shared'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { RearrangePanel } from './RearrangePanel'

const sections = () => useCvEditor.getState().cv!.sections

beforeEach(() => useCvEditor.getState().load('cv-test', createEmptyCv()))

describe('RearrangePanel', () => {
  it('lists sections per column in page order', () => {
    render(<RearrangePanel />)
    const main = within(screen.getByRole('region', { name: 'Main column' }))
    const sidebar = within(screen.getByRole('region', { name: 'Sidebar' }))
    expect(main.getAllByRole('textbox').map((i) => i.getAttribute('placeholder'))).toEqual([
      'Summary',
      'Experience',
    ])
    expect(sidebar.getAllByRole('textbox').map((i) => i.getAttribute('placeholder'))).toEqual([
      'Key Achievements',
      'Skills',
      'Courses',
      'Education',
    ])
  })

  it('hides and shows a section', () => {
    render(<RearrangePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Hide Courses' }))
    expect(sections().find((s) => s.type === 'courses')!.visible).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Show Courses' }))
    expect(sections().find((s) => s.type === 'courses')!.visible).toBe(true)
  })

  it('renames a section', () => {
    render(<RearrangePanel />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Title of Experience' }), {
      target: { value: 'Work History' },
    })
    expect(sections().find((s) => s.type === 'experience')!.title).toBe('Work History')
  })

  it('adds a section, offering only types not on the CV yet', () => {
    render(<RearrangePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Add section' }))
    const menu = within(screen.getByRole('menu', { name: 'Section types' }))
    expect((menu.getByRole('menuitem', { name: 'Skills' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    fireEvent.click(menu.getByRole('menuitem', { name: 'Projects' }))
    expect(sections().find((s) => s.type === 'projects')!.column).toBe('main')
  })

  it('deletes a section', () => {
    render(<RearrangePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Courses' }))
    expect(sections().some((s) => s.type === 'courses')).toBe(false)
  })
})
