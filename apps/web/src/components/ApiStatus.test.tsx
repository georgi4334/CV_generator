import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiStatus } from './ApiStatus'

describe('ApiStatus', () => {
  it('shows a loading state', () => {
    render(<ApiStatus isLoading isError={false} />)
    expect(screen.getByText('Checking API…')).toBeDefined()
  })

  it('shows when the database is down', () => {
    render(
      <ApiStatus
        isLoading={false}
        isError={false}
        data={{ status: 'ok', database: 'down', timestamp: new Date().toISOString() }}
      />,
    )
    expect(screen.getByText('API online, database down')).toBeDefined()
  })

  it('shows an error state', () => {
    render(<ApiStatus isLoading={false} isError />)
    expect(screen.getByText('API unreachable')).toBeDefined()
  })
})
