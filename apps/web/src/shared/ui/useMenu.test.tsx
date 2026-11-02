import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fitScale, ScaledBox } from './FitToWidth'
import { useMenu } from './useMenu'

function Menu({ items = ['One', 'Two', 'Three'], disabled = [] as string[] }) {
  const [open, setOpen] = useState(false)
  const { triggerRef, menuRef, onKeyDown } = useMenu(open, setOpen)
  return (
    <div onKeyDown={onKeyDown}>
      <button ref={triggerRef} onClick={() => setOpen((o) => !o)}>
        Menu
      </button>
      {open && (
        <div ref={menuRef} role="menu">
          {items.map((name) => (
            <button key={name} role="menuitem" disabled={disabled.includes(name)}>
              {name}
            </button>
          ))}
          <select aria-label="inner">
            <option>a</option>
          </select>
        </div>
      )}
    </div>
  )
}

const trigger = () => screen.getByRole('button', { name: 'Menu' })
const open = () => fireEvent.click(trigger())
const item = (name: string) => screen.getByRole('menuitem', { name })

describe('useMenu keyboard behaviour', () => {
  it('opens with the arrow down on the button and focuses the first item', () => {
    render(<Menu />)
    trigger().focus()
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(item('One'))
  })

  it('moves with the arrow keys and wraps around at both ends', () => {
    render(<Menu />)
    open()
    fireEvent.keyDown(item('One'), { key: 'ArrowUp' })
    expect(document.activeElement).toBe(item('Three'))
    fireEvent.keyDown(item('Three'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(item('One'))
  })

  it('Home and End jump to the first and last item', () => {
    render(<Menu />)
    open()
    fireEvent.keyDown(item('One'), { key: 'End' })
    expect(document.activeElement).toBe(item('Three'))
    fireEvent.keyDown(item('Three'), { key: 'Home' })
    expect(document.activeElement).toBe(item('One'))
  })

  it('skips disabled items', () => {
    render(<Menu disabled={['Two']} />)
    open()
    fireEvent.keyDown(item('One'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(item('Three'))
  })

  it('Escape closes the menu and returns the focus to the button', () => {
    render(<Menu />)
    open()
    fireEvent.keyDown(item('One'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('Tab closes the menu', () => {
    render(<Menu />)
    open()
    fireEvent.keyDown(item('One'), { key: 'Tab' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('an empty menu does not throw on arrow keys', () => {
    render(<Menu items={[]} />)
    open()
    expect(() => fireEvent.keyDown(trigger(), { key: 'ArrowDown' })).not.toThrow()
  })

  it('a menu where every item is disabled does not throw', () => {
    render(<Menu items={['One']} disabled={['One']} />)
    open()
    expect(() => fireEvent.keyDown(trigger(), { key: 'ArrowDown' })).not.toThrow()
  })

  it('keys typed in a control inside the menu are left to that control', () => {
    render(<Menu />)
    open()
    const select = screen.getByLabelText('inner')
    const allowed = fireEvent.keyDown(select, { key: 'ArrowDown' })
    expect(allowed).toBe(true)
    expect(document.activeElement).not.toBe(item('Two'))
  })

  it('other keys do nothing, and arrow down on the button of an open menu enters it', () => {
    render(<Menu />)
    open()
    expect(fireEvent.keyDown(item('One'), { key: 'a' })).toBe(true)
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(item('One'))
  })

  it('arrow down on something else than the button does not open a closed menu', () => {
    render(<Menu />)
    fireEvent.keyDown(document.body.firstChild!, { key: 'ArrowDown' })
    expect(screen.queryByRole('menu')).toBeNull()
  })
})

describe('fitScale', () => {
  it.each([
    [1000, 800, 1],
    [800, 800, 1],
    [400, 800, 0.5],
    [1, 800, 1 / 800],
    [0, 800, 1],
    [Number.NaN, 800, 1],
    [400, 0, 1],
  ])('%s available for %s wide -> %s', (available, width, expected) => {
    expect(fitScale(available, width)).toBeCloseTo(expected)
  })
})

describe('ScaledBox', () => {
  it('takes the scaled width in the layout', () => {
    const { container } = render(
      <ScaledBox width={800} scale={0.5}>
        <p>page</p>
      </ScaledBox>,
    )
    expect((container.firstChild as HTMLElement).style.width).toBe('400px')
  })

  it('does not transform at full size', () => {
    const { container } = render(
      <ScaledBox width={800} scale={1}>
        <p>page</p>
      </ScaledBox>,
    )
    expect((container.querySelector('p')!.parentElement as HTMLElement).style.transform).toBe('')
  })

  it.each([0.25, 2, 1e-6])('renders at the scale %s', (scale) => {
    expect(() =>
      render(
        <ScaledBox width={794} scale={scale}>
          <p>page</p>
        </ScaledBox>,
      ),
    ).not.toThrow()
  })
})
