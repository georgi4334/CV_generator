import type { CvHeader } from '@cv/shared'
import { AtSign, Link2, MapPin, Phone, type LucideIcon } from 'lucide-react'
import { useRender } from './context'
import { Field } from './primitives'
import { PLACEHOLDERS as P } from './placeholders'

const CONTACTS: Array<{ key: 'phone' | 'email' | 'link' | 'location'; icon: LucideIcon }> = [
  { key: 'phone', icon: Phone },
  { key: 'email', icon: AtSign },
  { key: 'link', icon: Link2 },
  { key: 'location', icon: MapPin },
]

function Contacts({ header, layout }: { header: CvHeader; layout: 'row' | 'column' | 'centered' }) {
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

function Photo({ header }: { header: CvHeader }) {
  if (!header.showPhoto || !header.photoUrl) return null
  return (
    <img src={header.photoUrl} alt="" className="size-[5.5em] shrink-0 rounded-full object-cover" />
  )
}

export function PolishedHeader({ header }: { header: CvHeader }) {
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
  return (
    <div className="text-center">
      <Field
        value={header.name}
        path="header.name"
        placeholder={P.name}
        className="block text-[2.1em] leading-tight font-semibold"
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
