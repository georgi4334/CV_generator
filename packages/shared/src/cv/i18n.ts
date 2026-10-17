import type { CvLanguage } from './common'
import type { Section, SectionType } from './sections'

export const DEFAULT_SECTION_TITLES: Record<CvLanguage, Record<SectionType, string>> = {
  'en-US': {
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    achievements: 'Key Achievements',
    courses: 'Courses',
    projects: 'Projects',
    languages: 'Languages',
    certificates: 'Certifications',
    custom: 'Custom Section',
  },
  'en-GB': {
    summary: 'Profile',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    achievements: 'Key Achievements',
    courses: 'Courses',
    projects: 'Projects',
    languages: 'Languages',
    certificates: 'Certifications',
    custom: 'Custom Section',
  },
  bg: {
    summary: 'Профил',
    experience: 'Професионален опит',
    education: 'Образование',
    skills: 'Умения',
    achievements: 'Ключови постижения',
    courses: 'Курсове',
    projects: 'Проекти',
    languages: 'Езици',
    certificates: 'Сертификати',
    custom: 'Друго',
  },
}

export function getSectionTitle(section: Section, language: CvLanguage): string {
  return section.title ?? DEFAULT_SECTION_TITLES[language][section.type]
}

const PRESENT: Record<CvLanguage, string> = {
  'en-US': 'Present',
  'en-GB': 'Present',
  bg: 'до момента',
}

/** Labels for 1–5 language levels when a Languages section shows levels as text. */
export const LANGUAGE_LEVEL_LABELS: Record<CvLanguage, [string, string, string, string, string]> = {
  'en-US': ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Native'],
  'en-GB': ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Native'],
  bg: ['Начинаещ', 'Основно ниво', 'Средно ниво', 'Напреднал', 'Майчин език'],
}

const EN_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Short month names. Fixed tables rather than Intl, whose output differs between browsers and Node. */
const MONTHS: Record<CvLanguage, string[]> = {
  'en-US': EN_MONTHS,
  'en-GB': EN_MONTHS,
  bg: ['яну', 'фев', 'март', 'апр', 'май', 'юни', 'юли', 'авг', 'септ', 'окт', 'ное', 'дек'],
}

/** "2024" → "2024", "2024-05" → "May 2024" (in the CV language). */
export function formatYearMonth(value: string | null, language: CvLanguage): string {
  if (!value) return ''
  const [year, month] = value.split('-')
  if (!month) return year ?? ''
  return `${MONTHS[language][Number(month) - 1]} ${year}`
}

/** "May 2021 – Present", "2019 – 2022", or "" when no dates are set. */
export function formatDateRange(
  range: { startDate: string | null; endDate: string | null; isCurrent: boolean },
  language: CvLanguage,
): string {
  const start = formatYearMonth(range.startDate, language)
  const end = range.isCurrent ? PRESENT[language] : formatYearMonth(range.endDate, language)
  if (start && end) return `${start} – ${end}`
  return start || end
}

const EXPIRES: Record<CvLanguage, string> = {
  'en-US': 'Expires',
  'en-GB': 'Expires',
  bg: 'Валиден до',
}

/**
 * When a certificate was issued and when it expires: "May 2023 · Expires May 2026",
 * just "May 2023" when it never expires, or "" when no dates are set.
 */
export function formatCertificateDates(
  dates: { date: string | null; expiryDate?: string | null },
  language: CvLanguage,
): string {
  const issued = formatYearMonth(dates.date, language)
  const expiry = formatYearMonth(dates.expiryDate ?? null, language)
  const expires = expiry ? `${EXPIRES[language]} ${expiry}` : ''
  return [issued, expires].filter(Boolean).join(' · ')
}
