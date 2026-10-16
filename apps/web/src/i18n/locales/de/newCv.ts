import type { Messages } from '@/i18n/types'

export const newCv: Messages['newCv'] = {
  title: 'Neuen Lebenslauf erstellen',
  steps: 'Schritte',
  stepProfession: 'Beruf',
  stepTemplate: 'Vorlage',
  stepStart: 'Start',
  descriptionProfession:
    'Für welche Art von Stelle ist dieser Lebenslauf? Wir schlagen passende Vorlagen und Abschnitte vor.',
  descriptionTemplate: 'Wählen Sie eine Vorlage. Sie können sie im Editor jederzeit wechseln.',
  descriptionStart:
    'Starten Sie mit einem bearbeitbaren Beispiel oder mit einem leeren Lebenslauf.',
  otherName: 'Sonstiges',
  otherDescription: 'Jeder andere Beruf. Starten Sie mit einem allgemeinen Layout.',
  professions: 'Berufe',
  recommendedFor: 'Empfohlen für: {{profession}}',
  moreTemplates: 'Weitere Vorlagen',
  allTemplates: 'Alle Vorlagen',
  previewsNote: 'Die Vorschauen zeigen Beispielinhalte.',
  startLegend: 'Wie möchten Sie beginnen?',
  startExample: 'Mit einem Beispiel beginnen',
  startExampleDescription:
    'Ein vollständiger Lebenslauf ({{profession}}) mit Beispieltext. Ersetzen Sie ihn durch Ihren eigenen.',
  startBlank: 'Leer beginnen',
  startBlankProfession:
    'Die Abschnitte, die ein Lebenslauf ({{profession}}) üblicherweise hat, zum Ausfüllen bereit.',
  startBlankGeneral: 'Ein allgemeines Layout mit den gängigsten Abschnitten, zum Ausfüllen bereit.',
  examplesHint: 'Beispiele gibt es, sobald Sie einen Beruf auswählen.',
  cvName: 'Name des Lebenslaufs',
  cvLanguage: 'Sprache des Lebenslaufs',
  defaultTitle: 'Lebenslauf {{profession}}',
  untitled: 'Lebenslauf ohne Titel',
  creating: 'Wird erstellt…',
  createCv: 'Lebenslauf erstellen',
  languageNote:
    'Die Sprache des Lebenslaufs bestimmt Abschnittstitel und Datumsformate. Sie können sie später unter „Vorlagen“ ändern.',
  languageNoteExample:
    'Die Sprache des Lebenslaufs bestimmt Abschnittstitel und Datumsformate; der Beispieltext selbst ist auf Englisch. Sie können sie später unter „Vorlagen“ ändern.',
  createFailed: 'Der Lebenslauf konnte nicht erstellt werden: {{message}}',
}
