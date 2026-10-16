import { describe, expect, it } from 'vitest'
import { isDatabaseUnavailable } from './errors'

describe('isDatabaseUnavailable', () => {
  it('recognises a refused connection wrapped in a query error', () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5433'), {
      code: 'ECONNREFUSED',
    })
    const error = new Error('Failed query: select ...', { cause })
    expect(isDatabaseUnavailable(error)).toBe(true)
  })

  it('recognises Postgres shutting down', () => {
    expect(isDatabaseUnavailable(Object.assign(new Error('terminating'), { code: '57P01' }))).toBe(
      true,
    )
  })

  it('does not treat other database errors as an outage', () => {
    expect(
      isDatabaseUnavailable(Object.assign(new Error('duplicate key'), { code: '23505' })),
    ).toBe(false)
    expect(isDatabaseUnavailable(new Error('boom'))).toBe(false)
  })
})
