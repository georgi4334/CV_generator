import type { Messages } from '@/i18n/types'

export const labels: Messages['labels'] = {
  jobStatus: {
    to_apply: 'За кандидатстване',
    applied: 'Кандидатствах',
    interviewing: 'Интервюта',
    negotiating: 'Преговори',
    accepted: 'Приета',
    rejected: 'Отказ',
    no_answer: 'Без отговор',
  },
  jobType: {
    remote: 'Дистанционно',
    onsite: 'В офиса',
    hybrid: 'Хибридно',
  },
  cvLanguage: {
    'en-US': 'Английски (САЩ)',
    'en-GB': 'Английски (Великобритания)',
    bg: 'Български',
  },
  profession: {
    'software-developer': {
      name: 'Софтуерен разработчик',
      description: 'Разработчици, инженери, ИТ и данни',
    },
    designer: { name: 'Дизайнер', description: 'UI/UX, графични и продуктови дизайнери' },
    'sales-marketing': {
      name: 'Продажби и маркетинг',
      description: 'Продажби, маркетинг, акаунт и бизнес позиции',
    },
    healthcare: {
      name: 'Здравеопазване',
      description: 'Медицински сестри, лекари, терапевти и персонал за грижи',
    },
    academic: {
      name: 'Наука и образование',
      description: 'Изследователи, преподаватели и докторанти',
    },
  },
  template: {
    polished: 'Изискан',
    contemporary: 'Съвременен',
    creative: 'Креативен',
    timeline: 'Хронология',
    stylish: 'Стилен',
    'single-column': 'Една колона',
    compact: 'Компактен',
    multicolumn: 'Многоколонен',
    portfolio: 'Портфолио',
    elegant: 'Елегантен',
    vivid: 'Ярък',
    spotlight: 'Прожектор',
    modern: 'Модерен',
    bold: 'Смел',
    monogram: 'Монограм',
    executive: 'Мениджърски',
  },
  templateCategory: {
    professional: 'Професионални',
    design: 'Дизайн и творчество',
    marketing: 'Маркетинг',
    sales: 'Продажби',
  },
  documentType: {
    cv: 'CV',
    coverLetter: 'Мотивационно писмо',
    resignation: 'Заявление за напускане',
  },
}
