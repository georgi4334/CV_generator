import type { Messages } from '@/i18n/types'

export const dashboard: Messages['dashboard'] = {
  title: 'Табло',
  description: 'Вашите документи и кандидатури с един поглед.',
  quickActions: 'Бързи действия',
  newCv: 'Ново CV',
  newLetter: 'Ново мотивационно писмо',
  addJob: 'Добавяне на обява',
  recent: {
    heading: 'Последни документи',
    viewAll: 'Вижте всички',
    loading: 'Документите Ви се зареждат…',
    empty: 'Все още нямате документи. Последните Ви CV-та и мотивационни писма ще се покажат тук.',
    createFirst: 'Създайте първото си CV',
  },
  pipeline: {
    heading: 'Етапи на кандидатстване',
    allJobs: 'Всички запазени обяви',
  },
  reminders: {
    heading: 'Напомняния',
    updateError: 'Обявата не можа да бъде обновена: {{message}}',
    none: 'Няма нищо за проследяване.',
    jobAt: '{{position}} в {{company}}',
    noAnswer_one: 'Кандидатствали сте преди {{count}} ден и все още няма отговор.',
    noAnswer_other: 'Кандидатствали сте преди {{count}} дни и все още няма отговор.',
    toApply_one: 'Запазена преди {{count}} ден и все още в статус „{{status}}“.',
    toApply_other: 'Запазена преди {{count}} дни и все още в статус „{{status}}“.',
    markNoAnswer: 'Отбелязване като „{{status}}“',
    applied: 'Кандидатствах',
  },
}
