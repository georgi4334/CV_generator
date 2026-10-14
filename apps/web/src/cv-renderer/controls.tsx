import {
  ArrowDown,
  ArrowUp,
  Copy,
  ImageMinus,
  ImagePlus,
  ListPlus,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEditor } from './context'
import { pickAndUpload } from './image'

const toolbar =
  'cv-controls absolute z-10 hidden items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 text-slate-600 shadow-md group-hover/ctl:flex group-focus-within/ctl:flex'
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
      className="rounded p-1 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
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
  if (!editor) return <>{children}</>
  return (
    <div className={outline} data-item-id={itemId}>
      <div
        className={`${toolbar} -top-1 right-0 -translate-y-full`}
        role="toolbar"
        aria-label="Entry actions"
      >
        <ToolButton
          icon={ArrowUp}
          label="Move up"
          disabled={index === 0}
          onClick={() => editor.moveItem(sectionId, itemId, -1)}
        />
        <ToolButton
          icon={ArrowDown}
          label="Move down"
          disabled={index === count - 1}
          onClick={() => editor.moveItem(sectionId, itemId, 1)}
        />
        {hasBullets && (
          <ToolButton
            icon={ListPlus}
            label="Add bullet point"
            onClick={() => editor.addBullet(sectionId, itemId, bulletCount - 1)}
          />
        )}
        <ToolButton
          icon={Plus}
          label="Add entry below"
          onClick={() => editor.addItem(sectionId, itemId)}
        />
        <ToolButton
          icon={Copy}
          label="Duplicate entry"
          onClick={() => editor.duplicateItem(sectionId, itemId)}
        />
        <ToolButton
          icon={Trash2}
          label="Delete entry"
          onClick={() => editor.removeItem(sectionId, itemId)}
        />
      </div>
      {children}
    </div>
  )
}

/** "Add entry" button that appears when hovering a section title. */
export function SectionControls({
  sectionId,
  canAdd,
  children,
}: {
  sectionId: string
  canAdd: boolean
  children: ReactNode
}) {
  const editor = useEditor()
  if (!editor || !canAdd) return <>{children}</>
  return (
    <div className="group/ctl relative">
      <div className={`${toolbar} top-0 right-0`} role="toolbar" aria-label="Section actions">
        <ToolButton icon={Plus} label="Add entry" onClick={() => editor.addItem(sectionId)} />
      </div>
      {children}
    </div>
  )
}

/** Hover toolbar on the header: add, change or remove the photo. */
export function HeaderControls({
  supportsPhoto,
  hasPhoto,
  children,
}: {
  supportsPhoto: boolean
  hasPhoto: boolean
  children: ReactNode
}) {
  const editor = useEditor()
  if (!editor || !supportsPhoto) return <>{children}</>
  const upload = () =>
    pickAndUpload(320, editor.uploadImage).then(
      (url) => url && editor.updateHeader({ photoUrl: url, showPhoto: true }),
      (e: Error) => editor.notify(`Photo not uploaded: ${e.message}`),
    )
  return (
    <div className={outline}>
      <div
        className={`${toolbar} -top-1 right-0 -translate-y-full`}
        role="toolbar"
        aria-label="Header actions"
      >
        <ToolButton
          icon={ImagePlus}
          label={hasPhoto ? 'Change photo' : 'Add photo'}
          onClick={upload}
        />
        {hasPhoto && (
          <ToolButton
            icon={ImageMinus}
            label="Remove photo"
            onClick={() => editor.updateHeader({ photoUrl: null, showPhoto: false })}
          />
        )}
      </div>
      {children}
    </div>
  )
}
