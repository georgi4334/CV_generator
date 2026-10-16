import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useThemeStore } from '@/shared/stores/theme'
import { ThemeSelect } from './ThemeSelect'

describe('ThemeSelect', () => {
  beforeEach(() => useThemeStore.setState({ mode: 'system' }))

  it('shows the current theme and switches to another one', () => {
    render(<ThemeSelect />)
    const trigger = screen.getByRole('button', { name: 'Theme: System' })
    expect(trigger.textContent).toContain('System')

    fireEvent.click(trigger)
    const options = screen.getAllByRole('menuitemradio')
    expect(options.map((o) => o.textContent)).toEqual(['System', 'Light', 'Dark'])
    expect(screen.getByRole('menuitemradio', { name: 'System' }).getAttribute('aria-checked')).toBe(
      'true',
    )

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Dark' }))
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByRole('button', { name: 'Theme: Dark' })).toBeDefined()
  })

  it('shows only the icon when compact and closes with Escape', () => {
    render(<ThemeSelect compact />)
    const trigger = screen.getByRole('button', { name: 'Theme: System' })
    expect(trigger.textContent).toBe('')
    fireEvent.click(trigger)
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
