import type { Messages } from '../../types'

export const nav: Messages['nav'] = {
  main: 'Основна навигация',
  dashboard: 'Табло',
  documents: 'Документи',
  savedJobs: 'Запазени обяви',
  privacy: 'Поверителност',
  terms: 'Условия',
  lastUpdated: 'Последна промяна: {{date}}',
  api: {
    checking: 'Проверка на API…',
    unreachable: 'API не е достъпно',
    online: 'API и базата данни работят',
    databaseDown: 'API работи, базата данни не',
    unknown: 'Неизвестно',
  },
  notFound: {
    title: 'Страницата не е намерена',
    back: 'Назад към таблото',
  },
  error: {
    outdatedTitle: 'Има нова версия',
    outdatedText: 'Презаредете страницата, за да продължите.',
    title: 'Нещо се обърка',
    text: 'Страницата не може да бъде показана. Запазената Ви работа е в безопасност; обикновено презареждането помага.',
    reload: 'Презареди',
  },
  load: {
    failedTitle: 'Документът не може да бъде отворен',
    backToDocuments: 'Назад към документите',
  },
}
