import { SKILL_DISPLAYS, type SkillDisplay } from '@cv/shared'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Palette,
  ImageMinus,
  ImagePlus,
  ListPlus,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor } from '@/renderer/context'
import { PHOTO_MAX_SIZE, pickAndUpload } from './image'
import { Popover } from './Popover'

const toolbar =
  'cv-controls absolute z-(--z-raised) hidden items-center gap-0.5 rounded-tight border border-line bg-surface p-0.5 text-fg-soft shadow-overlay group-hover/ctl:flex group-focus-within/ctl:flex'
const outline =
  'group/ctl relative rounded-sm outline-1 outline-offset-2 outline-transparent outline-dashed hover:outline-slate-400/70 focus-within:outline-slate-400/70'

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      // Keep focus (and the caret) in the field being edited.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded-tight p-1 hover:bg-muted hover:text-fg disabled:opacity-30"
    >
      <Icon className="size-3.5" />
    </button>
  )
}

interface ItemControlsProps {
  sectionId: string
  itemId: string
  index: number
  count: number
  hasBullets: boolean
  bulletCount: number
  children: ReactNode
}

/** Hover toolbar for one entry: move, add, duplicate, add bullet, delete. */
export function ItemControls({
  sectionId,
  itemId,
  index,
  count,
  hasBullets,
  bulletCount,
  children,
}: ItemControlsProps) {
  const editor = useEditor()
  const { t } = useTranslation()
  if (!editor) return <>{children}</>
  return (
    <div className={outline} data-item-id={itemId}>
      <div
        className={`${toolbar} -top-1 right-0 -translate-y-full`}
        role="toolbar"
        aria-label={t('renderer.entryActions')}
      >
        <ToolButton
          icon={ArrowUp}
          label={t('renderer.moveUp')}
          disabled={index === 0}
          onClick={() => editor.moveItem(sectionId, itemId, -1)}
        />
        <ToolButton
          icon={ArrowDown}
          label={t('renderer.moveDown')}
          disabled={index === count - 1}
          onClick={() => editor.moveItem(sectionId, itemId, 1)}
        />
        {hasBullets && (
          <ToolButton
            icon={ListPlus}
            label={t('renderer.addBullet')}
            onClick={() => editor.addBullet(sectionId, itemId, bulletCount - 1)}
          />
        )}
        <ToolButton
          icon={Plus}
          label={t('renderer.addEntryBelow')}
          onClick={() => editor.addItem(sectionId, itemId)}
        />
        <ToolButton
          icon={Copy}
          label={t('renderer.duplicateEntry')}
          onClick={() => editor.duplicateItem(sectionId, itemId)}
        />
        <ToolButton
          icon={Trash2}
          label={t('renderer.deleteEntry')}
          onClick={() => editor.removeItem(sectionId, itemId)}
        />
      </div>
      {children}
    </div>
  )
}

/** "Add entry" (and, for skills, the style) on the toolbar that appears when hovering a section title. */
export function SectionControls({
  sectionId,
  canAdd,
  skillDisplay,
  children,
}: {
  sectionId: string
  canAdd: boolean
  /** Set for skills sections: offers a choice of how the skills look. */
  skillDisplay?: SkillDisplay
  children: ReactNode
}) {
  const editor = useEditor()
  const { t } = useTranslation()
  if (!editor || !canAdd) return <>{children}</>
  return (
    <div className="group/ctl relative">
      <div
        className={`${toolbar} top-0 right-0`}
        role="toolbar"
        aria-label={t('renderer.sectionActions')}
      >
        {skillDisplay && <SkillStyleButton sectionId={sectionId} value={skillDisplay} />}
        <ToolButton
          icon={Plus}
          label={t('renderer.addEntry')}
          onClick={() => editor.addItem(sectionId)}
        />
      </div>
      {children}
    </div>
  )
}

/** A tiny drawing of each skills style, so the choices are recognisable at a glance. */
function SkillStyleSample({ display }: { display: SkillDisplay }) {
  const line = 'h-1 rounded-pill bg-fg-faint'
  const accent = 'bg-brand-fg'
  switch (display) {
    case 'dots':
      return (
        <span className="flex items-center gap-1.5">
          <span className={`${line} w-6`} />
          <span className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`size-1.5 rounded-pill ${i < 3 ? accent : 'bg-line-strong'}`}
              />
            ))}
          </span>
        </span>
      )
    case 'bar':
      return (
        <span className="flex w-14 flex-col gap-1">
          <span className={`${line} w-8`} />
          <span className="h-1 w-full overflow-hidden rounded-pill bg-line-strong">
            <span className={`block h-full w-3/5 rounded-pill ${accent}`} />
          </span>
        </span>
      )
    case 'pills':
      return (
        <span className="flex gap-1">
          <span className="h-3 w-6 rounded-pill bg-brand-soft ring-1 ring-brand-line" />
          <span className="h-3 w-5 rounded-pill bg-brand-soft ring-1 ring-brand-line" />
        </span>
      )
    case 'bullets':
      return (
        <span className="flex flex-col gap-1">
          {[0, 1].map((i) => (
            <span key={i} className="flex items-center gap-1">
              <span className={`size-1 rounded-pill ${accent}`} />
              <span className={`${line} ${i ? 'w-8' : 'w-10'}`} />
            </span>
          ))}
        </span>
      )
    default:
      return (
        <span className="flex flex-col gap-1">
          <span className={`${line} w-10`} />
          <span className={`${line} w-8`} />
        </span>
      )
  }
}

/** Opens the choice of skills style: plain, dots, bar, pills or bullets. */
function SkillStyleButton({ sectionId, value }: { sectionId: string; value: SkillDisplay }) {
  const editor = useEditor()
  const { t } = useTranslation()
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  if (!editor) return null
  return (
    <>
      <button
        ref={ref}
        type="button"
        title={t('renderer.skillStyle')}
        aria-label={t('renderer.skillStyle')}
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className="rounded-tight p-1 hover:bg-muted hover:text-fg"
      >
        <Palette className="size-3.5" />
      </button>
      {open && (
        <Popover anchor={ref} label={t('renderer.skillStyle')} onClose={() => setOpen(false)}>
          <fieldset className="space-y-1">
            <legend className="mb-2 text-xs font-medium text-fg-muted">
              {t('renderer.skillStyle')}
            </legend>
            {SKILL_DISPLAYS.map((display) => (
              <label
                key={display}
                className="flex cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 hover:bg-glass-hover has-checked:bg-brand-soft has-checked:text-brand-fg-strong has-focus-visible:outline-2 has-focus-visible:outline-brand-line"
              >
                <input
                  type="radio"
                  name={`skill-style-${sectionId}`}
                  value={display}
                  checked={display === value}
                  className="sr-only"
                  onChange={() => {
                    editor.updateSection(sectionId, { levelDisplay: display })
                    setOpen(false)
                  }}
                />
                <span className="flex w-16 shrink-0 justify-center" aria-hidden>
                  <SkillStyleSample display={display} />
                </span>
                <span className="flex-1">{t(`renderer.skillStyles.${display}`)}</span>
              </label>
            ))}
          </fieldset>
        </Popover>
      )}
    </>
  )
}

/** Hover toolbar on the header: add, change or remove the photo. */
export function HeaderControls({ hasPhoto, children }: { hasPhoto: boolean; children: ReactNode }) {
  const editor = useEditor()
  const { t } = useTranslation()
  if (!editor) return <>{children}</>
  const upload = () =>
    pickAndUpload(PHOTO_MAX_SIZE, editor.uploadImage).then(
      (url) => url && editor.updateHeader({ photoUrl: url, showPhoto: true }),
      (e: Error) => editor.notify(t('renderer.photoFailed', { message: e.message })),
    )
  return (
    <div className={outline}>
      <div
        className={`${toolbar} -top-1 right-0 -translate-y-full`}
        role="toolbar"
        aria-label={t('renderer.headerActions')}
      >
        <ToolButton
          icon={ImagePlus}
          label={hasPhoto ? t('renderer.changePhoto') : t('renderer.addPhoto')}
          onClick={upload}
        />
        {hasPhoto && (
          <ToolButton
            icon={ImageMinus}
            label={t('renderer.removePhoto')}
            onClick={() => editor.updateHeader({ photoUrl: null, showPhoto: false })}
          />
        )}
      </div>
      {children}
    </div>
  )
}
