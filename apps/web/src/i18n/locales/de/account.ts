import type { Messages } from '@/i18n/types'

export const account: Messages['account'] = {
  title: 'Konto',
  signedInAs: 'Angemeldet als {{email}}.',
  profile: {
    title: 'Profil',
    name: 'Name',
    email: 'E-Mail',
  },
  password: {
    title: 'Passwort ändern',
    current: 'Aktuelles Passwort',
    new: 'Neues Passwort',
    hint: 'Auf allen anderen Browsern, in denen Sie angemeldet sind, werden Sie abgemeldet.',
    submit: 'Passwort ändern',
    changed: 'Passwort geändert',
  },
  delete: {
    title: 'Konto löschen',
    text: 'Löscht Ihr Konto mit allen Lebensläufen, Anschreiben, gespeicherten Stellen, hochgeladenen Bildern und Freigabelinks. Das kann nicht rückgängig gemacht werden.',
    confirmPassword: 'Geben Sie zur Bestätigung Ihr Passwort ein',
    submit: 'Mein Konto löschen',
    open: 'Konto löschen…',
  },
}
