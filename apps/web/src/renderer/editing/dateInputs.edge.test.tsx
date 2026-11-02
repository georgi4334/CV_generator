import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setLanguage } from '@/i18n'
import {
  CertificateDatesForm,
  DateRangeForm,
  YearMonthPicker,
  describeYearMonth,
  type CertificateDates,
  type DateRangeValue,
} from './dateInputs'

const thisYear = new Date().getFullYear()
const lastYear = thisYear + 15
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement

afterEach(() => {
  vi.useRealTimers()
  return setLanguage('en', { remember: false })
})

function Range({
  initial,
  spy,
}: {
  initial: DateRangeValue
  spy?: (patch: Partial<DateRangeValue>) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <DateRangeForm
      value={value}
      onChange={(patch) => {
        spy?.(patch)
        setValue((v) => ({ ...v, ...patch }))
      }}
    />
  )
}

describe('YearMonthPicker year bounds', () => {
  it('cannot go before 1950 with the arrows', () => {
    render(<YearMonthPicker label="Start" value="1951-06" onChange={() => {}} />)
    fireEvent.click(button('Previous year'))
    expect(button('Choose year, 1950')).toBeTruthy()
    expect(button('Previous year').disabled).toBe(true)
    fireEvent.click(button('Previous year'))
    expect(button('Choose year, 1950')).toBeTruthy()
  })

  it('cannot go more than 15 years ahead with the arrows', () => {
    render(<YearMonthPicker label="End" value={`${lastYear - 1}-01`} onChange={() => {}} />)
    fireEvent.click(button('Next year'))
    expect(button(`Choose year, ${lastYear}`)).toBeTruthy()
    expect(button('Next year').disabled).toBe(true)
  })

  it('shows the year grid page by page and stops at both ends', () => {
    render(<YearMonthPicker label="Start" value="1975-01" onChange={() => {}} />)
    fireEvent.click(button('Choose year, 1975'))
    expect(button('Earlier years').disabled).toBe(false)
    for (let i = 0; i < 20 && !button('Earlier years').disabled; i++) {
      fireEvent.click(button('Earlier years'))
    }
    expect(button('Earlier years').disabled).toBe(true)
    expect(button('1950')).toBeTruthy()
    for (let i = 0; i < 20; i++) {
      const later = button('Later years')
      if (later.disabled) break
      fireEvent.click(later)
    }
    expect(button('Later years').disabled).toBe(true)
  })

  it('disables years beyond the allowed range in the last grid page', () => {
    render(<YearMonthPicker label="End" value={`${lastYear}-01`} onChange={() => {}} />)
    fireEvent.click(button(`Choose year, ${lastYear}`))
    const years = screen.getAllByRole('button').filter((b) => /^\d{4}$/.test(b.textContent ?? ''))
    for (const year of years) {
      const number = Number(year.textContent)
      expect((year as HTMLButtonElement).disabled, String(number)).toBe(number > lastYear)
    }
  })

  it('does not call onChange when only browsing years', () => {
    const onChange = vi.fn()
    render(<YearMonthPicker label="Start" value="2020-05" onChange={onChange} />)
    fireEvent.click(button('Previous year'))
    fireEvent.click(button('Next year'))
    fireEvent.click(button('Choose year, 2020'))
    fireEvent.click(button('Earlier years'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('opens on a stored year before 1950 without crashing', () => {
    render(<YearMonthPicker label="Start" value="1900-01" onChange={() => {}} />)
    expect(button('Choose year, 1900')).toBeTruthy()
    fireEvent.click(button('Choose year, 1900'))
    expect(screen.getAllByRole('button').length).toBeGreaterThan(10)
  })

  it('opens on a stored year far in the future without crashing', () => {
    render(<YearMonthPicker label="End" value="2099-12" onChange={() => {}} />)
    expect(button('Choose year, 2099')).toBeTruthy()
    fireEvent.click(button('Choose year, 2099'))
    expect(button('Later years').disabled).toBe(true)
  })

  it('"Year only" keeps just the year of the page being viewed when no month is set', () => {
    const onChange = vi.fn()
    render(<YearMonthPicker label="Start" value="2020" onChange={onChange} />)
    fireEvent.click(button('Previous year'))
    fireEvent.click(button('2019 only'))
    expect(onChange).toHaveBeenLastCalledWith('2019')
  })

  // BUG: "<year> only" calls the same handler as picking a year in the grid, which keeps the
  // month that was chosen before. With a full date ("2020-05") the button therefore re-emits
  // "2020-05" and the month can only be dropped via Clear and picking again.
  // Repro: <YearMonthPicker value="2020-05"> -> click "2020 only" -> onChange('2020-05').
  // Expected: onChange('2020').
  it.fails('"Year only" drops the month of a full date', () => {
    const onChange = vi.fn()
    render(<YearMonthPicker label="Start" value="2020-05" onChange={onChange} />)
    fireEvent.click(button('2020 only'))
    expect(onChange).toHaveBeenLastCalledWith('2020')
  })

  it('clears the date with one click and disables Clear when empty', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <YearMonthPicker label="Start" value="2020-05" onChange={onChange} />,
    )
    fireEvent.click(button('Clear'))
    expect(onChange).toHaveBeenCalledWith(null)
    rerender(<YearMonthPicker label="Start" value={null} onChange={onChange} />)
    expect(button('Clear').disabled).toBe(true)
  })

  it('a disabled picker is a disabled fieldset around all its buttons', () => {
    render(<YearMonthPicker label="End" value="2020-05" onChange={() => {}} disabled />)
    expect(button('Jun 2020').closest('fieldset')?.disabled).toBe(true)
    expect(button('Clear').closest('fieldset')?.disabled).toBe(true)
  })

  it('double clicking a month reports the same value twice and never something else', () => {
    const onChange = vi.fn()
    render(<YearMonthPicker label="Start" value={null} initialYear={2018} onChange={onChange} />)
    fireEvent.click(button('Mar 2018'))
    fireEvent.click(button('Mar 2018'))
    expect(onChange.mock.calls).toEqual([['2018-03'], ['2018-03']])
  })

  it('starting year may be null without breaking the picker', () => {
    render(<YearMonthPicker label="End" value={null} initialYear={null} onChange={() => {}} />)
    expect(button(`Choose year, ${thisYear}`)).toBeTruthy()
  })

  it('picks a year from the grid when the value had no month: stays year-only', () => {
    const onChange = vi.fn()
    render(<YearMonthPicker label="Start" value="2020" onChange={onChange} />)
    fireEvent.click(button('Choose year, 2020'))
    fireEvent.click(button('2016'))
    expect(onChange).toHaveBeenLastCalledWith('2016')
  })
})

describe('describeYearMonth with odd values', () => {
  it.each([
    ['1950-01', 'Jan 1950'],
    ['2099-12', 'Dec 2099'],
    ['0001-01', 'Jan 1'],
    ['', '—'],
  ])('%s -> %s', (value, expected) => {
    expect(describeYearMonth(value, 'en')).toBe(expected)
  })

  it('names months in German and keeps working for an unknown language tag', () => {
    expect(describeYearMonth('2022-03', 'de')).toMatch(/^Mär/)
    expect(() => describeYearMonth('2022-03', 'xx-YY')).not.toThrow()
  })

  // BUG (defence in depth): values that the CV schema forbids (month "13", "00", text) are
  // printed as "undefined 2022" / "NaN" instead of a dash or the raw value. Only reachable with
  // hand-edited or corrupted data, because the API validates YYYY / YYYY-MM.
  // Repro: describeYearMonth('2022-13', 'en') === 'undefined 2022'; describeYearMonth('abc', 'en') === 'NaN'.
  it.fails.each([['2022-13'], ['2022-00'], ['abc'], ['2022-ab']])(
    'never prints "undefined" or "NaN" for the invalid value "%s"',
    (value) => {
      expect(describeYearMonth(value, 'en')).not.toMatch(/undefined|NaN/)
    },
  )
})

describe('DateRangeForm negative scenarios', () => {
  const empty: DateRangeValue = { startDate: null, endDate: null, isCurrent: false }

  it('warns when the end is before the start, and not when they are equal', () => {
    const { rerender } = render(
      <DateRangeForm
        value={{ startDate: '2020-06', endDate: '2020-05', isCurrent: false }}
        onChange={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /To/ }))
    expect(screen.getByRole('status')).toBeTruthy()
    rerender(
      <DateRangeForm
        value={{ startDate: '2020-06', endDate: '2020-06', isCurrent: false }}
        onChange={() => {}}
      />,
    )
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('does not warn for a start year and an end month inside that year', () => {
    render(
      <DateRangeForm
        value={{ startDate: '2020', endDate: '2020-01', isCurrent: false }}
        onChange={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /To/ }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('warns for an end year before the start year', () => {
    render(
      <DateRangeForm
        value={{ startDate: '2020', endDate: '2019', isCurrent: false }}
        onChange={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /To/ }))
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('does not warn when a date is missing', () => {
    render(
      <DateRangeForm
        value={{ startDate: null, endDate: '2019-01', isCurrent: false }}
        onChange={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /To/ }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('a year-only start does not jump to the end tab; a month does', () => {
    render(<Range initial={empty} />)
    fireEvent.click(button(`${thisYear} only`))
    expect(screen.getByRole('tab', { name: /From/ }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(button(`Mar ${thisYear}`))
    expect(screen.getByRole('tab', { name: /To/ }).getAttribute('aria-selected')).toBe('true')
  })

  it('picking an end date after "Present" turns Present off', () => {
    const spy = vi.fn()
    render(<Range initial={{ startDate: '2020-01', endDate: null, isCurrent: true }} spy={spy} />)
    fireEvent.click(screen.getByRole('tab', { name: /To/ }))
    fireEvent.click(screen.getByLabelText('Present (still here)'))
    expect(spy).toHaveBeenLastCalledWith({ isCurrent: false })
    fireEvent.click(button('Jun 2020'))
    expect(spy).toHaveBeenLastCalledWith({ endDate: '2020-06', isCurrent: false })
  })

  it('switching tabs many times keeps the values', () => {
    render(<Range initial={{ startDate: '2018-02', endDate: '2019-03', isCurrent: false }} />)
    for (let i = 0; i < 25; i++) {
      fireEvent.click(screen.getByRole('tab', { name: /To/ }))
      fireEvent.click(screen.getByRole('tab', { name: /From/ }))
    }
    expect(screen.getByRole('tab', { name: /From/ }).textContent).toContain('Feb 2018')
    expect(screen.getByRole('tab', { name: /To/ }).textContent).toContain('Mar 2019')
  })

  it('shows a dash for missing dates', () => {
    render(<Range initial={empty} />)
    expect(screen.getByRole('tab', { name: /From/ }).textContent).toContain('—')
    expect(screen.getByRole('tab', { name: /To/ }).textContent).toContain('—')
  })

  it('opens the end picker on the start year when nothing is picked yet', () => {
    render(<Range initial={{ startDate: '2005-04', endDate: null, isCurrent: false }} />)
    fireEvent.click(screen.getByRole('tab', { name: /To/ }))
    expect(button('Choose year, 2005')).toBeTruthy()
  })

  it('works in Bulgarian and German (month names and labels follow the interface)', async () => {
    await act(() => setLanguage('bg', { remember: false }))
    render(<Range initial={{ startDate: '2020-03', endDate: '2021-04', isCurrent: false }} />)
    expect(screen.getByRole('tab', { name: /март 2020/ })).toBeTruthy()
    await act(() => setLanguage('de', { remember: false }))
    expect(screen.getByRole('tab', { name: /Mär/ })).toBeTruthy()
  })
})

describe('CertificateDatesForm negative scenarios', () => {
  function Dates({ initial }: { initial: CertificateDates }) {
    const [value, setValue] = useState(initial)
    return (
      <CertificateDatesForm
        value={value}
        onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
      />
    )
  }

  it('does not warn when the certificate expires in the month it was issued', () => {
    render(<Dates initial={{ date: '2023-05', expiryDate: '2023-05' }} />)
    fireEvent.click(screen.getByRole('tab', { name: /Expires/ }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows "No expiry" and lets the user clear an expiry again', () => {
    render(<Dates initial={{ date: '2023-05', expiryDate: '2024-05' }} />)
    const expires = screen.getByRole('tab', { name: /Expires/ })
    expect(expires.textContent).toContain('May 2024')
    fireEvent.click(expires)
    fireEvent.click(button('Clear'))
    expect(expires.textContent).toContain('No expiry')
  })

  it('can set an expiry without an issue date', () => {
    render(<Dates initial={{ date: null, expiryDate: null }} />)
    fireEvent.click(screen.getByRole('tab', { name: /Expires/ }))
    fireEvent.click(button(`Mar ${thisYear}`))
    expect(screen.getByRole('tab', { name: /Expires/ }).textContent).toContain(`Mar ${thisYear}`)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('never reports both dates changed from a single click', () => {
    const onChange = vi.fn()
    render(
      <CertificateDatesForm value={{ date: '2023-05', expiryDate: null }} onChange={onChange} />,
    )
    fireEvent.click(button('Jun 2023'))
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({ date: '2023-06' })
  })
})

describe('the current year on the clock edge', () => {
  it('uses the real current year when the page is opened just after New Year', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-01T00:00:01'))
    render(<YearMonthPicker label="Start" value={null} onChange={() => {}} />)
    expect(button('Choose year, 2027')).toBeTruthy()
  })

  it('the last allowed year moves with the clock', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2040-06-15T12:00:00'))
    render(<YearMonthPicker label="End" value="2054-01" onChange={() => {}} />)
    fireEvent.click(button('Next year'))
    expect(button('Choose year, 2055')).toBeTruthy()
    expect(button('Next year').disabled).toBe(true)
  })
})
