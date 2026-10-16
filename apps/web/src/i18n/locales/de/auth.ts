import type { Messages } from '@/i18n/types'

export const auth: Messages['auth'] = {
  email: 'E-Mail',
  password: 'Passwort',
  newPassword: 'Neues Passwort',
  signIn: 'Anmelden',
  signingIn: 'Anmeldung läuft…',
  signOut: 'Abmelden',
  accountTitle: 'Konto',
  menu: 'Kontomenü',
  accountSettings: 'Kontoeinstellungen',
  login: {
    noAccount: 'Noch kein Konto?',
    createOne: 'Konto erstellen',
    forgot: 'Passwort vergessen?',
  },
  register: {
    title: 'Konto erstellen',
    description: 'Kostenlos: bis zu 20 Lebensläufe mit je 30 Versionen.',
    haveAccount: 'Sie haben bereits ein Konto?',
    nameOptional: 'Name (optional)',
    passwordHint: 'Mindestens {{min}} Zeichen. Ein paar kurze Wörter eignen sich gut.',
    consent:
      'Mit der Kontoerstellung akzeptieren Sie die <terms>Nutzungsbedingungen</terms> und die <privacy>Datenschutzerklärung</privacy>.',
    submit: 'Konto erstellen',
    submitting: 'Konto wird erstellt…',
  },
  forgot: {
    title: 'Passwort vergessen?',
    description:
      'Geben Sie Ihre E-Mail-Adresse ein, wir senden Ihnen einen Link zum Festlegen eines neuen Passworts.',
    back: 'Zurück zur Anmeldung',
    sent: 'Falls ein Konto für <strong>{{email}}</strong> existiert, ist ein Link zum Zurücksetzen unterwegs. Er ist eine Stunde lang gültig.',
    submit: 'Link senden',
    submitting: 'Wird gesendet…',
  },
  reset: {
    incompleteTitle: 'Der Link zum Zurücksetzen ist unvollständig',
    incompleteText:
      'Öffnen Sie den Link aus der E-Mail erneut oder <link>fordern Sie einen neuen an</link>.',
    title: 'Neues Passwort festlegen',
    done: 'Ihr Passwort wurde geändert. Melden Sie sich mit dem neuen an.',
    hint: 'Mindestens {{min}} Zeichen.',
    askNew: 'Neuen Link anfordern',
    submit: 'Passwort ändern',
    submitting: 'Wird gespeichert…',
  },
  verify: {
    banner:
      'Bitte bestätigen Sie Ihre E-Mail-Adresse: Wir haben einen Link an <strong>{{email}}</strong> gesendet.',
    resent: 'Ein neuer Link ist unterwegs.',
    resend: 'Erneut senden',
    title: 'E-Mail-Adresse bestätigen',
    goToApp: 'Zur App',
    incomplete: 'Dieser Link ist unvollständig. Öffnen Sie den Link aus der E-Mail erneut.',
    confirming: 'Wird bestätigt…',
    failed:
      '{{message}}. Melden Sie sich an und fordern Sie über den Hinweis oben einen neuen Link an.',
    done: 'Ihre E-Mail-Adresse ist bestätigt. Vielen Dank!',
  },
}
