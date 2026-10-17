import type { Messages } from '@/i18n/types'

/** Die Willkommensseite für Besucher, die nicht angemeldet sind. */
export const welcome: Messages['welcome'] = {
  eyebrow: 'Lebenslauf · Anschreiben · Bewerbungsübersicht',
  title: 'Erstellen Sie einen Lebenslauf, der zum Gespräch führt',
  lead: 'Vorlage wählen, die KI Ihre Formulierungen schärfen lassen und ein sauberes PDF herunterladen. Danach behalten Sie jede Bewerbung an einem Ort im Blick.',
  create: 'Lebenslauf erstellen',
  logIn: 'Anmelden',
  haveAccount: 'Sie haben schon ein Konto?',
  previewLabel: 'Ein Beispiel-Lebenslauf, erstellt mit {{app}}',
  featuresTitle: 'Alles für Ihre Jobsuche',
  features: {
    templates: {
      title: 'Vorlagen, die Sie anpassen können',
      text: 'Acht Designs mit Ihren Farben, Schriften, Foto und Seitenhintergrund, mit Live-Vorschau beim Tippen.',
    },
    ai: {
      title: 'KI, die hilft, statt zu übernehmen',
      text: 'Fehler korrigieren, den Lebenslauf auf eine Stellenanzeige zuschneiden oder den Assistenten eine Zeile umformulieren lassen.',
    },
    letters: {
      title: 'Passende Anschreiben',
      text: 'Schreiben Sie ein Anschreiben im Stil Ihres Lebenslaufs und halten Sie beides zusammen.',
    },
    share: {
      title: 'Als PDF oder Link',
      text: 'Laden Sie ein sauberes PDF herunter oder teilen Sie einen Link zum Lesen für Feedback und schalten Sie ihn jederzeit ab.',
    },
    jobs: {
      title: 'Jede Bewerbung im Blick',
      text: 'Stellen speichern, den gesendeten Lebenslauf verknüpfen und sehen, wie weit Ihre Bewerbungen kommen.',
    },
    languages: {
      title: 'Ihre Sprache, hell oder dunkel',
      text: 'Deutsch, Englisch und Bulgarisch, mit dunklem Modus für späte Stunden.',
    },
  },
  finalTitle: 'Bereit, wenn Sie es sind',
  finalText:
    'Legen Sie in einer Minute ein Konto an und starten Sie mit einem Beispiel-Lebenslauf für Ihren Beruf.',
}
