import {
  formatCertificateDates,
  formatDateRange,
  formatYearMonth,
  LANGUAGE_LEVEL_LABELS,
  type AchievementItem,
  type CertificateItem,
  type CourseItem,
  type CustomItem,
  type EducationItem,
  type ExperienceItem,
  type LanguageItem,
  type ProjectItem,
  type SectionOf,
  type SkillDisplay,
  type SkillItem,
} from '@cv/shared'
import { Building2, Link2, Star, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditor, useRender } from '@/renderer/context'
import { assetUrl } from '@/shared/api/client'
import { itemPath } from '@/renderer/editing/editorApi'
import { ACHIEVEMENT_ICONS } from '@/renderer/icons'
import { pickAndUpload } from '@/renderer/editing/image'
import { usePlaceholders } from '@/renderer/placeholders'
import {
  Bullets,
  CertificateDatesField,
  DateRangeField,
  Field,
  LevelIndicator,
  PopoverTrigger,
  SingleDateField,
  SplitRow,
} from '@/renderer/editing/primitives'

const accent = { color: 'var(--cv-accent-text)' }
const muted = { color: 'var(--cv-muted)' }
const mutedStrong = { color: 'var(--cv-muted-strong)' }
/**
 * Skill pills: a soft tint and hairline of the accent text colour, so they show
 * on white pages (accent tint) and on coloured sidebars (white tint) alike.
 */
const pill = {
  background: 'color-mix(in srgb, var(--cv-accent-text) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--cv-accent-text) 30%, transparent)',
  color: 'var(--cv-accent-text)',
}

/** Ids and path of the item being rendered, used for editing. */
interface ItemRef {
  sectionId: string
  itemId: string
}

const pathOf = (ref: ItemRef, field: string) => `${itemPath(ref.sectionId, ref.itemId)}.${field}`

function useUpdate(ref: ItemRef) {
  const editor = useEditor()
  return (patch: Record<string, unknown>) => editor?.updateItem(ref.sectionId, ref.itemId, patch)
}

function CompanyLogo({ item, refs }: { item: ExperienceItem; refs: ItemRef }) {
  const { mode } = useRender()
  const editor = useEditor()
  const update = useUpdate(refs)
  const { t } = useTranslation()
  const size = 'size-[2.6em] shrink-0 rounded-full'

  const image = item.logoUrl ? (
    <img src={assetUrl(item.logoUrl)} alt="" className={`${size} object-cover`} />
  ) : mode === 'edit' ? (
    <span
      className={`${size} flex items-center justify-center`}
      style={{ background: 'var(--cv-rule)', color: 'var(--cv-muted)' }}
    >
      <Building2 className="size-[1.3em]" />
    </span>
  ) : null

  if (!editor || !image) return image
  return (
    <span className="group/logo relative shrink-0 self-start">
      <button
        type="button"
        title={item.logoUrl ? t('renderer.changeLogo') : t('renderer.uploadLogo')}
        aria-label={item.logoUrl ? t('renderer.changeLogo') : t('renderer.uploadLogo')}
        className="block cursor-pointer rounded-full border-0 bg-transparent p-0"
        onClick={() =>
          pickAndUpload(160, editor.uploadImage).then(
            (url) => url && update({ logoUrl: url }),
            (e: Error) => editor.notify(t('renderer.logoFailed', { message: e.message })),
          )
        }
      >
        {image}
      </button>
      {item.logoUrl && (
        <button
          type="button"
          aria-label={t('renderer.removeLogo')}
          className="absolute -top-1 -right-1 hidden size-4 items-center justify-center rounded-full bg-slate-800 text-white group-hover/logo:flex"
          onClick={() => update({ logoUrl: null })}
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}

export function ExperienceView({
  item,
  showLogo,
  refs,
}: {
  item: ExperienceItem
  showLogo: boolean
  refs: ItemRef
}) {
  const P = usePlaceholders()
  const { language } = useRender()
  const update = useUpdate(refs)
  return (
    <div className="flex gap-[0.8em]">
      {showLogo && <CompanyLogo item={item} refs={refs} />}
      <div className="min-w-0 flex-1">
        <SplitRow
          left={
            <Field
              value={item.title}
              path={pathOf(refs, 'title')}
              placeholder={P.experienceTitle}
              className="text-[1.05em] font-medium"
            />
          }
          right={
            <DateRangeField
              text={formatDateRange(item, language)}
              placeholder={P.datePeriod}
              value={item}
              onChange={update}
            />
          }
        />
        <SplitRow
          left={
            <Field
              value={item.company}
              path={pathOf(refs, 'company')}
              placeholder={P.company}
              style={accent}
            />
          }
          right={
            <Field value={item.location} path={pathOf(refs, 'location')} placeholder={P.location} />
          }
        />
        <Bullets
          bullets={item.bullets}
          placeholder={P.bullet}
          itemPath={itemPath(refs.sectionId, refs.itemId)}
          {...refs}
        />
      </div>
    </div>
  )
}

export function EducationView({ item, refs }: { item: EducationItem; refs: ItemRef }) {
  const P = usePlaceholders()
  const { language } = useRender()
  const update = useUpdate(refs)
  return (
    <div>
      <Field
        value={item.degree}
        path={pathOf(refs, 'degree')}
        placeholder={P.degree}
        className="block text-[1.05em] font-semibold"
        style={accent}
      />
      <Field
        value={item.institution}
        path={pathOf(refs, 'institution')}
        placeholder={P.institution}
        className="block"
      />
      <SplitRow
        left={
          <span className="text-[0.85em]" style={muted}>
            <DateRangeField
              text={formatDateRange(item, language)}
              placeholder={P.datePeriod}
              value={item}
              onChange={update}
            />
          </span>
        }
        right={
          <Field value={item.location} path={pathOf(refs, 'location')} placeholder={P.location} />
        }
      />
      <Bullets
        bullets={item.bullets}
        placeholder={P.bullet}
        itemPath={itemPath(refs.sectionId, refs.itemId)}
        {...refs}
      />
    </div>
  )
}

function AchievementIcon({ item, refs }: { item: AchievementItem; refs: ItemRef }) {
  const editor = useEditor()
  const update = useUpdate(refs)
  const { t } = useTranslation()
  const Icon = ACHIEVEMENT_ICONS[item.icon] ?? Star
  const icon = <Icon className="mt-[0.2em] size-[1.05em] shrink-0" style={accent} />
  if (!editor) return icon
  return (
    <PopoverTrigger
      label={t('renderer.chooseIcon')}
      display={icon}
      className="flex shrink-0 self-start"
    >
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(ACHIEVEMENT_ICONS).map(([key, Choice]) => (
          <button
            key={key}
            type="button"
            aria-label={key}
            aria-pressed={key === item.icon}
            className={`flex items-center justify-center rounded-md p-2 hover:bg-muted ${
              key === item.icon ? 'ring-2 ring-brand-line' : ''
            }`}
            onClick={() => update({ icon: key })}
          >
            <Choice className="size-5" />
          </button>
        ))}
      </div>
    </PopoverTrigger>
  )
}

export function AchievementView({ item, refs }: { item: AchievementItem; refs: ItemRef }) {
  const P = usePlaceholders()
  return (
    <div className="flex gap-[0.6em]">
      <AchievementIcon item={item} refs={refs} />
      <div className="min-w-0 flex-1">
        <Field
          value={item.title}
          path={pathOf(refs, 'title')}
          placeholder={P.achievementTitle}
          className="block text-[1.05em]"
          style={accent}
        />
        <Field
          value={item.description}
          path={pathOf(refs, 'description')}
          placeholder={P.achievementDescription}
          className="block text-[0.9em]"
          style={muted}
        />
      </div>
    </div>
  )
}

export function CourseView({ item, refs }: { item: CourseItem; refs: ItemRef }) {
  const P = usePlaceholders()
  const { language } = useRender()
  const update = useUpdate(refs)
  return (
    <div>
      <SplitRow
        left={
          <Field
            value={item.title}
            path={pathOf(refs, 'title')}
            placeholder={P.courseTitle}
            className="text-[1.05em]"
            style={accent}
          />
        }
        right={
          <SingleDateField
            text={formatYearMonth(item.date, language)}
            placeholder={P.date}
            value={item.date}
            onChange={(date) => update({ date })}
          />
        }
      />
      <Field
        value={item.institution}
        path={pathOf(refs, 'institution')}
        placeholder={P.courseInstitution}
        className="block text-[0.9em]"
        style={muted}
      />
    </div>
  )
}

export function ProjectView({ item, refs }: { item: ProjectItem; refs: ItemRef }) {
  const P = usePlaceholders()
  const { language } = useRender()
  const update = useUpdate(refs)
  return (
    <div>
      <SplitRow
        left={
          <Field
            value={item.name}
            path={pathOf(refs, 'name')}
            placeholder={P.projectName}
            className="text-[1.05em] font-medium"
          />
        }
        right={
          <DateRangeField
            text={formatDateRange(item, language)}
            placeholder={P.datePeriod}
            value={item}
            onChange={update}
          />
        }
      />
      <div className="flex flex-wrap gap-x-[0.5em] text-[0.9em]">
        <Field
          value={item.role}
          path={pathOf(refs, 'role')}
          placeholder={P.projectRole}
          style={accent}
        />
        <Field
          value={item.link}
          path={pathOf(refs, 'link')}
          placeholder={P.linkUrl}
          style={muted}
        />
      </div>
      <Field
        value={item.description}
        path={pathOf(refs, 'description')}
        placeholder={P.projectDescription}
        className="mt-[0.2em] block text-[0.92em]"
        style={mutedStrong}
        multiline
      />
      <Bullets
        bullets={item.bullets}
        placeholder={P.bullet}
        itemPath={itemPath(refs.sectionId, refs.itemId)}
        {...refs}
      />
    </div>
  )
}

/** "https://www.example.com/x/" → "example.com/x", for showing a link on the page. */
const displayLink = (link: string) =>
  link
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')

/** Links without a scheme ("example.com/x") open over https. */
const linkHref = (link: string) =>
  /^https?:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`

/**
 * A certificate's verification link: a link icon and the address. In the
 * editor it is typed in place; on the finished page (preview, shared link,
 * PDF) it is a real link, shown without "https://".
 */
function CredentialLink({ link, refs }: { link: string; refs: ItemRef }) {
  const P = usePlaceholders()
  const editor = useEditor()
  const { mode, staticLinks } = useRender()
  const row = 'mt-[0.15em] flex min-w-0 items-center gap-[0.35em] text-[0.85em]'
  const icon = <Link2 className="size-[1em] shrink-0" aria-hidden />

  if (editor || (!link.trim() && mode === 'edit')) {
    return (
      <span className={row} style={muted}>
        {icon}
        <Field value={link} path={pathOf(refs, 'link')} placeholder={P.credentialLink} />
      </span>
    )
  }
  if (!link.trim()) return null
  if (staticLinks)
    return (
      <span className={row} style={accent}>
        {icon}
        <span className="truncate">{displayLink(link)}</span>
      </span>
    )
  return (
    <a
      href={linkHref(link)}
      target="_blank"
      rel="noreferrer"
      className={`${row} no-underline hover:underline`}
      style={accent}
    >
      {icon}
      <span className="truncate">{displayLink(link)}</span>
    </a>
  )
}

export function CertificateView({ item, refs }: { item: CertificateItem; refs: ItemRef }) {
  const P = usePlaceholders()
  const { language } = useRender()
  const update = useUpdate(refs)
  const dates = { date: item.date, expiryDate: item.expiryDate ?? null }
  return (
    <div>
      <Field
        value={item.name}
        path={pathOf(refs, 'name')}
        placeholder={P.certificate}
        className="block text-[1.05em]"
        style={accent}
      />
      <div className="flex flex-wrap gap-x-[0.5em] text-[0.9em]" style={muted}>
        <Field value={item.issuer} path={pathOf(refs, 'issuer')} placeholder={P.issuer} />
        <CertificateDatesField
          text={formatCertificateDates(dates, language)}
          placeholder={P.certificateDates}
          value={dates}
          onChange={update}
        />
      </div>
      <CredentialLink link={item.link} refs={refs} />
    </div>
  )
}

export function CustomView({ item, refs }: { item: CustomItem; refs: ItemRef }) {
  const P = usePlaceholders()
  return (
    <div>
      <SplitRow
        left={
          <Field
            value={item.title}
            path={pathOf(refs, 'title')}
            placeholder={P.customTitle}
            className="text-[1.05em] font-medium"
          />
        }
        right={<Field value={item.date} path={pathOf(refs, 'date')} placeholder={P.date} />}
      />
      <Field
        value={item.subtitle}
        path={pathOf(refs, 'subtitle')}
        placeholder={P.customSubtitle}
        className="block"
        style={accent}
      />
      <Field
        value={item.description}
        path={pathOf(refs, 'description')}
        placeholder={P.customDescription}
        className="mt-[0.2em] block text-[0.92em]"
        style={mutedStrong}
        multiline
      />
      <Bullets
        bullets={item.bullets}
        placeholder={P.bullet}
        itemPath={itemPath(refs.sectionId, refs.itemId)}
        {...refs}
      />
    </div>
  )
}

type LanguagesDisplay = SectionOf<'languages'>['levelDisplay']

export function LanguageView({
  item,
  display,
  refs,
}: {
  item: LanguageItem
  display: LanguagesDisplay
  refs: ItemRef
}) {
  const P = usePlaceholders()
  const { language } = useRender()
  const update = useUpdate(refs)
  const setLevel = (level: number) => update({ level })
  const name = <Field value={item.name} path={pathOf(refs, 'name')} placeholder={P.language} />
  if (display === 'none') return <div>{name}</div>
  if (display === 'text') {
    return (
      <SplitRow
        left={name}
        right={
          <LevelLabel
            label={LANGUAGE_LEVEL_LABELS[language][item.level - 1]!}
            level={item.level}
            onChange={setLevel}
          />
        }
      />
    )
  }
  if (display === 'bar') {
    return (
      <div>
        {name}
        <LevelIndicator level={item.level} display="bar" onChange={setLevel} />
      </div>
    )
  }
  return (
    <SplitRow
      left={name}
      right={<LevelIndicator level={item.level} display="dots" onChange={setLevel} />}
    />
  )
}

/** Language level as text; a click cycles through the levels in the editor. */
function LevelLabel({
  label,
  level,
  onChange,
}: {
  label: string
  level: number
  onChange: (level: number) => void
}) {
  const editor = useEditor()
  const { t } = useTranslation()
  if (!editor) return <>{label}</>
  return (
    <button
      type="button"
      title={t('renderer.changeLevel')}
      className="cv-editable cursor-pointer border-0 bg-transparent p-0 text-inherit"
      style={{ font: 'inherit' }}
      onClick={() => onChange((level % 5) + 1)}
    >
      {label}
    </button>
  )
}

export function SkillsView({
  items,
  display,
  sectionId,
}: {
  items: SkillItem[]
  display: SkillDisplay
  sectionId: string
}) {
  const P = usePlaceholders()
  const { inlineSkills, mode } = useRender()
  const editor = useEditor()
  const shown = mode === 'preview' ? items.filter((s) => s.name.trim()) : items

  const name = (skill: SkillItem) => (
    <Field
      value={skill.name}
      path={pathOf({ sectionId, itemId: skill.id }, 'name')}
      placeholder={P.skill}
      onEnter={() => editor?.addItem(sectionId, skill.id)}
      onBackspaceEmpty={
        items.length > 1 ? () => editor?.removeItem(sectionId, skill.id) : undefined
      }
    />
  )
  const setLevel = (skill: SkillItem) => (level: number) =>
    editor?.updateItem(sectionId, skill.id, { level })

  if (display === 'pills') {
    return (
      <ul className="flex flex-wrap gap-[0.4em]">
        {shown.map((skill) => (
          <li
            key={skill.id}
            className="rounded-pill px-[0.75em] py-[0.15em] text-[0.9em]"
            style={pill}
          >
            {name(skill)}
          </li>
        ))}
      </ul>
    )
  }

  if (display === 'bullets') {
    return (
      <ul
        className={`list-disc space-y-[0.2em] pl-[1.2em] marker:text-(--cv-accent-text) ${
          inlineSkills ? 'grid grid-cols-2 gap-x-[1.5em] space-y-0' : ''
        }`}
      >
        {shown.map((skill) => (
          <li key={skill.id}>{name(skill)}</li>
        ))}
      </ul>
    )
  }

  if (display === 'none') {
    if (inlineSkills) {
      return (
        <p>
          {shown.map((skill, i) => (
            <span key={skill.id}>
              {i > 0 && <span style={muted}> · </span>}
              {name(skill)}
            </span>
          ))}
        </p>
      )
    }
    return (
      <ul className="space-y-[0.2em]">
        {shown.map((skill) => (
          <li key={skill.id}>{name(skill)}</li>
        ))}
      </ul>
    )
  }

  return (
    <ul
      className={
        inlineSkills ? 'grid grid-cols-2 gap-x-[1.5em] gap-y-[0.35em]' : 'space-y-[0.35em]'
      }
    >
      {shown.map((skill) => {
        // A skill without a level gets the middle level as soon as levels are shown.
        const level = skill.level ?? 3
        return display === 'bar' ? (
          <li key={skill.id}>
            {name(skill)}
            <LevelIndicator level={level} display="bar" onChange={setLevel(skill)} />
          </li>
        ) : (
          <li key={skill.id}>
            <SplitRow
              left={name(skill)}
              right={<LevelIndicator level={level} display="dots" onChange={setLevel(skill)} />}
            />
          </li>
        )
      })}
    </ul>
  )
}

export function SummaryView({ text, sectionId }: { text: string; sectionId: string }) {
  const P = usePlaceholders()
  return (
    <Field
      value={text}
      path={`sections.${sectionId}.text`}
      placeholder={P.summary}
      className="block text-[0.95em]"
      style={mutedStrong}
      multiline
    />
  )
}
