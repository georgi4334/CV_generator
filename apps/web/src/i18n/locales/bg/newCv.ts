import type { Messages } from '../../types'

export const newCv: Messages['newCv'] = {
  title: 'Създаване на ново CV',
  steps: 'Стъпки',
  stepProfession: 'Професия',
  stepTemplate: 'Шаблон',
  stepStart: 'Начало',
  descriptionProfession:
    'За какъв вид работа е това CV? Ще Ви предложим подходящи шаблони и секции.',
  descriptionTemplate: 'Изберете шаблон. Можете да го смените по всяко време в редактора.',
  descriptionStart: 'Започнете от пример, който можете да редактирате, или от празно CV.',
  otherName: 'Друго',
  otherDescription: 'Всяка друга работа. Започнете от общ изглед.',
  professions: 'Професии',
  recommendedFor: 'Препоръчани за: {{profession}}',
  moreTemplates: 'Още шаблони',
  allTemplates: 'Всички шаблони',
  previewsNote: 'Прегледите показват примерно съдържание.',
  startLegend: 'Как искате да започнете?',
  startExample: 'Започни от пример',
  startExampleDescription: 'Пълно CV с примерен текст ({{profession}}). Заменете го със свой.',
  startBlank: 'Започни с празно CV',
  startBlankProfession: 'Секциите, които CV ({{profession}}) обикновено има, готови за попълване.',
  startBlankGeneral: 'Общ изглед с най-често срещаните секции, готови за попълване.',
  examplesHint: 'Примери има, когато изберете професия.',
  cvName: 'Име на CV',
  cvLanguage: 'Език на CV',
  defaultTitle: 'CV – {{profession}}',
  untitled: 'CV без заглавие',
  creating: 'Създаване…',
  createCv: 'Създай CV',
  languageNote:
    'Езикът на CV определя заглавията на секциите и формата на датите. Можете да го смените по-късно в „Шаблони“.',
  languageNoteExample:
    'Езикът на CV определя заглавията на секциите и формата на датите; самият примерен текст е на английски. Можете да го смените по-късно в „Шаблони“.',
  createFailed: 'CV не можа да бъде създадено: {{message}}',
}
