import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EditorLoading, PageLoading } from './LoadStates'
import { ListSkeleton } from './Skeleton'

describe('loading skeletons', () => {
  it('announce one loading message and hide the shapes from screen readers', () => {
    render(<ListSkeleton label="Loading your documents…" rows={2} />)
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-busy')).toBe('true')
    expect(status.textContent).toBe('Loading your documents…')
    const shapes = status.querySelectorAll('.skeleton')
    expect(shapes.length).toBeGreaterThan(0)
    shapes.forEach((shape) => expect(shape.getAttribute('aria-hidden')).toBe('true'))
  })

  it('use the default loading message for whole pages', () => {
    render(<PageLoading />)
    expect(screen.getByRole('status').textContent).toBe('Loading…')
  })

  it('draws the editor with a blank page', () => {
    render(<EditorLoading label="Loading CV…" />)
    expect(screen.getByRole('status').querySelector('.aspect-paper')).not.toBeNull()
  })
})
