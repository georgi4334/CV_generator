import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { YearMonthInput } from './dateInputs'

describe('YearMonthInput', () => {
  it('keeps a month chosen before the year', () => {
    const onChange = vi.fn()
    render(<YearMonthInput label="Start" value={null} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Start month'), { target: { value: '03' } })
    fireEvent.change(screen.getByLabelText('Start year'), { target: { value: '2021' } })
    expect(onChange).toHaveBeenLastCalledWith('2021-03')
  })

  it('emits a year alone and clears when the year is removed', () => {
    const onChange = vi.fn()
    render(<YearMonthInput label="End" value="2020" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('End year'), { target: { value: '2022' } })
    expect(onChange).toHaveBeenLastCalledWith('2022')
    fireEvent.change(screen.getByLabelText('End year'), { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})
