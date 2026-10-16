import {
  ACCENT_PRESETS,
  DEFAULT_DESIGN,
  FONT_FAMILIES,
  type CvDesign,
  type FontFamily,
} from '@cv/shared'
import { Check, ChevronDown, Minus, Plus, RotateCcw, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getTemplate } from '@/renderer'
import { BACKGROUNDS, backgroundImage } from '@/renderer/templates/backgrounds'
import { FONT_STACKS } from '@/renderer/templates/fonts'
import { sidebarFor, type TemplateDefinition } from '@/renderer/templates/templates'
import { contrastWithWhite } from '@/features/cv-editor/lib/contrast'
import { useDesignTarget } from '@/features/cv-editor/state/designTarget'

const FONT_SIZE_KEYS = ['xs', 's', 'm', 'l', 'xl'] as const

type LevelKey = 'pageMargins' | 'sectionSpacing' | 'fontSize' | 'lineHeight'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-4 first:pt-0">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-fg-muted uppercase">{title}</h3>
      {children}
    </section>
  )
}

const stepButton =
  'rounded-tight p-1 text-fg-muted hover:bg-muted hover:text-fg disabled:opacity-30'

/** A 1–5 slider with −/+ buttons and labels for both ends, like the reference panel. */
function LevelSlider({
  valueLabel,
  field,
  value,
}: {
  valueLabel: string
  field: LevelKey
  value: number
}) {
  const { t } = useTranslation()
  const label = t(`design.${field}.label`)
  const { updateDesign, endTyping } = useDesignTarget()
  const set = (next: number) =>
    updateDesign({ [field]: Math.min(5, Math.max(1, next)) }, `design:${field}`)

  return (
    <Group title={`${label}: ${valueLabel}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={stepButton}
          aria-label={t(`design.${field}.decrease`)}
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
          className="flex-1 accent-brand-line"
          onChange={(e) => set(Number(e.target.value))}
          onPointerUp={endTyping}
          onKeyUp={endTyping}
        />
        <button
          type="button"
          className={stepButton}
          aria-label={t(`design.${field}.increase`)}
          disabled={value >= 5}
          onClick={() => {
            set(value + 1)
            endTyping()
          }}
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="mt-1 flex justify-between px-7 text-xs text-fg-muted">
        <span>{t(`design.${field}.min`)}</span>
        <span>{t(`design.${field}.max`)}</span>
      </div>
    </Group>
  )
}

function ColorPicker({ design, template }: { design: CvDesign; template: TemplateDefinition }) {
  const { t } = useTranslation()
  const { updateDesign, endTyping } = useDesignTarget()
  const [hexText, setHexText] = useState(design.accentColor)
  const custom = !(ACCENT_PRESETS as readonly string[]).includes(design.accentColor.toLowerCase())
  const filled = sidebarFor(template, design.columnLayout).fill === 'solid' || template.headerBand
  const lowContrast = contrastWithWhite(design.accentColor) < (filled ? 4.5 : 3)

  const choose = (color: string) => {
    setHexText(color)
    updateDesign({ accentColor: color }, 'design:accentColor')
  }

  return (
    <Group title={t('design.colors.title')}>
      <div
        role="radiogroup"
        aria-label={t('design.colors.accent')}
        className="flex flex-wrap gap-2"
      >
        {ACCENT_PRESETS.map((color) => {
          const selected = design.accentColor.toLowerCase() === color
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={t('design.colors.preset', { color })}
              onClick={() => {
                choose(color)
                endTyping()
              }}
              className={`flex size-8 items-center justify-center rounded-pill ring-offset-2 dark:ring-offset-slate-900 ${
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
          className={`relative size-8 cursor-pointer overflow-hidden rounded-pill ring-offset-2 dark:ring-offset-slate-900 ${
            custom ? 'ring-2 ring-slate-900 ' : 'ring-1 ring-line-strong'
          }`}
          style={{ background: design.accentColor }}
          title={t('design.colors.useCustom')}
        >
          <input
            type="color"
            aria-label={t('design.colors.custom')}
            className="absolute inset-0 cursor-pointer opacity-0"
            value={design.accentColor}
            onChange={(e) => choose(e.target.value)}
            onBlur={endTyping}
          />
        </label>
        <input
          aria-label={t('design.colors.hex')}
          className="w-24 rounded-tight border border-line-strong bg-surface px-2 py-1 font-mono text-sm uppercase"
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
        <span className="text-xs text-fg-muted">{t('design.colors.useCustom')}</span>
      </div>
      {lowContrast && (
        <p role="note" className="mt-2 flex items-start gap-1.5 text-xs text-warning-fg">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {filled ? t('design.colors.lowContrastFilled') : t('design.colors.lowContrastText')}
        </p>
      )}
    </Group>
  )
}

function FontPicker({ value }: { value: FontFamily }) {
  const { t } = useTranslation()
  const { updateDesign } = useDesignTarget()
  const [open, setOpen] = useState(false)
  return (
    <Group title={t('design.font.title')}>
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('design.font.current', { font: value })}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-control border border-line-strong px-3 py-2 text-lg"
          style={{ fontFamily: FONT_STACKS[value] }}
        >
          {value}
          <ChevronDown className="size-4 text-fg-muted" />
        </button>
        {open && (
          <ul
            role="listbox"
            aria-label={t('design.font.list')}
            className="absolute z-(--z-dropdown) mt-1 max-h-72 w-full overflow-auto rounded-control border border-line bg-surface py-1 shadow-overlay"
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
                  className={`w-full px-3 py-1.5 text-left text-base hover:bg-muted ${
                    font === value ? 'text-brand-fg ' : ''
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
      <p className="mt-1.5 text-xs text-fg-muted">{t('design.font.note')}</p>
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
  const { t } = useTranslation()
  const { updateDesign } = useDesignTarget()
  if (template.columns === 1) {
    return (
      <Group title={t('design.columns.title')}>
        <p className="text-xs text-fg-muted">
          {t('design.columns.single', { template: t(`labels.template.${template.id}`) })}
        </p>
      </Group>
    )
  }
  return (
    <Group title={t('design.columns.title')}>
      <div
        role="radiogroup"
        aria-label={t('design.columns.title')}
        className="grid grid-cols-4 gap-2"
      >
        {[1, 2, 3, 4].map((option) => {
          const { width, fill } = sidebarFor(template, option)
          const selected = design.columnLayout === option
          const sidebar = (
            <span
              className="h-full rounded-xs"
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
              aria-label={t('design.columns.option', { n: option })}
              onClick={() => updateDesign({ columnLayout: option })}
              className="flex flex-col items-center gap-1 text-xs"
            >
              <span
                className={`flex h-14 w-full gap-1 rounded-tight border bg-surface p-1 ${
                  template.sidebarSide === 'left' ? 'flex-row-reverse' : ''
                } ${selected ? 'border-brand-line ring-2 ring-brand-line' : 'border-line-strong '}`}
              >
                <span className="flex-1 rounded-xs bg-muted-strong" />
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
  const { t } = useTranslation()
  const { updateDesign } = useDesignTarget()
  return (
    <Group title={t('design.backgrounds.title')}>
      <div
        role="radiogroup"
        aria-label={t('design.backgrounds.label')}
        className="grid grid-cols-4 gap-2"
      >
        {BACKGROUNDS.map(({ id }) => {
          const selected = design.background === id
          const label = t(`design.backgrounds.names.${id}`)
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={label}
              onClick={() => updateDesign({ background: id })}
              className={`aspect-square rounded-tight border bg-surface ${
                selected ? 'border-brand-line ring-2 ring-brand-line' : 'border-line-strong '
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
  const { t } = useTranslation()
  const { kind, design, updateDesign } = useDesignTarget()
  if (!design) return null
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
        valueLabel={String(design.pageMargins)}
        field="pageMargins"
        value={design.pageMargins}
      />
      <LevelSlider
        valueLabel={String(design.sectionSpacing)}
        field="sectionSpacing"
        value={design.sectionSpacing}
      />
      <ColorPicker key={design.accentColor} design={design} template={template} />
      <FontPicker value={design.fontFamily} />
      <LevelSlider
        valueLabel={t(`design.fontSize.names.${FONT_SIZE_KEYS[design.fontSize - 1]!}`)}
        field="fontSize"
        value={design.fontSize}
      />
      <LevelSlider
        valueLabel={String(design.lineHeight)}
        field="lineHeight"
        value={design.lineHeight}
      />
      {/* A letter is one column; its look comes from the template's header. */}
      {kind === 'cv' && <ColumnLayoutPicker design={design} template={template} />}
      <BackgroundPicker design={design} />
      <button
        type="button"
        onClick={resetToTemplateDefaults}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-control border border-line-strong py-2 text-sm text-fg-soft hover:bg-muted "
      >
        <RotateCcw className="size-4" />{' '}
        {t('design.reset', { template: t(`labels.template.${template.id}`) })}
      </button>
    </>
  )
}
