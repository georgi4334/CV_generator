import { useState } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const inputClass =
  'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'

/** Month (optional) + year. Emits "YYYY", "YYYY-MM" or null. */
export function YearMonthInput({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  const [initialYear, initialMonth] = (value ?? '').split('-')
  // Kept locally so a month chosen before the year is not lost.
  const [yearText, setYearText] = useState(initialYear ?? '')
  const [month, setMonth] = useState(initialMonth ?? '')

  const emit = (nextYear: string, nextMonth: string) => {
    if (!/^\d{4}$/.test(nextYear)) return onChange(null)
    onChange(nextMonth ? `${nextYear}-${nextMonth}` : nextYear)
  }

  return (
    <fieldset className="flex items-center gap-2" disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      <span className="w-12 text-xs text-slate-500">{label}</span>
      <select
        aria-label={`${label} month`}
        className={inputClass}
        value={month}
        onChange={(e) => {
          setMonth(e.target.value)
          emit(yearText, e.target.value)
        }}
      >
        <option value="">—</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, '0')}>
            {name}
          </option>
        ))}
      </select>
      <input
        aria-label={`${label} year`}
        className={`${inputClass} w-20`}
        inputMode="numeric"
        placeholder="Year"
        maxLength={4}
        value={yearText}
        onChange={(e) => {
          const text = e.target.value.replace(/\D/g, '')
          setYearText(text)
          if (text.length === 4 || text.length === 0) emit(text, month)
        }}
      />
    </fieldset>
  )
}

export interface DateRangeValue {
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
}

export function DateRangeForm({
  value,
  onChange,
}: {
  value: DateRangeValue
  onChange: (patch: Partial<DateRangeValue>) => void
}) {
  return (
    <div className="space-y-2">
      <YearMonthInput
        label="Start"
        value={value.startDate}
        onChange={(startDate) => onChange({ startDate })}
      />
      <YearMonthInput
        label="End"
        value={value.endDate}
        disabled={value.isCurrent}
        onChange={(endDate) => onChange({ endDate })}
      />
      <label className="flex items-center gap-2 pl-14 text-sm">
        <input
          type="checkbox"
          checked={value.isCurrent}
          onChange={(e) => onChange({ isCurrent: e.target.checked })}
        />
        Present (still here)
      </label>
    </div>
  )
}
