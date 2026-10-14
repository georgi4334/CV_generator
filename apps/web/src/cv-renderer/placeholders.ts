import type { CvLanguage } from '@cv/shared'
import { useRender } from './context'

/** Grey hint texts shown for empty fields while editing (from the reference screenshots). */
const EN = {
  name: 'Your Name',
  headline: 'The role you are applying for?',
  phone: 'Phone',
  email: 'Email',
  link: 'LinkedIn/Portfolio',
  location: 'Location',
  summary:
    "Briefly explain why you're a great fit for the role - use the AI assistant to tailor this summary for each job posting.",
  experienceTitle: 'Title',
  company: 'Company Name',
  datePeriod: 'Date period',
  date: 'Date',
  linkUrl: 'Link',
  bullet: 'Highlight your accomplishments, using numbers if possible.',
  degree: 'Degree and Field of Study',
  institution: 'School or University',
  skill: 'Your Skill',
  achievementTitle: 'Your Achievement',
  achievementDescription: 'Describe what you did and the impact it had.',
  courseTitle: 'Course Title',
  courseInstitution: 'Which institution provided the course?',
  projectName: 'Project Name',
  projectRole: 'Your role',
  projectDescription: 'What was the project and what did you achieve?',
  language: 'Language',
  certificate: 'Certificate Name',
  issuer: 'Issuing organization',
  customTitle: 'Title',
  customSubtitle: 'Subtitle',
  customDescription: 'Description',
}

export type Placeholders = typeof EN

/** Placeholders follow the CV language, like the section titles and dates. */
export const PLACEHOLDERS: Record<CvLanguage, Placeholders> = {
  'en-US': EN,
  'en-GB': { ...EN, issuer: 'Issuing organisation' },
  bg: {
    name: 'Вашето име',
    headline: 'За каква позиция кандидатствате?',
    phone: 'Телефон',
    email: 'Имейл',
    link: 'LinkedIn/Портфолио',
    location: 'Местоположение',
    summary:
      'Обяснете накратко защо сте подходящ за ролята - използвайте AI асистента, за да адаптирате резюмето за всяка обява.',
    experienceTitle: 'Длъжност',
    company: 'Име на компанията',
    datePeriod: 'Период',
    date: 'Дата',
    linkUrl: 'Линк',
    bullet: 'Опишете постиженията си, с числа, ако е възможно.',
    degree: 'Степен и специалност',
    institution: 'Училище или университет',
    skill: 'Ваше умение',
    achievementTitle: 'Ваше постижение',
    achievementDescription: 'Опишете какво направихте и какъв беше резултатът.',
    courseTitle: 'Име на курса',
    courseInstitution: 'Коя организация проведе курса?',
    projectName: 'Име на проекта',
    projectRole: 'Вашата роля',
    projectDescription: 'Какъв беше проектът и какво постигнахте?',
    language: 'Език',
    certificate: 'Име на сертификата',
    issuer: 'Издаваща организация',
    customTitle: 'Заглавие',
    customSubtitle: 'Подзаглавие',
    customDescription: 'Описание',
  },
}

export function usePlaceholders(): Placeholders {
  return PLACEHOLDERS[useRender().language]
}
