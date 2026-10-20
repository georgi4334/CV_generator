import { describe, expect, it } from 'vitest'
import { CV_LANGUAGES } from './common'
import {
  DEFAULT_SECTION_TITLES,
  LANGUAGE_LEVEL_LABELS,
  formatCertificateDates,
  formatDateRange,
  formatYearMonth,
  getSectionTitle,
  isBefore,
  shortMonthNames,
} from './i18n'
import { createSection } from './factories'
import { SECTION_TYPES } from './sections'

describe('month tables', () => {
  it.each(CV_LANGUAGES)('%s has 12 distinct, non-empty month names', (language) => {
    const months = shortMonthNames(language)
    expect(months).toHaveLength(12)
    expect(new Set(months).size).toBe(12)
    for (const month of months) expect(month.trim()).toBe(month)
    for (const month of months) expect(month.length).toBeGreaterThan(0)
  })

  it.each(CV_LANGUAGES)('%s formats every month 01-12 without "undefined"', (language) => {
    for (let month = 1; month <= 12; month++) {
      const value = `2024-${String(month).padStart(2, '0')}`
      const text = formatYearMonth(value, language)
      expect(text).toBe(`${shortMonthNames(language)[month - 1]} 2024`)
      expect(text).not.toContain('undefined')
    }
  })

  it.each(CV_LANGUAGES)('%s has five distinct language level labels', (language) => {
    const labels = LANGUAGE_LEVEL_LABELS[language]
    expect(labels).toHaveLength(5)
    expect(new Set(labels).size).toBe(5)
  })
})

describe('default section titles', () => {
  it.each(CV_LANGUAGES)('%s has a title for every section type', (language) => {
    for (const type of SECTION_TYPES) {
      expect(DEFAULT_SECTION_TITLES[language][type]?.trim(), `${language}/${type}`).toBeTruthy()
    }
  })

  it('en-GB calls the summary a profile, en-US a summary', () => {
    expect(DEFAULT_SECTION_TITLES['en-GB'].summary).toBe('Profile')
    expect(DEFAULT_SECTION_TITLES['en-US'].summary).toBe('Summary')
  })
})

describe('getSectionTitle edge cases', () => {
  it('uses the default for every section type and language when the title is null', () => {
    for (const language of CV_LANGUAGES)
      for (const type of SECTION_TYPES)
        expect(getSectionTitle(createSection(type, 'main'), language)).toBe(
          DEFAULT_SECTION_TITLES[language][type],
        )
  })

  it('keeps an empty custom title (the user cleared it) rather than falling back', () => {
    const section = { ...createSection('skills', 'main'), title: '' }
    expect(getSectionTitle(section, 'en-US')).toBe('')
  })

  it('keeps a whitespace-only, an emoji and a very long custom title as they are', () => {
    for (const title of [' ', '🚀 Launches', 'x'.repeat(10_000)]) {
      expect(getSectionTitle({ ...createSection('custom', 'main'), title }, 'bg')).toBe(title)
    }
  })
})

describe('formatYearMonth edge cases', () => {
  it.each([
    ['', 'en-US', ''],
    ['0000', 'en-US', '0000'],
    ['9999-12', 'en-GB', 'Dec 9999'],
    ['0001-01', 'bg', 'яну 0001'],
  ] as const)('formats %j (%s) as %j', (value, language, expected) => {
    expect(formatYearMonth(value, language)).toBe(expected)
  })

  it('does not throw for text the schema would reject', () => {
    for (const value of ['abc', '2024-', '-', '--', '2024-05-07', 'present'])
      expect(() => formatYearMonth(value, 'en-US')).not.toThrow()
  })

  // BUG: a month outside 01-12 (reachable from stored data that predates validation, or by a
  // client that skips it) is printed as "undefined 2024" instead of falling back to the year.
  it.fails('never prints "undefined" for an out-of-range month', () => {
    expect(formatYearMonth('2024-13', 'en-US')).not.toContain('undefined')
    expect(formatYearMonth('2024-00', 'en-US')).not.toContain('undefined')
  })
})

describe('formatDateRange edge cases', () => {
  it('ignores the end date while isCurrent is set', () => {
    expect(formatDateRange({ startDate: '2020', endDate: '2021', isCurrent: true }, 'en-US')).toBe(
      '2020 – Present',
    )
  })

  it('shows only "Present" when current without a start date', () => {
    expect(formatDateRange({ startDate: null, endDate: null, isCurrent: true }, 'en-GB')).toBe(
      'Present',
    )
    expect(formatDateRange({ startDate: null, endDate: null, isCurrent: true }, 'bg')).toBe(
      'до момента',
    )
  })

  it('shows only the end date when there is no start date', () => {
    expect(
      formatDateRange({ startDate: null, endDate: '2020-06', isCurrent: false }, 'en-US'),
    ).toBe('Jun 2020')
  })

  it('prints a reversed range as written without throwing', () => {
    expect(
      formatDateRange({ startDate: '2024-05', endDate: '2019', isCurrent: false }, 'en-US'),
    ).toBe('May 2024 – 2019')
  })

  it('treats empty strings like missing dates', () => {
    expect(formatDateRange({ startDate: '', endDate: '', isCurrent: false }, 'en-US')).toBe('')
  })
})

describe('formatCertificateDates edge cases', () => {
  it('shows only the expiry in each language when there is no issue date', () => {
    expect(formatCertificateDates({ date: null, expiryDate: '2026-05' }, 'en-US')).toBe(
      'Expires May 2026',
    )
    expect(formatCertificateDates({ date: null, expiryDate: '2026-05' }, 'bg')).toBe(
      'Валиден до май 2026',
    )
  })

  it('does not complain about an expiry date before the issue date', () => {
    expect(formatCertificateDates({ date: '2025', expiryDate: '2020' }, 'en-US')).toBe(
      '2025 · Expires 2020',
    )
  })

  it('treats an undefined expiry like no expiry', () => {
    expect(formatCertificateDates({ date: '2023-01', expiryDate: undefined }, 'en-US')).toBe(
      'Jan 2023',
    )
  })
})

describe('isBefore edge cases', () => {
  it.each([
    ['2021-01', '2021-02', true],
    ['2021-02', '2021-01', false],
    ['2020', '2021', true],
    ['2021', '2020', false],
    ['2021', '2021', false],
    ['2021-12', '2022', true],
    ['2022', '2021-12', false],
    ['0001', '9999', true],
    ['9999-12', '0001-01', false],
    [null, null, false],
    ['2020', null, false],
    ['', '2020', false],
    ['2020', '', false],
  ] as const)('isBefore(%j, %j) is %s', (end, start, expected) => {
    expect(isBefore(end, start)).toBe(expected)
  })
})
