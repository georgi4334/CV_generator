import { afterEach, describe, expect, it } from 'vitest'
import { setLanguage } from '@/i18n'
import { daysBetween, formatDate, localToday } from './format'

afterEach(() => setLanguage('en', { remember: false }))

describe('formatDate', () => {
  it.each([null, ''])('shows a dash for %j', (value) => {
    expect(formatDate(value)).toBe('—')
  })

  it('formats an ISO date in English', () => {
    expect(formatDate('2026-10-13')).toBe('13 Oct 2026')
  })

  it('formats a full timestamp', () => {
    expect(formatDate('2026-10-13T23:59:59Z')).toMatch(/Oct 2026/)
  })

  it('follows the interface language when it changes', async () => {
    await setLanguage('de', { remember: false })
    expect(formatDate('2026-10-13')).toMatch(/13\. Okt\.? 2026/)
    await setLanguage('bg', { remember: false })
    expect(formatDate('2026-10-13')).toMatch(/13/)
    expect(formatDate('2026-10-13')).toMatch(/2026/)
  })

  // BUG: an unparsable date string reaches Intl.DateTimeFormat.format(new Date('garbage')),
  // which throws "RangeError: Invalid time value". Every page that lists jobs, documents or
  // versions renders dates with formatDate, so a single bad date from the API crashes the page
  // into the error boundary.
  // Repro: formatDate('not a date')  ->  RangeError: Invalid time value. Expected: '—' (or the raw text).
  it.fails('does not throw for an invalid date string', () => {
    expect(() => formatDate('not a date')).not.toThrow()
  })

  it('handles the far past and far future', () => {
    expect(formatDate('1900-01-01')).toMatch(/1900/)
    expect(formatDate('2999-12-31')).toMatch(/2999/)
  })
})

describe('localToday', () => {
  it('uses the local calendar day, with zero padding', () => {
    expect(localToday(new Date(2026, 0, 5, 10, 0, 0))).toBe('2026-01-05')
    expect(localToday(new Date(2026, 11, 31, 10, 0, 0))).toBe('2026-12-31')
  })

  it('stays on the same day just before and just after local midnight', () => {
    expect(localToday(new Date(2026, 5, 14, 23, 59, 59, 999))).toBe('2026-06-14')
    expect(localToday(new Date(2026, 5, 15, 0, 0, 0, 0))).toBe('2026-06-15')
  })

  it('handles the daylight-saving change days', () => {
    expect(localToday(new Date(2026, 2, 29, 12, 0, 0))).toBe('2026-03-29')
    expect(localToday(new Date(2026, 9, 25, 12, 0, 0))).toBe('2026-10-25')
    expect(localToday(new Date(2026, 10, 1, 12, 0, 0))).toBe('2026-11-01')
  })

  it('knows leap days', () => {
    expect(localToday(new Date(2028, 1, 29, 8, 0, 0))).toBe('2028-02-29')
  })

  it('has the shape YYYY-MM-DD for the default (now)', () => {
    expect(localToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('daysBetween', () => {
  it.each([
    ['2026-10-15', '2026-10-15', 0],
    ['2026-10-15', '2026-10-16', 1],
    ['2026-10-16', '2026-10-15', -1],
    ['2026-02-28', '2026-03-01', 1],
    ['2028-02-28', '2028-03-01', 2],
    ['2025-12-31', '2026-01-01', 1],
    ['2026-03-28', '2026-03-30', 2],
    ['2026-10-24', '2026-10-26', 2],
    ['2000-01-01', '2026-10-15', 9784],
  ])('%s to %s is %i days', (a, b, expected) => {
    expect(daysBetween(a, b)).toBe(expected)
  })

  it.each([
    ['', '2026-10-15'],
    ['2026-10-15', ''],
    ['x', 'y'],
  ])('is NaN (not a crash) for %j and %j', (a, b) => {
    expect(daysBetween(a, b)).toBeNaN()
  })
})
