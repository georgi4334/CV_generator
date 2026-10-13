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
