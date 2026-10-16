import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor, useRender } from './context'
import { DateRangeForm, YearMonthInput, type DateRangeValue } from './dateInputs'
import { EditableText } from './EditableText'
import { Popover } from './Popover'

interface FieldProps {
  value: string
  placeholder: string
  /** Document path of the value; makes the field editable in the editor. */
  path?: string
  className?: string
  style?: CSSProperties
  multiline?: boolean
  onEnter?: () => void
  onBackspaceEmpty?: () => void
}

/**
 * A text value. In the editor it is editable in place; otherwise it shows the
 * value, a grey placeholder while editing, or nothing in preview.
 */
export function Field({
  value,
  placeholder,
  path,
  className,
  style,
  multiline,
  onEnter,
  onBackspaceEmpty,
}: FieldProps) {
  const { mode } = useRender()
  const editor = useEditor()
  const textClass = `${multiline ? 'whitespace-pre-wrap' : ''} ${className ?? ''}`

  if (editor && path) {
    return (
      <EditableText
        editor={editor}
        path={path}
        value={value}
        placeholder={placeholder}
        className={className}
        style={style}
        multiline={multiline}
        onEnter={onEnter}
        onBackspaceEmpty={onBackspaceEmpty}
      />
    )
  }
  if (value)
    return (
      <span className={textClass} style={style}>
        {value}
      </span>
    )
  if (mode === 'preview') return null
  return (
    <span className={textClass} style={{ ...style, opacity: 0.45 }} data-placeholder>
      {placeholder}
    </span>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { titleVariant } = useRender()
  if (titleVariant === 'accent-rule') {
    return (
      <h2
        className="mb-[0.5em] border-b-2 pb-[0.2em] text-[1.05em] font-semibold tracking-wider uppercase"
        style={{ color: 'var(--cv-accent-text)', borderColor: 'var(--cv-accent-text)' }}
      >
        {children}
      </h2>
    )
  }
  if (titleVariant === 'bar') {
    return (
      <h2
        className="mb-[0.55em] border-l-4 pl-[0.5em] text-[1.1em] leading-tight font-semibold"
        style={{ borderColor: 'var(--cv-accent-text)' }}
      >
        {children}
      </h2>
    )
  }
  if (titleVariant === 'pill') {
    return (
      <h2 className="mb-[0.6em]">
        <span
          className="inline-block rounded-full px-[0.8em] py-[0.15em] text-[0.85em] font-semibold tracking-wider text-white uppercase"
          style={{ background: 'var(--cv-accent)' }}
        >
          {children}
        </span>
      </h2>
    )
  }
  if (titleVariant === 'accent-small') {
    return (
      <h2
        className="mb-[0.4em] text-[0.9em] font-bold tracking-[0.12em] uppercase"
        style={{ color: 'var(--cv-accent-text)' }}
      >
        {children}
      </h2>
    )
  }
  return (
    <h2
      className="mb-[0.6em] border-b pb-[0.35em] text-[1.1em] font-medium uppercase"
      style={{ borderColor: 'var(--cv-rule)' }}
    >
      {children}
    </h2>
  )
}

/** Two pieces of text on one line: left grows, right is muted and right-aligned. */
export function SplitRow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">{left}</div>
      <div className="shrink-0 text-right text-[0.85em]" style={{ color: 'var(--cv-muted)' }}>
        {right}
      </div>
    </div>
  )
}

interface BulletsProps {
  bullets: string[]
  placeholder: string
  /** Path of the item that owns the bullets, plus its ids for add/remove. */
  itemPath: string
  sectionId: string
  itemId: string
}

export function Bullets({ bullets, placeholder, itemPath, sectionId, itemId }: BulletsProps) {
  const { mode } = useRender()
  const editor = useEditor()
  const shown = mode === 'preview' ? bullets.filter((b) => b.trim()) : bullets
  if (shown.length === 0) return null
  return (
    <ul
      className="mt-[0.3em] list-disc space-y-[0.15em] pl-[1.2em] text-[0.92em] marker:text-[0.8em]"
      style={{ color: 'var(--cv-muted-strong)' }}
    >
      {shown.map((bullet, i) => (
        <li key={i}>
          <Field
            value={bullet}
            placeholder={placeholder}
            path={`${itemPath}.bullets.${i}`}
            onEnter={() => editor?.addBullet(sectionId, itemId, i)}
            onBackspaceEmpty={
              bullets.length > 1 ? () => editor?.removeBullet(sectionId, itemId, i) : undefined
            }
          />
        </li>
      ))}
    </ul>
  )
}

/** Level 1–5 as dots or a bar; clickable in the editor. */
export function LevelIndicator({
  level,
  display,
  onChange,
}: {
  level: number
  display: 'dots' | 'bar'
  onChange?: (level: number) => void
}) {
  const editor = useEditor()
  const editable = editor !== null && onChange !== undefined
  const { t } = useTranslation()

  if (display === 'bar') {
    return (
      <span
        className={`block h-[0.35em] w-full overflow-hidden rounded-full ${editable ? 'cursor-pointer' : ''}`}
        style={{ background: 'var(--cv-rule)' }}
        role={editable ? 'slider' : undefined}
        aria-valuemin={editable ? 1 : undefined}
        aria-valuemax={editable ? 5 : undefined}
        aria-valuenow={editable ? level : undefined}
        aria-label={t('renderer.levelOf', { level })}
        tabIndex={editable ? 0 : undefined}
        onClick={(e) => {
          if (!editable) return
          const rect = e.currentTarget.getBoundingClientRect()
          onChange(Math.min(5, Math.max(1, Math.ceil(((e.clientX - rect.left) / rect.width) * 5))))
        }}
        onKeyDown={(e) => {
          if (!editable) return
          if (e.key === 'ArrowRight') onChange(Math.min(5, level + 1))
          if (e.key === 'ArrowLeft') onChange(Math.max(1, level - 1))
        }}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${level * 20}%`, background: 'var(--cv-accent-text)' }}
        />
      </span>
    )
  }
  return (
    <span className="inline-flex gap-[0.25em]" aria-label={t('renderer.levelOf', { level })}>
      {[1, 2, 3, 4, 5].map((n) => {
        const dot = { background: n <= level ? 'var(--cv-accent-text)' : 'var(--cv-rule)' }
        return editable ? (
          <button
            key={n}
            type="button"
            aria-label={t('renderer.setLevel', { level: n })}
            className="inline-block size-[0.6em] cursor-pointer rounded-full border-0 p-0 hover:scale-125"
            style={dot}
            onClick={() => onChange(n)}
          />
        ) : (
          <span key={n} className="inline-block size-[0.6em] rounded-full" style={dot} />
        )
      })}
    </span>
  )
}

/** Opens a popover from a piece of the page when it is clicked in the editor. */
function PopoverTrigger({
  label,
  display,
  visibleText,
  className,
  children,
}: {
  label: string
  display: ReactNode
  /** The text shown on the page; screen readers hear it first, then what the button does. */
  visibleText?: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={visibleText ? `${visibleText}, ${label.toLowerCase()}` : label}
        aria-expanded={open}
        className={`cv-editable cursor-pointer border-0 bg-transparent p-0 text-inherit ${className ?? ''}`}
        style={{ font: 'inherit', textAlign: 'inherit' }}
        onClick={() => setOpen((o) => !o)}
      >
        {display}
      </button>
      {open && (
        <Popover anchor={ref} label={label} onClose={() => setOpen(false)}>
          {children}
        </Popover>
      )}
    </>
  )
}

/** A formatted date or date range; clicking it in the editor opens the date picker. */
export function DateRangeField({
  text,
  placeholder,
  value,
  onChange,
}: {
  text: string
  placeholder: string
  value: DateRangeValue
  onChange: (patch: Partial<DateRangeValue>) => void
}) {
  const editor = useEditor()
  const { t } = useTranslation()
  const display = <Field value={text} placeholder={placeholder} />
  if (!editor) return display
  return (
    <PopoverTrigger
      label={t('renderer.editDates')}
      display={display}
      visibleText={text || placeholder}
    >
      <DateRangeForm value={value} onChange={onChange} />
    </PopoverTrigger>
  )
}

export function SingleDateField({
  text,
  placeholder,
  value,
  onChange,
}: {
  text: string
  placeholder: string
  value: string | null
  onChange: (value: string | null) => void
}) {
  const editor = useEditor()
  const { t } = useTranslation()
  const display = <Field value={text} placeholder={placeholder} />
  if (!editor) return display
  return (
    <PopoverTrigger
      label={t('renderer.editDate')}
      display={display}
      visibleText={text || placeholder}
    >
      <YearMonthInput label={t('renderer.date')} value={value} onChange={onChange} />
    </PopoverTrigger>
  )
}

export { PopoverTrigger }

/** On the Timeline template, dated entries sit on a vertical line with a dot. */
export function TimelineEntry({ dated, children }: { dated: boolean; children: ReactNode }) {
  const { timeline } = useRender()
  if (!timeline || !dated) return <>{children}</>
  return (
    <div className="relative border-l-2 pl-[1.1em]" style={{ borderColor: 'var(--cv-rule)' }}>
      <span
        className="absolute top-[0.35em] -left-[0.4em] size-[0.7em] rounded-full border-2 bg-white"
        style={{ borderColor: 'var(--cv-accent)' }}
      />
      {children}
    </div>
  )
}
