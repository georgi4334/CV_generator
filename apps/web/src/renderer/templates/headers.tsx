import type { CvHeader } from '@cv/shared'
import type { ReactNode } from 'react'
import { AtSign, Link2, MapPin, Phone, type LucideIcon } from 'lucide-react'
import { assetUrl } from '@/shared/api/client'
import { useRender } from '@/renderer/context'
import { Field } from '@/renderer/editing/primitives'
import { usePlaceholders } from '@/renderer/placeholders'
import { PHOTO_SHAPE_CLASS } from './photo'

const CONTACTS: Array<{ key: 'phone' | 'email' | 'link' | 'location'; icon: LucideIcon }> = [
  { key: 'phone', icon: Phone },
  { key: 'email', icon: AtSign },
  { key: 'link', icon: Link2 },
  { key: 'location', icon: MapPin },
]

function Contacts({ header, layout }: { header: CvHeader; layout: 'row' | 'column' | 'centered' }) {
  const P = usePlaceholders()
  const { mode } = useRender()
  const shown = CONTACTS.filter(({ key }) => mode === 'edit' || header[key].trim())
  const layoutClass =
    layout === 'column'
      ? 'flex flex-col items-end gap-[0.2em]'
      : `flex flex-wrap gap-x-[1em] gap-y-[0.2em] ${layout === 'centered' ? 'justify-center' : ''}`
  return (
    <div className={`${layoutClass} text-[0.85em]`} style={{ color: 'var(--cv-muted)' }}>
      {shown.map(({ key, icon: Icon }) => (
        <span key={key} className="inline-flex items-center gap-[0.3em]">
          <Icon className="size-[1em] shrink-0" />
          <Field value={header[key]} path={`header.${key}`} placeholder={P[key]} />
        </span>
      ))}
    </div>
  )
}

/** The photo in its chosen shape; `className` sets its size (5.5em by default). */
export function PhotoImage({
  header,
  className = 'size-[5.5em]',
}: {
  header: CvHeader
  className?: string
}) {
  if (!header.photoUrl) return null
  return (
    <img
      src={assetUrl(header.photoUrl)}
      alt=""
      className={`shrink-0 object-cover ${className} ${PHOTO_SHAPE_CLASS[header.photoShape] ?? PHOTO_SHAPE_CLASS.circle}`}
    />
  )
}

function Photo({ header }: { header: CvHeader }) {
  if (!header.showPhoto) return null
  return <PhotoImage header={header} />
}

/** The header with the photo beside it, when the photo goes in a top corner. */
export function WithCornerPhoto({
  photo,
  corner,
  children,
}: {
  photo: CvHeader
  corner: 'left' | 'right' | null
  children: ReactNode
}) {
  if (!corner) return <>{children}</>
  return (
    <div
      className={`flex items-center gap-[1.2em] ${corner === 'right' ? 'flex-row-reverse' : ''}`}
    >
      <PhotoImage header={photo} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function PolishedHeader({ header }: { header: CvHeader }) {
  const P = usePlaceholders()
  return (
    <div className="flex items-center gap-[1.2em]">
      <Photo header={header} />
      <div className="min-w-0">
        <Field
          value={header.name}
          path="header.name"
          placeholder={P.name}
          className="block text-[2.2em] leading-tight font-semibold uppercase"
          style={{ color: 'var(--cv-strong)' }}
        />
        <Field
          value={header.headline}
          path="header.headline"
          placeholder={P.headline}
          className="mt-[0.15em] block text-[1.25em]"
          style={{ color: 'var(--cv-accent-text)' }}
        />
        <div className="mt-[0.5em]">
          <Contacts header={header} layout="row" />
        </div>
      </div>
    </div>
  )
}

export function SingleColumnHeader({ header }: { header: CvHeader }) {
  const P = usePlaceholders()
  return (
    <div className="flex flex-col items-center text-center">
      <Photo header={header} />
      <Field
        value={header.name}
        path="header.name"
        placeholder={P.name}
        className={`block text-[2.1em] leading-tight font-semibold ${
          header.showPhoto && header.photoUrl ? 'mt-[0.3em]' : ''
        }`}
        style={{ color: 'var(--cv-strong)' }}
      />
      <Field
        value={header.headline}
        path="header.headline"
        placeholder={P.headline}
        className="mt-[0.15em] block text-[1.2em]"
        style={{ color: 'var(--cv-accent-text)' }}
      />
      <div className="mt-[0.6em]">
        <Contacts header={header} layout="centered" />
      </div>
    </div>
  )
}

export function CompactHeader({ header }: { header: CvHeader }) {
  const P = usePlaceholders()
  return (
    <div
      className="flex items-end justify-between gap-[1.5em] border-b-2 pb-[0.8em]"
      style={{ borderColor: 'var(--cv-accent)' }}
    >
      <div className="min-w-0">
        <Field
          value={header.name}
          path="header.name"
          placeholder={P.name}
          className="block text-[1.9em] leading-tight font-bold"
          style={{ color: 'var(--cv-strong)' }}
        />
        <Field
          value={header.headline}
          path="header.headline"
          placeholder={P.headline}
          className="block text-[1.1em]"
          style={{ color: 'var(--cv-accent-text)' }}
        />
      </div>
      <div className="flex items-end gap-[1em]">
        <Contacts header={header} layout="column" />
        <Photo header={header} />
      </div>
    </div>
  )
}

/** Name and contacts on a colored band across the page (Contemporary). */
export function ContemporaryHeader({ header }: { header: CvHeader }) {
  const P = usePlaceholders()
  return (
    <div className="flex items-center justify-between gap-[1.5em]">
      <div className="min-w-0">
        <Field
          value={header.name}
          path="header.name"
          placeholder={P.name}
          className="block text-[2.3em] leading-tight font-bold"
          style={{ color: 'var(--cv-strong)' }}
        />
        <Field
          value={header.headline}
          path="header.headline"
          placeholder={P.headline}
          className="mt-[0.1em] block text-[1.15em]"
          style={{ color: 'var(--cv-muted-strong)' }}
        />
        <div className="mt-[0.6em]">
          <Contacts header={header} layout="row" />
        </div>
      </div>
      <Photo header={header} />
    </div>
  )
}

/** Large accent-colored name with a spaced-out headline (Creative). */
export function CreativeHeader({ header }: { header: CvHeader }) {
  const P = usePlaceholders()
  return (
    <div className="flex items-center gap-[1.2em]">
      <Photo header={header} />
      <div className="min-w-0">
        <Field
          value={header.name}
          path="header.name"
          placeholder={P.name}
          className="block text-[2.5em] leading-none font-extrabold"
          style={{ color: 'var(--cv-accent-text)' }}
        />
        <Field
          value={header.headline}
          path="header.headline"
          placeholder={P.headline}
          className="mt-[0.4em] block text-[0.95em] font-medium tracking-[0.18em] uppercase"
          style={{ color: 'var(--cv-strong)' }}
        />
        <div className="mt-[0.6em]">
          <Contacts header={header} layout="row" />
        </div>
      </div>
    </div>
  )
}

/** Centered, photo on top, name between thin accent rules (Stylish). */
export function StylishHeader({ header }: { header: CvHeader }) {
  const P = usePlaceholders()
  return (
    <div className="flex flex-col items-center text-center">
      <Photo header={header} />
      <div
        className="mt-[0.6em] w-full border-y py-[0.35em]"
        style={{ borderColor: 'var(--cv-accent)' }}
      >
        <Field
          value={header.name}
          path="header.name"
          placeholder={P.name}
          className="block text-[2em] leading-tight font-light tracking-[0.12em] uppercase"
          style={{ color: 'var(--cv-strong)' }}
        />
      </div>
      <Field
        value={header.headline}
        path="header.headline"
        placeholder={P.headline}
        className="mt-[0.4em] block text-[1em] tracking-[0.2em] uppercase"
        style={{ color: 'var(--cv-accent-text)' }}
      />
      <div className="mt-[0.5em] w-full">
        <Contacts header={header} layout="centered" />
      </div>
    </div>
  )
}
