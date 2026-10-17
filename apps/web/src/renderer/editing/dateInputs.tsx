import { isBefore, shortMonthNames } from '@cv/shared'
import { ChevronLeft, ChevronRight, ChevronDown, TriangleAlert } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Years shown at once when choosing a year. */
const YEARS_PER_PAGE = 12
/** The earliest year offered; CV dates rarely go further back. */
const FIRST_YEAR = 1950
/** How far ahead dates can go (certificates expire in the future). */
const YEARS_AHEAD = 15

const thisYear = () => new Date().getFullYear()
const lastYear = () => thisYear() + YEARS_AHEAD

/**
 * Short month names in the interface language (this is the date picker, not
 * the CV). Browsers give Bulgarian short months as numbers ("03"), so
 * Bulgarian uses the CV's own table.
 */
function monthNames(language: string): string[] {
  if (language.startsWith('bg')) return [...shortMonthNames('bg')]
  const format = new Intl.DateTimeFormat(language, { month: 'short', timeZone: 'UTC' })
  return Array.from({ length: 12 }, (_, i) => format.format(new Date(Date.UTC(2000, i, 15))))
}

/** A gentle note under the picker, e.g. when the end date comes before the start. */
function DateWarning({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-1.5 rounded-control border border-warning-line bg-warning-soft px-2 py-1.5 text-xs text-warning-fg"
    >
      <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

/** "2022-03" → { year: 2022, month: '03' }; "2022" → month ''. */
function parse(value: string | null): { year: number | null; month: string } {
  if (!value) return { year: null, month: '' }
  const [year, month = ''] = value.split('-')
  return { year: Number(year), month }
}

/** "Mar 2022", "2022" or "—", in the interface language. */
export function describeYearMonth(value: string | null, language: string): string {
  const { year, month } = parse(value)
  if (year === null) return '—'
  return month ? `${monthNames(language)[Number(month) - 1]} ${year}` : String(year)
}

const cell =
  'rounded-control px-1 py-1.5 text-sm text-fg-soft transition-colors hover:bg-glass-hover hover:text-fg disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-brand aria-pressed:font-semibold aria-pressed:text-on-brand aria-pressed:hover:bg-brand-hover pointer-coarse:min-h-touch'

/**
 * A year and month picked by clicking: arrows (or the year button, which opens
 * a grid of years) choose the year, then a month commits "YYYY-MM". "Year only"
 * keeps just the year. Emits "YYYY", "YYYY-MM" or null.
 */
export function YearMonthPicker({
  label,
  value,
  onChange,
  disabled = false,
  initialYear,
}: {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  /** Year to show when there is no value yet, e.g. the start year when picking the end. */
  initialYear?: number | null
}) {
  const { t, i18n } = useTranslation()
  const current = parse(value)
  const [viewYear, setViewYear] = useState(current.year ?? initialYear ?? thisYear())
  const [choosingYear, setChoosingYear] = useState(false)
  const [pageStart, setPageStart] = useState(
    () => Math.floor((viewYear - FIRST_YEAR) / YEARS_PER_PAGE) * YEARS_PER_PAGE + FIRST_YEAR,
  )
  const months = monthNames(i18n.language)
  const yearsId = useId()
  const shownYear = current.year === viewYear

  const pickYear = (year: number) => {
    setViewYear(year)
    setChoosingYear(false)
    // A year on its own is a valid date; a month chosen before is kept.
    onChange(current.month ? `${year}-${current.month}` : String(year))
  }

  const openYears = () => {
    setPageStart(Math.floor((viewYear - FIRST_YEAR) / YEARS_PER_PAGE) * YEARS_PER_PAGE + FIRST_YEAR)
    setChoosingYear((open) => !open)
  }

  const step = (by: number) => {
    if (choosingYear) setPageStart((start) => start + by * YEARS_PER_PAGE)
    else setViewYear((year) => year + by)
  }
  const canGoBack = choosingYear ? pageStart > FIRST_YEAR : viewYear > FIRST_YEAR
  const canGoForward = choosingYear
    ? pageStart + YEARS_PER_PAGE <= lastYear()
    : viewYear < lastYear()

  return (
    <fieldset disabled={disabled} className="space-y-2 disabled:opacity-50">
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          className="btn-icon p-1.5"
          aria-label={choosingYear ? t('renderer.earlierYears') : t('renderer.previousYear')}
          disabled={!canGoBack}
          onClick={() => step(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-expanded={choosingYear}
          aria-controls={yearsId}
          aria-label={t('renderer.chooseYear', { year: viewYear })}
          className="btn btn-ghost btn-sm gap-1 text-base font-semibold tabular-nums"
          onClick={openYears}
        >
          {choosingYear
            ? `${pageStart} – ${Math.min(pageStart + YEARS_PER_PAGE - 1, lastYear())}`
            : viewYear}
          <ChevronDown
            className={`size-4 transition-transform ${choosingYear ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        <button
          type="button"
          className="btn-icon p-1.5"
          aria-label={choosingYear ? t('renderer.laterYears') : t('renderer.nextYear')}
          disabled={!canGoForward}
          onClick={() => step(1)}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      {choosingYear ? (
        <div id={yearsId} className="grid grid-cols-4 gap-1">
          {Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i).map((year) => (
            <button
              key={year}
              type="button"
              className={`${cell} tabular-nums`}
              aria-pressed={current.year === year}
              disabled={year > lastYear()}
              onClick={() => pickYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1">
          {months.map((name, i) => {
            const month = String(i + 1).padStart(2, '0')
            return (
              <button
                key={month}
                type="button"
                className={cell}
                aria-label={`${name} ${viewYear}`}
                aria-pressed={shownYear && current.month === month}
                onClick={() => onChange(`${viewYear}-${month}`)}
              >
                {name}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={`${cell} px-2`}
          aria-pressed={shownYear && !current.month}
          onClick={() => pickYear(viewYear)}
        >
          {t('renderer.yearOnly', { year: viewYear })}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={value === null}
          onClick={() => onChange(null)}
        >
          {t('renderer.clearDate')}
        </button>
      </div>
    </fieldset>
  )
}

interface DateTab {
  key: string
  label: string
  /** What the tab shows under its label, e.g. "Mar 2022" or "Present". */
  summary: string
  content: ReactNode
}

/** Two dates side by side as tabs ("From" / "To"); each tab shows its picker. */
function DateTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: [DateTab, DateTab]
  active: number
  onSelect: (index: number) => void
}) {
  const id = useId()
  return (
    <div className="space-y-3">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-control bg-muted p-1">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${id}-panel`}
            className="rounded-tight px-2 py-1 text-left transition-colors hover:bg-glass-hover aria-selected:bg-surface aria-selected:shadow-glass"
            onClick={() => onSelect(i)}
          >
            <span className="block text-xs text-fg-soft">{tab.label}</span>
            <span className="block truncate text-sm font-semibold">{tab.summary}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`}>
        {/* Keyed so each tab opens its picker on its own year. */}
        <div key={tabs[active]!.key}>{tabs[active]!.content}</div>
      </div>
    </div>
  )
}

export interface DateRangeValue {
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
}

/** From and To as tabs; picking the start month moves on to the end. */
export function DateRangeForm({
  value,
  onChange,
}: {
  value: DateRangeValue
  onChange: (patch: Partial<DateRangeValue>) => void
}) {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState(0)
  const startYear = parse(value.startDate).year

  return (
    <DateTabs
      active={active}
      onSelect={setActive}
      tabs={[
        {
          key: 'start',
          label: t('renderer.from'),
          summary: describeYearMonth(value.startDate, i18n.language),
          content: (
            <YearMonthPicker
              label={t('renderer.start')}
              value={value.startDate}
              onChange={(startDate) => {
                onChange({ startDate })
                // A full date is picked: on to the end date.
                if (startDate?.includes('-')) setActive(1)
              }}
            />
          ),
        },
        {
          key: 'end',
          label: t('renderer.to'),
          summary: value.isCurrent
            ? t('renderer.presentShort')
            : describeYearMonth(value.endDate, i18n.language),
          content: (
            <div className="space-y-3">
              <YearMonthPicker
                label={t('renderer.end')}
                value={value.endDate}
                initialYear={startYear}
                disabled={value.isCurrent}
                onChange={(endDate) => onChange({ endDate, isCurrent: false })}
              />
              <label className="flex items-center gap-2 border-t border-line pt-3 text-sm">
                <input
                  type="checkbox"
                  checked={value.isCurrent}
                  onChange={(e) => onChange({ isCurrent: e.target.checked })}
                />
                {t('renderer.present')}
              </label>
              {!value.isCurrent && isBefore(value.endDate, value.startDate) && (
                <DateWarning>{t('renderer.endBeforeStart')}</DateWarning>
              )}
            </div>
          ),
        },
      ]}
    />
  )
}

/** One date (a course, or when a certificate was issued) as the same year/month picker. */
export function SingleDateForm({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | null
  onChange: (value: string | null) => void
}) {
  return <YearMonthPicker label={label} value={value} onChange={onChange} />
}

export interface CertificateDates {
  date: string | null
  expiryDate: string | null
}

/** When a certificate was issued and when it expires, as two tabs. */
export function CertificateDatesForm({
  value,
  onChange,
}: {
  value: CertificateDates
  onChange: (patch: Partial<CertificateDates>) => void
}) {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState(0)

  return (
    <DateTabs
      active={active}
      onSelect={setActive}
      tabs={[
        {
          key: 'issued',
          label: t('renderer.issued'),
          summary: describeYearMonth(value.date, i18n.language),
          content: (
            <YearMonthPicker
              label={t('renderer.issued')}
              value={value.date}
              onChange={(date) => onChange({ date })}
            />
          ),
        },
        {
          key: 'expires',
          label: t('renderer.expires'),
          summary: value.expiryDate
            ? describeYearMonth(value.expiryDate, i18n.language)
            : t('renderer.noExpiry'),
          content: (
            <div className="space-y-3">
              <YearMonthPicker
                label={t('renderer.expires')}
                value={value.expiryDate}
                initialYear={parse(value.date).year}
                onChange={(expiryDate) => onChange({ expiryDate })}
              />
              {isBefore(value.expiryDate, value.date) && (
                <DateWarning>{t('renderer.expiryBeforeIssue')}</DateWarning>
              )}
            </div>
          ),
        },
      ]}
    />
  )
}
