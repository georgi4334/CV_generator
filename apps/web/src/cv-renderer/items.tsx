import {
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
  type SkillItem,
  type SectionOf,
} from '@cv/shared'
import {
  Award,
  Building2,
  Heart,
  Lightbulb,
  Rocket,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Handshake,
  type LucideIcon,
} from 'lucide-react'
import { useRender } from './context'
import { Bullets, Field, LevelIndicator, SplitRow } from './primitives'
import { PLACEHOLDERS as P } from './placeholders'

const accent = { color: 'var(--cv-accent-text)' }
const muted = { color: 'var(--cv-muted)' }

function DateField({ value }: { value: string }) {
  return <Field value={value} placeholder={P.datePeriod} />
}

export function ExperienceView({ item, showLogo }: { item: ExperienceItem; showLogo: boolean }) {
  const { language, mode } = useRender()
  const logo = item.logoUrl ? (
    <img src={item.logoUrl} alt="" className="size-[2.6em] shrink-0 rounded-full object-cover" />
  ) : mode === 'edit' ? (
    <span
      className="flex size-[2.6em] shrink-0 items-center justify-center rounded-full"
      style={{ background: 'var(--cv-rule)', color: 'var(--cv-muted)' }}
    >
      <Building2 className="size-[1.3em]" />
    </span>
  ) : null

  return (
    <div className="flex gap-[0.8em]">
      {showLogo && logo}
      <div className="min-w-0 flex-1">
        <SplitRow
          left={
            <Field
              value={item.title}
              placeholder={P.experienceTitle}
              className="text-[1.05em] font-medium"
            />
          }
          right={<DateField value={formatDateRange(item, language)} />}
        />
        <SplitRow
          left={<Field value={item.company} placeholder={P.company} style={accent} />}
          right={<Field value={item.location} placeholder={P.location} />}
        />
        <Bullets bullets={item.bullets} placeholder={P.bullet} />
      </div>
    </div>
  )
}

export function EducationView({ item }: { item: EducationItem }) {
  const { language } = useRender()
  return (
    <div>
      <Field
        value={item.degree}
        placeholder={P.degree}
        className="block text-[1.05em] font-semibold"
        style={accent}
      />
      <Field value={item.institution} placeholder={P.institution} className="block" />
      <SplitRow
        left={
          <span className="text-[0.85em]" style={muted}>
            <DateField value={formatDateRange(item, language)} />
          </span>
        }
        right={<Field value={item.location} placeholder={P.location} />}
      />
      <Bullets bullets={item.bullets} placeholder={P.bullet} />
    </div>
  )
}

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  star: Star,
  rocket: Rocket,
  trophy: Trophy,
  handshake: Handshake,
  lightbulb: Lightbulb,
  target: Target,
  award: Award,
  users: Users,
  'trending-up': TrendingUp,
  heart: Heart,
}

export function AchievementView({ item }: { item: AchievementItem }) {
  const Icon = ACHIEVEMENT_ICONS[item.icon] ?? Star
  return (
    <div className="flex gap-[0.6em]">
      <Icon className="mt-[0.2em] size-[1.05em] shrink-0" style={accent} />
      <div className="min-w-0">
        <Field
          value={item.title}
          placeholder={P.achievementTitle}
          className="block text-[1.05em]"
          style={accent}
        />
        <Field
          value={item.description}
          placeholder={P.achievementDescription}
          className="block text-[0.9em]"
          style={muted}
        />
      </div>
    </div>
  )
}

export function CourseView({ item }: { item: CourseItem }) {
  const { language } = useRender()
  const date = formatYearMonth(item.date, language)
  return (
    <div>
      <SplitRow
        left={
          <Field
            value={item.title}
            placeholder={P.courseTitle}
            className="text-[1.05em]"
            style={accent}
          />
        }
        right={date}
      />
      <Field
        value={item.institution}
        placeholder={P.courseInstitution}
        className="block text-[0.9em]"
        style={muted}
      />
    </div>
  )
}

export function ProjectView({ item }: { item: ProjectItem }) {
  const { language } = useRender()
  return (
    <div>
      <SplitRow
        left={
          <Field
            value={item.name}
            placeholder={P.projectName}
            className="text-[1.05em] font-medium"
          />
        }
        right={formatDateRange(item, language)}
      />
      <div className="text-[0.9em]">
        <Field value={item.role} placeholder={P.projectRole} style={accent} />
        {item.link && <span style={muted}> · {item.link}</span>}
      </div>
      <Field
        value={item.description}
        placeholder={P.projectDescription}
        className="mt-[0.2em] block text-[0.92em]"
        style={{ color: 'var(--cv-muted-strong)' }}
      />
      <Bullets bullets={item.bullets} placeholder={P.bullet} />
    </div>
  )
}

export function CertificateView({ item }: { item: CertificateItem }) {
  const { language } = useRender()
  const date = formatYearMonth(item.date, language)
  return (
    <div>
      <Field
        value={item.name}
        placeholder={P.certificate}
        className="block text-[1.05em]"
        style={accent}
      />
      <div className="text-[0.9em]" style={muted}>
        <Field value={item.issuer} placeholder={P.issuer} />
        {date && ` · ${date}`}
      </div>
    </div>
  )
}

export function CustomView({ item }: { item: CustomItem }) {
  return (
    <div>
      <SplitRow
        left={
          <Field
            value={item.title}
            placeholder={P.customTitle}
            className="text-[1.05em] font-medium"
          />
        }
        right={item.date}
      />
      <Field
        value={item.subtitle}
        placeholder={P.customSubtitle}
        className="block"
        style={accent}
      />
      <Field
        value={item.description}
        placeholder={P.customDescription}
        className="mt-[0.2em] block text-[0.92em]"
        style={{ color: 'var(--cv-muted-strong)' }}
      />
      <Bullets bullets={item.bullets} placeholder={P.bullet} />
    </div>
  )
}

type LanguagesDisplay = SectionOf<'languages'>['levelDisplay']

export function LanguageView({ item, display }: { item: LanguageItem; display: LanguagesDisplay }) {
  const { language } = useRender()
  const name = <Field value={item.name} placeholder={P.language} />
  if (display === 'none') return <div>{name}</div>
  if (display === 'text') {
    return <SplitRow left={name} right={LANGUAGE_LEVEL_LABELS[language][item.level - 1]} />
  }
  if (display === 'bar') {
    return (
      <div>
        {name}
        <LevelIndicator level={item.level} display="bar" />
      </div>
    )
  }
  return <SplitRow left={name} right={<LevelIndicator level={item.level} display="dots" />} />
}

type SkillsDisplay = SectionOf<'skills'>['levelDisplay']

export function SkillsView({ items, display }: { items: SkillItem[]; display: SkillsDisplay }) {
  const { inlineSkills, mode } = useRender()
  const shown = mode === 'preview' ? items.filter((s) => s.name.trim()) : items

  if (display === 'none' || shown.every((s) => s.level === null)) {
    if (inlineSkills) {
      return (
        <p>
          {shown.map((skill, i) => (
            <span key={skill.id}>
              {i > 0 && <span style={muted}> · </span>}
              <Field value={skill.name} placeholder={P.skill} />
            </span>
          ))}
        </p>
      )
    }
    return (
      <ul className="space-y-[0.2em]">
        {shown.map((skill) => (
          <li key={skill.id}>
            <Field value={skill.name} placeholder={P.skill} />
          </li>
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
        const name = <Field value={skill.name} placeholder={P.skill} />
        if (skill.level === null) return <li key={skill.id}>{name}</li>
        return display === 'bar' ? (
          <li key={skill.id}>
            {name}
            <LevelIndicator level={skill.level} display="bar" />
          </li>
        ) : (
          <li key={skill.id}>
            <SplitRow left={name} right={<LevelIndicator level={skill.level} display="dots" />} />
          </li>
        )
      })}
    </ul>
  )
}

export function SummaryView({ text }: { text: string }) {
  return (
    <Field
      value={text}
      placeholder={P.summary}
      className="block text-[0.95em]"
      style={{ color: 'var(--cv-muted-strong)' }}
    />
  )
}
