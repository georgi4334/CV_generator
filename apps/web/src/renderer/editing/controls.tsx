import { SKILL_DISPLAYS, type SkillDisplay } from '@cv/shared'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Palette,
  ImageMinus,
  ImagePlus,
  ListPlus,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor } from '@/renderer/context'
import { PHOTO_MAX_SIZE, pickAndUpload } from './image'
import { Popover } from './Popover'

/**
 * The floating toolbar of an entry, a section title or the header. It sits on
 * the top edge of what it belongs to (no gap the pointer could fall through
 * on its way up) and lingers briefly after the pointer leaves, so it can be
 * reached without vanishing.
 */
const toolbar =
  'cv-controls invisible absolute right-2 top-0 z-(--z-raised) flex -translate-y-1/2 items-center gap-0.5 rounded-pill border border-line bg-surface p-1 text-fg-soft opacity-0 shadow-overlay transition-[opacity,visibility] delay-300 duration-150 group-hover/ctl:visible group-hover/ctl:opacity-100 group-hover/ctl:delay-0 group-focus-within/ctl:visible group-focus-within/ctl:opacity-100 group-focus-within/ctl:delay-0 motion-reduce:transition-none'
const outline =
  'group/ctl relative rounded-sm outline-1 outline-offset-2 outline-transparent outline-dashed hover:outline-slate-400/70 focus-within:outline-slate-400/70'
const toolButton =
  'flex size-8 items-center justify-center rounded-full hover:bg-muted hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent'

/** The toolbar's main action: "+ Entry". */
function AddEntryButton({ label, onClick }: { label: string; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="mr-0.5 inline-flex h-8 items-center gap-1 rounded-pill bg-brand pr-3 pl-2 text-sm font-medium text-on-brand hover:bg-brand-hover"
    >
      <Plus className="size-4" aria-hidden />
      {t('renderer.entry')}
    </button>
  )
}

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
      className={toolButton}
    >
      <Icon className="size-4" />
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
  const ref = useRef<HTMLDivElement>(null)
  if (!editor) return <>{children}</>
  return (
    <div ref={ref} className={outline} data-item-id={itemId}>
      <div className={toolbar} role="toolbar" aria-label={t('renderer.entryActions')}>
        <AddEntryButton
          label={t('renderer.addEntryBelow')}
          onClick={() => editor.addItem(sectionId, itemId)}
        />
        <ToolButton
          icon={Pencil}
          label={t('renderer.editEntry')}
          onClick={() => ref.current?.querySelector<HTMLElement>('[contenteditable]')?.focus()}
        />
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
      <div className={toolbar} role="toolbar" aria-label={t('renderer.sectionActions')}>
        <AddEntryButton label={t('renderer.addEntry')} onClick={() => editor.addItem(sectionId)} />
        {skillDisplay && <SkillStyleButton sectionId={sectionId} value={skillDisplay} />}
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
        className={toolButton}
      >
        <Palette className="size-4" />
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
      <div className={toolbar} role="toolbar" aria-label={t('renderer.headerActions')}>
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
