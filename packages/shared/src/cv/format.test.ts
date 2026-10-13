import { describe, expect, it } from 'vitest'
import { formatDateRange, formatYearMonth } from './i18n'

describe('formatYearMonth', () => {
  it('formats year-only and year-month values', () => {
    expect(formatYearMonth('2024', 'en-US')).toBe('2024')
    expect(formatYearMonth('2024-05', 'en-US')).toBe('May 2024')
    expect(formatYearMonth(null, 'en-US')).toBe('')
  })

  it('uses the CV language', () => {
    expect(formatYearMonth('2024-05', 'bg')).toMatch(/^май 2024$/)
  })
})

describe('formatDateRange', () => {
  it('shows "Present" for current roles', () => {
    expect(formatDateRange({ startDate: '2022-03', endDate: null, isCurrent: true }, 'en-US')).toBe(
      'Mar 2022 – Present',
    )
    expect(formatDateRange({ startDate: '2022', endDate: null, isCurrent: true }, 'bg')).toBe(
      '2022 – до момента',
    )
  })

  it('shows a closed range', () => {
    expect(formatDateRange({ startDate: '2019', endDate: '2022', isCurrent: false }, 'en-US')).toBe(
      '2019 – 2022',
    )
  })

  it('handles missing dates', () => {
    expect(formatDateRange({ startDate: null, endDate: null, isCurrent: false }, 'en-US')).toBe('')
    expect(formatDateRange({ startDate: '2020', endDate: null, isCurrent: false }, 'en-US')).toBe(
      '2020',
    )
  })
})
