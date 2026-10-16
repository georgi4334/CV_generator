import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/** Short month names in the interface language (this is the date picker, not the CV). */
function monthNames(language: string): string[] {
  const format = new Intl.DateTimeFormat(language, { month: 'short', timeZone: 'UTC' })
  return Array.from({ length: 12 }, (_, i) => format.format(new Date(Date.UTC(2000, i, 15))))
}

const inputClass = 'input input-sm w-auto'

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
  const { t, i18n } = useTranslation()
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
      <span className="w-12 text-xs text-fg-muted">{label}</span>
      <select
        aria-label={t('renderer.monthOf', { label })}
        className={inputClass}
        value={month}
        onChange={(e) => {
          setMonth(e.target.value)
          emit(yearText, e.target.value)
        }}
      >
        <option value="">—</option>
        {monthNames(i18n.language).map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, '0')}>
            {name}
          </option>
        ))}
      </select>
      <input
        aria-label={t('renderer.yearOf', { label })}
        className={`${inputClass} w-20`}
        inputMode="numeric"
        placeholder={t('renderer.year')}
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
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <YearMonthInput
        label={t('renderer.start')}
        value={value.startDate}
        onChange={(startDate) => onChange({ startDate })}
      />
      <YearMonthInput
        label={t('renderer.end')}
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
        {t('renderer.present')}
      </label>
    </div>
  )
}
