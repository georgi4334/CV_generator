import { createEmptyCv } from '@cv/shared'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cvApi } from '@/features/cv-editor/api'
import * as image from '@/renderer/editing/image'
import { BACKGROUNDS, backgroundStyle } from '@/renderer/templates/backgrounds'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { DesignPanel } from './DesignPanel'
import { TemplatesPanel } from './TemplatesPanel'

const state = () => useCvEditor.getState()
const design = () => state().cv!.design

beforeEach(() => state().load('cv-test', createEmptyCv()))

describe('TemplatesPanel', () => {
  it('shows all 16 templates grouped by kind of work, and switches template', () => {
    render(<TemplatesPanel />)
    const list = within(screen.getByRole('group', { name: 'Templates' }))
    expect(list.getAllByRole('button')).toHaveLength(16)
    for (const [group, count] of [
      ['Professional', 4],
      ['Design & creative', 5],
      ['Marketing', 3],
      ['Sales', 4],
    ] as const) {
      expect(within(list.getByRole('region', { name: group })).getAllByRole('button')).toHaveLength(
        count,
      )
    }
    expect(
      within(list.getByRole('region', { name: 'Design & creative' })).getByRole('button', {
        name: 'Portfolio',
      }),
    ).toBeDefined()
    fireEvent.click(list.getByRole('button', { name: 'Timeline' }))
    expect(design().templateId).toBe('timeline')
    expect(list.getByRole('button', { name: 'Timeline' }).getAttribute('aria-pressed')).toBe('true')
  })

  it("applies the template's suggested font and layout, keeping the color", () => {
    state().updateDesign({ accentColor: '#6b21a8', fontFamily: 'Rubik' })
    render(<TemplatesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Stylish' }))
    expect(design()).toMatchObject({
      templateId: 'stylish',
      fontFamily: 'Lora',
      columnLayout: 3,
      accentColor: '#6b21a8',
    })
  })

  it('lets the user change the font after choosing a template', () => {
    render(<TemplatesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Creative' }))
    expect(design().fontFamily).toBe('Montserrat')
    cleanup()
    render(<DesignPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Font: Montserrat' }))
    fireEvent.click(screen.getByRole('option', { name: 'Inter' }))
    expect(design()).toMatchObject({ templateId: 'creative', fontFamily: 'Inter' })
  })

  it("marks the templates recommended for the CV's profession", () => {
    render(<TemplatesPanel professionId="designer" />)
    const list = within(screen.getByRole('group', { name: 'Templates' }))
    expect(list.getAllByRole('button', { name: /Recommended$/ })).toEqual(
      ['Creative', 'Portfolio', 'Vivid'].map((name) =>
        list.getByRole('button', { name: `${name} Recommended` }),
      ),
    )
  })

  it('shows no recommendations without a profession', () => {
    render(<TemplatesPanel />)
    expect(screen.queryByText('Recommended')).toBeNull()
  })

  it('switches document size and resume language', () => {
    render(<TemplatesPanel />)
    fireEvent.click(screen.getByRole('radio', { name: 'US Letter' }))
    expect(design().pageSize).toBe('Letter')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bg' } })
    expect(state().cv!.language).toBe('bg')
  })
})

describe('DesignPanel', () => {
  it('moves a slider in one undo step', () => {
    render(<DesignPanel />)
    const slider = screen.getByRole('slider', { name: 'Page margins' })
    fireEvent.change(slider, { target: { value: '3' } })
    fireEvent.change(slider, { target: { value: '5' } })
    fireEvent.pointerUp(slider)
    expect(design().pageMargins).toBe(5)
    state().undo()
    expect(design().pageMargins).toBe(2)
  })

  it('steps font size with the + button and shows its name', () => {
    render(<DesignPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Increase font size' }))
    expect(design().fontSize).toBe(3)
    expect(screen.getByText('Font size: Medium')).toBeDefined()
  })

  it('picks a preset color and warns about a light custom color', () => {
    render(<DesignPanel />)
    fireEvent.click(screen.getByRole('radio', { name: 'Color #6b21a8' }))
    expect(design().accentColor).toBe('#6b21a8')
    expect(screen.queryByRole('note')).toBeNull()

    fireEvent.change(screen.getByRole('textbox', { name: 'Custom color hex code' }), {
      target: { value: '#ffe066' },
    })
    expect(design().accentColor).toBe('#ffe066')
    expect(screen.getByRole('note').textContent).toContain('hard to read')
  })

  it('changes font, column layout and background', () => {
    render(<DesignPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Font: Rubik' }))
    fireEvent.click(screen.getByRole('option', { name: 'Lora' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Column layout 2' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Dots' }))
    expect(design()).toMatchObject({ fontFamily: 'Lora', columnLayout: 2, background: 'dots' })
  })

  it('resets to the template defaults but keeps template and page size', () => {
    state().updateDesign({
      templateId: 'compact',
      pageSize: 'Letter',
      accentColor: '#000000',
      fontSize: 5,
    })
    render(<DesignPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Compact defaults' }))
    expect(design()).toMatchObject({
      templateId: 'compact',
      pageSize: 'Letter',
      accentColor: '#00585a',
      fontSize: 1,
      sectionSpacing: 1,
    })
  })
})

describe('Photo', () => {
  it('uploads a photo, hides it and changes its shape', async () => {
    vi.spyOn(image, 'pickImage').mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }))
    vi.spyOn(cvApi, 'uploadImage').mockResolvedValue({
      id: 'me',
      url: '/api/images/me.jpg',
      contentType: 'image/jpeg',
      size: 1,
    })
    render(<DesignPanel />)
    fireEvent.click(screen.getByRole('button', { name: /^Upload photo$/ }))
    await waitFor(() => expect(state().cv!.header.photoUrl).toBe('/api/images/me.jpg'))
    expect(state().cv!.header.showPhoto).toBe(true)

    fireEvent.click(screen.getByRole('switch', { name: 'Show the photo' }))
    expect(state().cv!.header.showPhoto).toBe(false)
    fireEvent.click(screen.getByRole('radio', { name: 'Square' }))
    expect(state().cv!.header.photoShape).toBe('square')
    fireEvent.click(screen.getByRole('radio', { name: 'Top right' }))
    expect(state().cv!.header.photoPosition).toBe('top-right')

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(state().cv!.header.photoUrl).toBeNull()
    vi.restoreAllMocks()
  })
})

describe('Backgrounds', () => {
  it('offers every background and draws artwork over the whole page', () => {
    render(<DesignPanel />)
    const group = screen.getByRole('radiogroup', { name: 'Background' })
    expect(within(group).getAllByRole('radio')).toHaveLength(BACKGROUNDS.length)
    fireEvent.click(within(group).getByRole('radio', { name: 'Contour lines' }))
    expect(design().background).toBe('topography')

    for (const { id } of BACKGROUNDS.filter((b) => b.id !== 'none')) {
      expect(backgroundStyle(id, '#00585a').backgroundImage).toBeTruthy()
    }
    expect(backgroundStyle('honeycomb', '#00585a').backgroundSize).toBe('cover')
    expect(backgroundStyle('dots', '#00585a').backgroundSize).toBeUndefined()
  })
})
