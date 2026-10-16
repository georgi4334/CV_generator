import type { Messages } from '@/i18n/types'

export const legal: Messages['legal'] = {
  privacy: {
    title: 'Datenschutzerklärung',
    updated: '16. Oktober 2026',
    intro:
      'CV Generator hilft Ihnen, Lebensläufe und Anschreiben zu verfassen und Ihre Bewerbungen im Blick zu behalten. Diese Seite erklärt, welche personenbezogenen Daten wir speichern, warum, wer uns bei der Verarbeitung unterstützt und welche Rechte Sie nach der EU-Datenschutz-Grundverordnung (DSGVO) haben.',
    who: {
      title: 'Wer verantwortlich ist',
      body: 'Verantwortlicher ist {{operator}}. Kontakt: <mail>{{contact}}</mail>.',
    },
    keep: {
      title: 'Was wir speichern',
      account:
        '<strong>Konto:</strong> Ihre E-Mail-Adresse, Ihr Name (optional), eine verschlüsselte Form Ihres Passworts (wir können es nicht lesen) und ob Sie Ihre E-Mail-Adresse bestätigt haben.',
      content:
        '<strong>Ihre Inhalte:</strong> Lebensläufe, Anschreiben, gespeicherte Stellen (einschließlich der von Ihnen eingefügten Stellenanzeigen), hochgeladene Fotos und Logos sowie frühere Versionen Ihrer Lebensläufe.',
      share:
        '<strong>Freigabelinks:</strong> Wenn Sie ein Dokument freigeben, kann es jeder mit dem Link ansehen, bis Sie den Link deaktivieren.',
      technical:
        '<strong>Technische Daten:</strong> ein Sitzungs-Cookie, das Sie angemeldet hält, die Anzahl Ihrer KI-Anfragen am heutigen Tag, Ihre IP-Adresse für kurze Zeit zum Schutz vor dem Erraten von Passwörtern sowie Server-Logs, die unsere Hosting-Anbieter führen.',
    },
    why: {
      title: 'Wofür und auf welcher Rechtsgrundlage',
      contract:
        'Um den Dienst bereitzustellen, für den Sie sich registriert haben: Speichern und Anzeigen Ihrer Dokumente, Versand von Konto-E-Mails (Bestätigung, Zurücksetzen des Passworts). Rechtsgrundlage: Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).',
      interests:
        'Um den Dienst sicher und funktionsfähig zu halten: Ratenbegrenzung, Fehlerberichte, Logs. Rechtsgrundlage: berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO).',
      noSale:
        'Wir verkaufen Ihre Daten nicht, zeigen keine Werbung an und erstellen keine Marketingprofile.',
    },
    ai: {
      title: 'KI-Funktionen',
      body: 'Wenn Sie „Fehler korrigieren“, „Prüfen & anpassen“ oder den KI-Assistenten nutzen, wird der Text des geöffneten Dokuments (und gegebenenfalls der Stellenanzeige) an Google (Gemini API) gesendet, um Vorschläge zu erstellen. Es wird nichts gesendet, solange Sie keine dieser Funktionen starten. Geben Sie keine personenbezogenen Daten anderer Personen in Ihre Dokumente ein, es sei denn, Sie sind dazu berechtigt.',
    },
    providers: {
      title: 'Dienstleister',
      intro:
        'Diese Unternehmen verarbeiten Daten in unserem Auftrag auf Grundlage von Auftragsverarbeitungsverträgen:',
      neon: 'Neon (Datenbank)',
      render: 'Render (Anwendungsserver)',
      cloudflare: 'Cloudflare (Website-Hosting und Speicherung hochgeladener Bilder)',
      brevo: 'Brevo (Versand von Konto-E-Mails)',
      google: 'Google (Gemini API, nur wenn Sie KI-Funktionen nutzen)',
      sentry: 'Sentry (Fehlerberichte, ohne die Inhalte Ihrer Dokumente)',
      transfers:
        'Einige von ihnen haben ihren Sitz in den USA oder nutzen Server dort. Die Übermittlungen stützen sich auf das EU-US Data Privacy Framework oder auf die Standardvertragsklauseln der Europäischen Kommission.',
    },
    cookies: {
      title: 'Cookies und lokaler Speicher',
      body: 'Wir verwenden ein einziges Cookie, <code>cv_session</code>, das unbedingt erforderlich ist, um Sie angemeldet zu halten. Ihre Wahl des hellen oder dunklen Designs wird in Ihrem Browser gespeichert. Es gibt keine Analyse- oder Werbe-Cookies, daher ist kein Cookie-Banner nötig.',
    },
    retention: {
      title: 'Wie lange wir Daten speichern',
      account: 'Ihr Konto und Ihre Inhalte: bis Sie Ihr Konto löschen (Konto → Konto löschen).',
      sessions: 'Sitzungen: 30 Tage nach der letzten Nutzung, höchstens 90 Tage.',
      links: 'E-Mail-Links: Zurücksetzen des Passworts 1 Stunde, E-Mail-Bestätigung 24 Stunden.',
      ip: 'IP-Adressen für die Ratenbegrenzung: bis zu einer Stunde im Arbeitsspeicher gehalten.',
      deletion:
        'Wenn Sie Ihr Konto löschen, werden Ihre Dokumente, Stellen, hochgeladenen Bilder, Freigabelinks und Sitzungen sofort entfernt. Sicherungskopien bei unserem Datenbankanbieter laufen nach dessen eigenem Zeitplan ab.',
    },
    rights: {
      title: 'Ihre Rechte',
      body: 'Sie können Ihre Daten jederzeit in der App einsehen, berichtigen und löschen. Außerdem haben Sie das Recht auf Datenübertragbarkeit, auf Einschränkung der Verarbeitung und auf Widerspruch gegen die Verarbeitung sowie das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren (in Bulgarien: Kommission für den Schutz personenbezogener Daten). Um ein Recht auszuüben, schreiben Sie an <mail>{{contact}}</mail>.',
    },
    children: {
      title: 'Kinder',
      body: 'Der Dienst richtet sich nicht an Kinder unter 16 Jahren.',
    },
    changes: {
      title: 'Änderungen',
      body: 'Wenn sich diese Erklärung wesentlich ändert, informieren wir Sie per E-Mail oder in der App.',
    },
  },
  terms: {
    title: 'Nutzungsbedingungen',
    updated: '16. Oktober 2026',
    intro:
      'Diese Bedingungen gelten für CV Generator, betrieben von {{operator}}. Mit der Erstellung eines Kontos akzeptieren Sie sie. Fragen: <mail>{{contact}}</mail>.',
    service: {
      title: 'Der Dienst',
      body: 'Sie können Lebensläufe und Anschreiben erstellen, als PDF herunterladen, per Link teilen, Bewerbungen verfolgen und KI-Funktionen nutzen. Der kostenlose Tarif umfasst bis zu {{maxCvs}} Lebensläufe, {{maxVersions}} gespeicherte Versionen pro Lebenslauf und {{aiRequests}} KI-Anfragen pro Tag. Die Limits können sich ändern; wir informieren Sie, bevor wir sie senken.',
    },
    account: {
      title: 'Ihr Konto',
      email: 'Geben Sie eine echte E-Mail-Adresse an und halten Sie Ihr Passwort geheim.',
      responsible: 'Sie sind für alles verantwortlich, was in Ihrem Konto geschieht.',
      delete: 'Sie können Ihr Konto jederzeit auf der Seite „Konto“ löschen.',
    },
    content: {
      title: 'Ihre Inhalte',
      body: 'Was Sie schreiben und hochladen, bleibt Ihr Eigentum. Sie erlauben uns, es ausschließlich zur Bereitstellung des Dienstes für Sie zu speichern, zu verarbeiten und anzuzeigen (zum Beispiel, um ein Dokument den Personen zu zeigen, für die Sie es freigeben). Laden Sie nur Inhalte hoch, zu deren Nutzung Sie berechtigt sind.',
    },
    ai: {
      title: 'KI-Funktionen',
      body: 'KI-Vorschläge können falsch oder unvollständig sein. Prüfen Sie jeden Vorschlag, bevor Sie ihn verwenden, und geben Sie keine Fähigkeiten oder Erfahrungen an, die Sie nicht haben. Sie entscheiden, was in Ihre Dokumente kommt.',
    },
    use: {
      title: 'Zulässige Nutzung',
      unlawful:
        'Keine rechtswidrigen, irreführenden, hasserfüllten oder rechtsverletzenden Inhalte.',
      abuse: 'Keine Versuche, den Dienst zu stören, zu überlasten oder seine Limits zu umgehen.',
      automated: 'Keine automatisierten Registrierungen und kein Scraping.',
      suspend: 'Wir können Konten sperren, die gegen diese Regeln verstoßen.',
    },
    availability: {
      title: 'Verfügbarkeit',
      body: 'Der Dienst läuft auf kostenlosen Hosting-Tarifen. Nach einer Ruhephase kann der Start langsam sein, und der Dienst ist zeitweise möglicherweise nicht verfügbar. Bewahren Sie von wichtigen Dokumenten eigene Kopien auf (PDF-Downloads).',
    },
    liability: {
      title: 'Haftung',
      body: 'Der Dienst wird in der vorliegenden Form bereitgestellt. Soweit gesetzlich zulässig, haften wir nicht für mittelbare Schäden oder entgangene Chancen. Diese Bedingungen schränken keine Rechte ein, die Ihnen als Verbraucher gesetzlich zustehen.',
    },
    changes: {
      title: 'Änderungen und Beendigung',
      body: 'Wir können diese Bedingungen aktualisieren und informieren Sie über wesentliche Änderungen im Voraus. Sie können die Nutzung des Dienstes jederzeit beenden. Unsere <privacy>Datenschutzerklärung</privacy> erklärt, wie wir personenbezogene Daten verarbeiten.',
    },
  },
}
