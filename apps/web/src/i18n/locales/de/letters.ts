import type { Messages } from '../../types'

export const letters: Messages['letters'] = {
  newTitle: 'Anschreiben erstellen',
  newDescription:
    'Name, Kontaktdaten und Design werden aus dem Lebenslauf übernommen, damit Anschreiben und Lebenslauf zusammenpassen.',
  cv: 'Lebenslauf',
  noCv: 'Kein Lebenslauf (leerer Kopfbereich)',
  jobOptional: 'Stelle (optional)',
  jobHint:
    'Füllt das Unternehmen aus, und die Spalte „Anschreiben“ der Stelle verweist auf dieses Anschreiben.',
  letterLanguage: 'Sprache des Anschreibens',
  name: 'Name',
  defaultTitle: 'Anschreiben',
  defaultTitleCompany: 'Anschreiben – {{company}}',
  creating: 'Wird erstellt…',
  create: 'Anschreiben erstellen',
  createFailed: 'Das Anschreiben konnte nicht erstellt werden: {{message}}',
  linkedCv: 'Verknüpfter Lebenslauf',
  job: 'Stelle',
  jobOption: '{{position}} bei {{company}}',
  useCvDesign: 'Kopfbereich und Design des Lebenslaufs übernehmen',
  useCvDesignHint:
    'Kopiert Name, Kontaktdaten, Foto, Vorlage und Design aus dem verknüpften Lebenslauf',
  copied: 'Kopfbereich und Design aus „{{title}}“ übernommen.',
  notSaved: 'Nicht gespeichert: {{message}}',
  notRenamed: 'Nicht umbenannt: {{message}}',
  printHint: 'Wählen Sie im Druckdialog „Als PDF speichern“ als Ziel.',
}
