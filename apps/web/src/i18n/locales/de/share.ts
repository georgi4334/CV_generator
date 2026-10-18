import type { Messages } from '@/i18n/types'

export const share: Messages['share'] = {
  dialog: {
    heading: '„{{title}}“ teilen',
    loading: 'Wird geladen…',
    switchLabel: 'Link zum Ansehen teilen',
    switchHint: 'Jeder mit dem Link kann das Dokument ohne Konto ansehen und herunterladen.',
    linkLabel: 'Link teilen',
    copy: 'Kopieren',
    copied: 'Kopiert',
    open: 'Link öffnen',
    replace: 'Link ersetzen',
    activeNote:
      'Der Link zeigt immer Ihre zuletzt gespeicherten Änderungen. „Link ersetzen“ gibt ihm eine neue Adresse; die alte funktioniert nicht mehr.',
    inactiveNote:
      'Der Link ist ausgeschaltet und zeigt nichts an. Beim erneuten Einschalten gilt wieder dieselbe Adresse.',
    hideLabel: 'Meine persönlichen Daten ausblenden',
    hideHint:
      'Zum öffentlichen Teilen des Links (z. B. für Feedback): Name, Foto, E-Mail, Telefon, Link und Ort werden unscharf, der Titel wird ausgeblendet. Die echten Daten erreichen die Seite nie.',
    hideCheck:
      'Ihr übriger Text (Profil, Berufserfahrung) wird unverändert angezeigt – prüfen Sie ihn auf persönliche Angaben.',
    done: 'Fertig',
  },
  page: {
    brokenTitle: 'Dieser Link funktioniert nicht',
    brokenText:
      'Möglicherweise hat der Besitzer ihn ausgeschaltet oder durch einen neuen Link ersetzt. Bitten Sie ihn um den aktuellen Link.',
    makeOwn: 'Eigenen Lebenslauf erstellen',
    loadErrorTitle: 'Dieses Dokument konnte nicht geladen werden',
    downloadPdf: 'PDF herunterladen',
    printTitle: 'Öffnet den Druckdialog: „Als PDF speichern“ wählen',
    hiddenBanner: 'Der Besitzer hat seine persönlichen Daten in diesem Link ausgeblendet.',
    untitledCv: 'Geteilter Lebenslauf',
    untitledLetter: 'Geteiltes Anschreiben',
    untitledResignation: 'Geteiltes Kündigungsschreiben',
    madeWith: 'Erstellt mit',
  },
}
