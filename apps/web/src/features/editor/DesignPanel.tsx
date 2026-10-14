import {
  ACCENT_PRESETS,
  DEFAULT_DESIGN,
  FONT_FAMILIES,
  type CvDesign,
  type FontFamily,
} from '@cv/shared'
import { Check, ChevronDown, Minus, Plus, RotateCcw, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { getTemplate } from '../../cv-renderer'
import { BACKGROUNDS, backgroundImage } from '../../cv-renderer/backgrounds'
import { FONT_STACKS } from '../../cv-renderer/fonts'
import { sidebarFor, type TemplateDefinition } from '../../cv-renderer/templates'
import { contrastWithWhite } from './contrast'
import { useCvEditor } from './cvEditorStore'

type LevelKey = 'pageMargins' | 'sectionSpacing' | 'fontSize' | 'lineHeight'

const FONT_SIZE_NAMES = ['Extra small', 'Small', 'Medium', 'Large', 'Extra large']

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 py-4 first:pt-0 dark:border-slate-800">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">{title}</h3>
      {children}
    </section>
  )
}

const stepButton =
  'rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-100'

/** A 1–5 slider with −/+ buttons and labels for both ends, like the reference panel. */
function LevelSlider({
  label,
  valueLabel,
  field,
  value,
  minLabel,
  maxLabel,
}: {
  label: string
  valueLabel: string
  field: LevelKey
  value: number
  minLabel: string
  maxLabel: string
}) {
  const updateDesign = useCvEditor((s) => s.updateDesign)
  const endTyping = useCvEditor((s) => s.endTyping)
  const set = (next: number) =>
    updateDesign({ [field]: Math.min(5, Math.max(1, next)) }, `design:${field}`)

  return (
    <Group title={`${label}: ${valueLabel}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={stepButton}
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= 1}
          onClick={() => {
            set(value - 1)
            endTyping()
          }}
        >
          <Minus className="size-4" />
        </button>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          aria-label={label}
          className="flex-1 accent-teal-600"
          onChange={(e) => set(Number(e.target.value))}
          onPointerUp={endTyping}
          onKeyUp={endTyping}
        />
        <button
          type="button"
          className={stepButton}
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= 5}
          onClick={() => {
            set(value + 1)
            endTyping()
          }}
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="mt-1 flex justify-between px-7 text-xs text-slate-500">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </Group>
  )
}

function ColorPicker({ design, template }: { design: CvDesign; template: TemplateDefinition }) {
  const updateDesign = useCvEditor((s) => s.updateDesign)
  const endTyping = useCvEditor((s) => s.endTyping)
  const [hexText, setHexText] = useState(design.accentColor)
  const custom = !(ACCENT_PRESETS as readonly string[]).includes(design.accentColor.toLowerCase())
  const filled = sidebarFor(template, design.columnLayout).fill === 'solid' || template.headerBand
  const lowContrast = contrastWithWhite(design.accentColor) < (filled ? 4.5 : 3)

  const choose = (color: string) => {
    setHexText(color)
    updateDesign({ accentColor: color }, 'design:accentColor')
  }

  return (
    <Group title="Colors">
      <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2">
        {ACCENT_PRESETS.map((color) => {
          const selected = design.accentColor.toLowerCase() === color
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Color ${color}`}
              onClick={() => {
                choose(color)
                endTyping()
              }}
              className={`flex size-8 items-center justify-center rounded-full ring-offset-2 dark:ring-offset-slate-900 ${
                selected ? 'ring-2 ring-slate-900 dark:ring-white' : ''
              }`}
              style={{ background: color }}
            >
              {selected && <Check className="size-4 text-white" />}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <label
          className={`relative size-8 cursor-pointer overflow-hidden rounded-full ring-offset-2 dark:ring-offset-slate-900 ${
            custom ? 'ring-2 ring-slate-900 dark:ring-white' : 'ring-1 ring-slate-300'
          }`}
          style={{ background: design.accentColor }}
          title="Use custom color"
        >
          <input
            type="color"
            aria-label="Custom color"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={design.accentColor}
            onChange={(e) => choose(e.target.value)}
            onBlur={endTyping}
          />
        </label>
        <input
          aria-label="Custom color hex code"
          className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-sm uppercase dark:border-slate-600 dark:bg-slate-800"
          value={hexText}
          maxLength={7}
          onChange={(e) => {
            const text = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            setHexText(text)
            if (/^#[0-9a-fA-F]{6}$/.test(text)) choose(text.toLowerCase())
          }}
          onBlur={() => {
            setHexText(design.accentColor)
            endTyping()
          }}
        />
        <span className="text-xs text-slate-500">Use custom color</span>
      </div>
      {lowContrast && (
        <p
          role="note"
          className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
        >
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          This color is light: {filled ? 'white text on it' : 'colored text'} may be hard to read. A
          darker shade works better.
        </p>
      )}
    </Group>
  )
}

function FontPicker({ value }: { value: FontFamily }) {
  const updateDesign = useCvEditor((s) => s.updateDesign)
  const [open, setOpen] = useState(false)
  return (
    <Group title="Font style">
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Font: ${value}`}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-lg dark:border-slate-600"
          style={{ fontFamily: FONT_STACKS[value] }}
        >
          {value}
          <ChevronDown className="size-4 text-slate-500" />
        </button>
        {open && (
          <ul
            role="listbox"
            aria-label="Fonts"
            className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {FONT_FAMILIES.map((font) => (
              <li key={font}>
                <button
                  type="button"
                  role="option"
                  aria-selected={font === value}
                  onClick={() => {
                    updateDesign({ fontFamily: font })
                    setOpen(false)
                  }}
                  className={`w-full px-3 py-1.5 text-left text-base hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    font === value ? 'text-teal-700 dark:text-teal-300' : ''
                  }`}
                  style={{ fontFamily: FONT_STACKS[font] }}
                >
                  {font}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">All fonts support Latin and Cyrillic.</p>
    </Group>
  )
}

/** Four small page diagrams: sidebar width and background for each option. */
function ColumnLayoutPicker({
  design,
  template,
}: {
  design: CvDesign
  template: TemplateDefinition
}) {
  const updateDesign = useCvEditor((s) => s.updateDesign)
  if (template.columns === 1) {
    return (
      <Group title="Column layout">
        <p className="text-xs text-slate-500">{template.name} uses a single column.</p>
      </Group>
    )
  }
  return (
    <Group title="Column layout">
      <div role="radiogroup" aria-label="Column layout" className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((option) => {
          const { width, fill } = sidebarFor(template, option)
          const selected = design.columnLayout === option
          const sidebar = (
            <span
              className="h-full rounded-[2px]"
              style={{
                width: `${width * 100}%`,
                background:
                  fill === 'solid'
                    ? design.accentColor
                    : fill === 'tint'
                      ? `${design.accentColor}33`
                      : 'transparent',
                border: fill === 'none' ? `1px solid ${design.accentColor}55` : undefined,
              }}
            />
          )
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Column layout ${option}`}
              onClick={() => updateDesign({ columnLayout: option })}
              className="flex flex-col items-center gap-1 text-xs"
            >
              <span
                className={`flex h-14 w-full gap-1 rounded border bg-white p-1 ${
                  template.sidebarSide === 'left' ? 'flex-row-reverse' : ''
                } ${selected ? 'border-teal-600 ring-2 ring-teal-600' : 'border-slate-300 dark:border-slate-600'}`}
              >
                <span className="flex-1 rounded-[2px] bg-slate-200" />
                {sidebar}
              </span>
              {option}
            </button>
          )
        })}
      </div>
    </Group>
  )
}

function BackgroundPicker({ design }: { design: CvDesign }) {
  const updateDesign = useCvEditor((s) => s.updateDesign)
  return (
    <Group title="Backgrounds">
      <div role="radiogroup" aria-label="Background" className="grid grid-cols-4 gap-2">
        {BACKGROUNDS.map(({ id, label }) => {
          const selected = design.background === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={label}
              onClick={() => updateDesign({ background: id })}
              className={`aspect-square rounded border bg-white ${
                selected
                  ? 'border-teal-600 ring-2 ring-teal-600'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
              style={{ backgroundImage: backgroundImage(id, design.accentColor) }}
            />
          )
        })}
      </div>
    </Group>
  )
}

export function DesignPanel() {
  const cv = useCvEditor((s) => s.cv)
  const updateDesign = useCvEditor((s) => s.updateDesign)
  if (!cv) return null
  const { design } = cv
  const template = getTemplate(design.templateId)

  const resetToTemplateDefaults = () => {
    // Keep the chosen template and page size; reset everything else.
    const defaults: Partial<CvDesign> = { ...DEFAULT_DESIGN, ...template.suggested }
    delete defaults.templateId
    delete defaults.pageSize
    updateDesign(defaults)
  }

  return (
    <>
      <LevelSlider
        label="Page margins"
        valueLabel={String(design.pageMargins)}
        field="pageMargins"
        value={design.pageMargins}
        minLabel="narrow"
        maxLabel="wide"
      />
      <LevelSlider
        label="Section spacing"
        valueLabel={String(design.sectionSpacing)}
        field="sectionSpacing"
        value={design.sectionSpacing}
        minLabel="compact"
        maxLabel="more space"
      />
      <ColorPicker key={design.accentColor} design={design} template={template} />
      <FontPicker value={design.fontFamily} />
      <LevelSlider
        label="Font size"
        valueLabel={FONT_SIZE_NAMES[design.fontSize - 1]!}
        field="fontSize"
        value={design.fontSize}
        minLabel="−A"
        maxLabel="+A"
      />
      <LevelSlider
        label="Line height"
        valueLabel={String(design.lineHeight)}
        field="lineHeight"
        value={design.lineHeight}
        minLabel="condensed"
        maxLabel="spacious"
      />
      <ColumnLayoutPicker design={design} template={template} />
      <BackgroundPicker design={design} />
      <button
        type="button"
        onClick={resetToTemplateDefaults}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <RotateCcw className="size-4" /> Reset to {template.name} defaults
      </button>
    </>
  )
}
