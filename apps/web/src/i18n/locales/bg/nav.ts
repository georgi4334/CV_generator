import type { Messages } from '@/i18n/types'

export const nav: Messages['nav'] = {
  main: 'Основна навигация',
  skipToContent: 'Към съдържанието',
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
    text: 'Връзката може да е грешна или страницата е преместена или изтрита.',
    home: 'Към таблото',
    goBack: 'Назад',
  },
  error: {
    outdatedTitle: 'Има нова версия',
    outdatedText: 'Презаредете страницата, за да продължите.',
    title: 'Нещо се обърка',
    text: 'Страницата не може да бъде показана. Запазената Ви работа е в безопасност; обикновено презареждането помага.',
    reload: 'Презареди',
    home: 'Към таблото',
  },
  load: {
    failedTitle: 'Документът не може да бъде отворен',
    backToDocuments: 'Назад към документите',
  },
}
