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
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor } from '@/renderer/context'
import { PHOTO_MAX_SIZE, pickAndUpload } from './image'
import { Popover } from './Popover'

/**
 * The floating toolbar of an entry, a section title or the header. It sits
 * just above what it belongs to, joined to it by a transparent strip so the
 * pointer never falls into a gap on its way up, and lingers briefly after the
 * pointer leaves. When hidden, a toolbar only fades (and ignores the pointer),
 * so its buttons stay in the Tab order and show when focused.
 */
const toolbarBase =
  'cv-controls absolute right-2 bottom-full z-(--z-raised) origin-bottom-right pb-1 opacity-0 transition-[opacity,visibility] delay-300 duration-150 group-hover/ctl:opacity-100 group-hover/ctl:delay-0 group-focus-within/ctl:opacity-100 group-focus-within/ctl:delay-0 motion-reduce:transition-none'
const toolbarHidden =
  'pointer-events-none group-hover/ctl:pointer-events-auto group-focus-within/ctl:pointer-events-auto'
const toolbarPill =
  'flex items-center gap-0.5 rounded-pill border border-line bg-surface p-1 text-fg-soft shadow-overlay'
/** Space kept between a toolbar and the page edge, in screen pixels. */
const PAGE_EDGE = 4

/**
 * Keeps a toolbar at its real size whatever the page's scale (zoom, phones)
 * and inside the page, which clips what sticks out: measured each time it is
 * about to show.
 */
function useToolbarPlacement(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const bar = ref.current
    const group = bar?.parentElement
    if (!bar || !group) return
    const place = () => {
      const page = bar.closest<HTMLElement>('[data-cv-page]')
      if (!page?.offsetWidth) return
      const pageRect = page.getBoundingClientRect()
      const scale = pageRect.width / page.offsetWidth
      if (!scale) return
      bar.style.scale = String(1 / scale)
      bar.style.marginRight = '0px'
      bar.style.marginBottom = '0px'
      const rect = bar.getBoundingClientRect()
      let shiftX = 0
      if (rect.left < pageRect.left + PAGE_EDGE) shiftX = pageRect.left + PAGE_EDGE - rect.left
      else if (rect.right > pageRect.right - PAGE_EDGE)
        shiftX = pageRect.right - PAGE_EDGE - rect.right
      const shiftY = Math.max(0, pageRect.top + PAGE_EDGE - rect.top)
      bar.style.marginRight = `${-shiftX / scale}px`
      bar.style.marginBottom = `${-shiftY / scale}px`
    }
    group.addEventListener('pointerenter', place)
    group.addEventListener('focusin', place)
    return () => {
      group.removeEventListener('pointerenter', place)
      group.removeEventListener('focusin', place)
    }
  }, [ref])
}

function Toolbar({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useToolbarPlacement(ref)
  return (
    <div ref={ref} className={`${toolbarBase} ${toolbarHidden}`}>
      <div className={toolbarPill} role="toolbar" aria-label={label}>
        {children}
      </div>
    </div>
  )
}
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
      <Toolbar label={t('renderer.entryActions')}>
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
      </Toolbar>
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
      <Toolbar label={t('renderer.sectionActions')}>
        <AddEntryButton label={t('renderer.addEntry')} onClick={() => editor.addItem(sectionId)} />
        {skillDisplay && <SkillStyleButton sectionId={sectionId} value={skillDisplay} />}
      </Toolbar>
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
      <Toolbar label={t('renderer.headerActions')}>
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
      </Toolbar>
      {children}
    </div>
  )
}
