import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  CertificateDatesForm,
  DateRangeForm,
  YearMonthPicker,
  describeYearMonth,
  type CertificateDates,
  type DateRangeValue,
} from './dateInputs'

const thisYear = new Date().getFullYear()

describe('YearMonthPicker', () => {
  it('opens on the year of the value and commits a month in that year', () => {
    const onChange = vi.fn()
    render(<YearMonthPicker label="Start" value="2021-03" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Mar 2021' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Previous year' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jun 2020' }))
    expect(onChange).toHaveBeenLastCalledWith('2020-06')
  })

  it('picks a year from the year grid, keeping the month', () => {
    const onChange = vi.fn()
    render(<YearMonthPicker label="Start" value="2021-03" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose year, 2021' }))
    fireEvent.click(screen.getByRole('button', { name: '2018' }))
    expect(onChange).toHaveBeenLastCalledWith('2018-03')
    // Back on the months, now in 2018.
    expect(screen.getByRole('button', { name: 'Jan 2018' })).toBeTruthy()
  })

  it('keeps just the year, or clears the date', () => {
    const onChange = vi.fn()
    render(<YearMonthPicker label="End" value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: `${thisYear} only` }))
    expect(onChange).toHaveBeenLastCalledWith(String(thisYear))
    expect((screen.getByRole('button', { name: 'Clear' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('starts on the given year when there is no value', () => {
    render(<YearMonthPicker label="End" value={null} initialYear={2015} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Choose year, 2015' })).toBeTruthy()
  })
})

function Range({ initial }: { initial: DateRangeValue }) {
  const [value, setValue] = useState(initial)
  return <DateRangeForm value={value} onChange={(patch) => setValue((v) => ({ ...v, ...patch }))} />
}

describe('DateRangeForm', () => {
  it('moves from From to To after picking the start month', () => {
    render(<Range initial={{ startDate: null, endDate: null, isCurrent: false }} />)
    expect(screen.getByRole('tab', { name: /From/ }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Choose year, ' + thisYear }))
    fireEvent.click(screen.getByRole('button', { name: String(thisYear - 1) }))
    fireEvent.click(screen.getByRole('button', { name: `Mar ${thisYear - 1}` }))

    const to = screen.getByRole('tab', { name: /To/ })
    expect(to.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: /From/ }).textContent).toContain(`Mar ${thisYear - 1}`)
    // The end picker opens on the start year.
    fireEvent.click(screen.getByRole('button', { name: `Sep ${thisYear - 1}` }))
    expect(to.textContent).toContain(`Sep ${thisYear - 1}`)
  })

  it('"Present" replaces the end date', () => {
    render(<Range initial={{ startDate: '2020-01', endDate: '2022-05', isCurrent: false }} />)
    fireEvent.click(screen.getByRole('tab', { name: /To/ }))
    fireEvent.click(screen.getByLabelText('Present (still here)'))
    expect(screen.getByRole('tab', { name: /To/ }).textContent).toContain('Present')
    expect(screen.getByRole('button', { name: 'May 2022' }).closest('fieldset')?.disabled).toBe(
      true,
    )
  })
})

describe('CertificateDatesForm', () => {
  it('sets an expiry date on its own tab', () => {
    function Dates() {
      const [value, setValue] = useState<CertificateDates>({ date: '2023-05', expiryDate: null })
      return (
        <CertificateDatesForm
          value={value}
          onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
        />
      )
    }
    render(<Dates />)
    const expires = screen.getByRole('tab', { name: /Expires/ })
    expect(expires.textContent).toContain('No expiry')
    fireEvent.click(expires)
    fireEvent.click(screen.getByRole('button', { name: 'Next year' }))
    fireEvent.click(screen.getByRole('button', { name: 'May 2024' }))
    expect(expires.textContent).toContain('May 2024')
  })
})

describe('describeYearMonth', () => {
  it('describes dates for the picker tabs', () => {
    expect(describeYearMonth('2022-03', 'en')).toBe('Mar 2022')
    expect(describeYearMonth('2022', 'en')).toBe('2022')
    expect(describeYearMonth(null, 'en')).toBe('—')
  })
})
