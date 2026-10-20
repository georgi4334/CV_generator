import { describe, expect, it } from 'vitest'
import {
  CV_LANGUAGES,
  CvLanguageSchema,
  DateRangeSchema,
  HexColorSchema,
  IdSchema,
  LevelSchema,
  RefIdSchema,
  YearMonthSchema,
} from './common'

describe('YearMonthSchema', () => {
  it.each(['2024', '2024-01', '2024-09', '2024-10', '2024-12', '0000', '9999', '0001-01'])(
    'accepts %s',
    (value) => {
      expect(YearMonthSchema.safeParse(value).success).toBe(true)
    },
  )

  it.each([
    '',
    ' ',
    '24',
    '202',
    '20245',
    '99999',
    '2024-',
    '2024-0',
    '2024-1',
    '2024-00',
    '2024-13',
    '2024-99',
    '2024-5',
    '2024-05-01',
    '2024/05',
    '2024.05',
    ' 2024',
    '2024 ',
    '2024-05\n',
    '\n2024',
    '-2024',
    '+2024',
    'abcd',
    'present',
    'Present',
    '２０２４',
    '٢٠٢٤',
    '2024\u0000',
  ])('rejects %j', (value) => {
    expect(YearMonthSchema.safeParse(value).success).toBe(false)
  })

  it.each([2024, 202405, null, undefined, NaN, Infinity, true, [], ['2024'], {}])(
    'rejects the non-string %j',
    (value) => {
      expect(YearMonthSchema.safeParse(value).success).toBe(false)
    },
  )
})

describe('DateRangeSchema', () => {
  it('accepts nulls and a reversed range (order is a warning in the editor, not a schema rule)', () => {
    expect(
      DateRangeSchema.safeParse({ startDate: null, endDate: null, isCurrent: false }).success,
    ).toBe(true)
    expect(
      DateRangeSchema.safeParse({ startDate: '2024-05', endDate: '2019', isCurrent: false })
        .success,
    ).toBe(true)
  })

  it('accepts "isCurrent" together with an end date (the end date is ignored when rendering)', () => {
    expect(
      DateRangeSchema.safeParse({ startDate: '2020', endDate: '2021', isCurrent: true }).success,
    ).toBe(true)
  })

  it('requires all three keys', () => {
    expect(DateRangeSchema.safeParse({ startDate: null, endDate: null }).success).toBe(false)
    expect(DateRangeSchema.safeParse({ isCurrent: false }).success).toBe(false)
  })

  it.each(['yes', 1, 0, null, undefined])('rejects isCurrent = %j', (isCurrent) => {
    expect(DateRangeSchema.safeParse({ startDate: null, endDate: null, isCurrent }).success).toBe(
      false,
    )
  })

  it('rejects the word "present" as a date (use isCurrent)', () => {
    expect(
      DateRangeSchema.safeParse({ startDate: '2020', endDate: 'present', isCurrent: false })
        .success,
    ).toBe(false)
  })
})

describe('LevelSchema', () => {
  it.each([1, 2, 3, 4, 5])('accepts %i', (level) => {
    expect(LevelSchema.safeParse(level).success).toBe(true)
  })

  it.each([
    0,
    6,
    -1,
    1.5,
    2.0000001,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER,
    '3',
    null,
    [3],
  ])('rejects %j', (level) => {
    expect(LevelSchema.safeParse(level).success).toBe(false)
  })
})

describe('HexColorSchema', () => {
  it.each(['#000000', '#FFFFFF', '#abcdef', '#AbCdEf', '#1f4e79'])('accepts %s', (color) => {
    expect(HexColorSchema.safeParse(color).success).toBe(true)
  })

  it.each([
    '',
    '#',
    '#fff',
    '#ffff',
    '#fffffff',
    '#ffffffff',
    'ffffff',
    '#gggggg',
    '#ffffff ',
    ' #ffffff',
    '#ffffff\n',
    'rgb(0,0,0)',
    'red',
    '#ｆｆｆｆｆｆ',
    '#12345G',
  ])('rejects %j', (color) => {
    expect(HexColorSchema.safeParse(color).success).toBe(false)
  })
})

describe('IdSchema', () => {
  it('accepts any non-empty string, including a huge one', () => {
    expect(IdSchema.safeParse('a').success).toBe(true)
    expect(IdSchema.safeParse('x'.repeat(100_000)).success).toBe(true)
  })

  it('rejects the empty string and non-strings', () => {
    expect(IdSchema.safeParse('').success).toBe(false)
    for (const value of [null, undefined, 0, 1, [], {}, NaN])
      expect(IdSchema.safeParse(value).success).toBe(false)
  })

  it('treats a whitespace-only id as an id (it is not trimmed)', () => {
    expect(IdSchema.safeParse('   ').success).toBe(true)
  })
})

describe('RefIdSchema', () => {
  it('accepts a uuid in any case and the nil uuid', () => {
    expect(RefIdSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true)
    expect(RefIdSchema.safeParse('123E4567-E89B-12D3-A456-426614174000').success).toBe(true)
    expect(RefIdSchema.safeParse('00000000-0000-0000-0000-000000000000').success).toBe(true)
  })

  it.each([
    '',
    '1',
    'not-a-uuid',
    '123e4567e89b12d3a456426614174000',
    '123e4567-e89b-12d3-a456-42661417400',
    '123e4567-e89b-12d3-a456-4266141740000',
    '123e4567-e89b-12d3-a456-42661417400g',
    ' 123e4567-e89b-12d3-a456-426614174000',
    '123e4567-e89b-12d3-a456-426614174000\n',
    "1'; DROP TABLE cvs; --",
    '../../etc/passwd',
    '{123e4567-e89b-12d3-a456-426614174000}',
    'x'.repeat(10_000),
  ])('rejects %j before it can reach the database', (id) => {
    expect(RefIdSchema.safeParse(id).success).toBe(false)
  })

  it.each([null, undefined, 123, [], {}])('rejects the non-string %j', (id) => {
    expect(RefIdSchema.safeParse(id).success).toBe(false)
  })
})

describe('CvLanguageSchema', () => {
  it('accepts exactly the offered languages', () => {
    for (const language of CV_LANGUAGES)
      expect(CvLanguageSchema.safeParse(language).success).toBe(true)
  })

  it.each(['en', 'EN-US', 'en_US', 'de', 'bg-BG', '', ' en-US', null, undefined, 5])(
    'rejects %j',
    (language) => {
      expect(CvLanguageSchema.safeParse(language).success).toBe(false)
    },
  )
})
