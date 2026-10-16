import type { Messages } from '../../types'

export const errors: Messages['errors'] = {
  network_error: 'Der Server ist nicht erreichbar. Prüfen Sie Ihre Verbindung.',
  api_unreachable: 'Der Server startet gerade. Versuchen Sie es in einer Minute erneut.',
  database_unavailable:
    'Die Datenbank ist gerade nicht verfügbar. Bitte versuchen Sie es gleich noch einmal.',
  internal_error: 'Auf dem Server ist ein Fehler aufgetreten.',
  validation_error: 'Einige Angaben sind nicht gültig.',
  unauthorized: 'Melden Sie sich an, um fortzufahren.',
  forbidden: 'Dazu sind Sie nicht berechtigt.',
  forbidden_origin: 'Anfragen von dieser Website sind nicht erlaubt.',
  not_found: 'Nicht gefunden.',
  conflict: 'Dies wurde zwischenzeitlich an anderer Stelle geändert.',
  invalid_credentials: 'E-Mail oder Passwort ist falsch',
  email_taken: 'Mit dieser E-Mail-Adresse gibt es bereits ein Konto',
  too_many_requests: 'Zu viele Versuche. Bitte warten Sie etwas und versuchen Sie es erneut.',
  invalid_token: 'Dieser Link ist ungültig oder abgelaufen',
  wrong_password: 'Das Passwort ist nicht korrekt',
  plan_limit: 'Sie haben das Limit Ihres Tarifs erreicht.',
  file_too_large: 'Bilder dürfen höchstens 5 MB groß sein',
  unsupported_type: 'Nur PNG-, JPEG- und WebP-Bilder sind erlaubt',
  no_file: 'Wählen Sie ein Bild zum Hochladen.',
  ai_unavailable: 'Die KI-Funktionen sind auf diesem Server nicht eingerichtet.',
  ai_limit:
    'Sie haben alle KI-Anfragen für heute verbraucht. Das Limit wird um Mitternacht (UTC) zurückgesetzt.',
  ai_busy: 'Die KI ist gerade ausgelastet. Versuchen Sie es in einer Minute erneut.',
  ai_failed: 'Die KI konnte nicht antworten. Bitte versuchen Sie es erneut.',
  ai_blocked: 'Die KI hat diese Anfrage abgelehnt.',
  invalid_target: 'Wählen Sie aus, was geschrieben werden soll.',
}
