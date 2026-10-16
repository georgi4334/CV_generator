import type { Messages } from '../../types'

export const nav: Messages['nav'] = {
  main: 'Hauptnavigation',
  dashboard: 'Übersicht',
  documents: 'Dokumente',
  savedJobs: 'Gespeicherte Stellen',
  privacy: 'Datenschutz',
  terms: 'Nutzungsbedingungen',
  lastUpdated: 'Zuletzt aktualisiert: {{date}}',
  api: {
    checking: 'API wird geprüft…',
    unreachable: 'API nicht erreichbar',
    online: 'API und Datenbank online',
    databaseDown: 'API online, Datenbank nicht verfügbar',
    unknown: 'Unbekannt',
  },
  notFound: {
    title: 'Seite nicht gefunden',
    back: 'Zurück zur Übersicht',
  },
  error: {
    outdatedTitle: 'Eine neue Version ist verfügbar',
    outdatedText: 'Laden Sie die Seite neu, um fortzufahren.',
    title: 'Etwas ist schiefgelaufen',
    text: 'Die Seite konnte nicht angezeigt werden. Ihre gespeicherte Arbeit ist sicher; ein Neuladen hilft meist.',
    reload: 'Neu laden',
  },
  load: {
    failedTitle: 'Dieses Dokument konnte nicht geöffnet werden',
    backToDocuments: 'Zurück zu den Dokumenten',
  },
}
