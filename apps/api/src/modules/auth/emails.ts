import type { Locale } from '@cv/shared'
import type { Email } from '../../infra/mailer'

/** Account emails in the user's interface language. */
const TEXTS: Record<
  Locale,
  {
    verify: { subject: string; lines: (link: string) => string[] }
    reset: { subject: string; lines: (link: string) => string[] }
  }
> = {
  en: {
    verify: {
      subject: 'Confirm your email address',
      lines: (link) => [
        'Welcome to CV Generator!',
        '',
        'Confirm your email address by opening this link:',
        link,
        '',
        'If you did not create an account, you can ignore this email.',
      ],
    },
    reset: {
      subject: 'Reset your password',
      lines: (link) => [
        'Someone asked to reset the password of your CV Generator account.',
        '',
        'Choose a new password by opening this link (valid for 1 hour):',
        link,
        '',
        'If this was not you, ignore this email: your password stays as it is.',
      ],
    },
  },
  bg: {
    verify: {
      subject: 'Потвърдете имейл адреса си',
      lines: (link) => [
        'Добре дошли в CV Generator!',
        '',
        'Потвърдете имейл адреса си, като отворите тази връзка:',
        link,
        '',
        'Ако не сте създавали профил, просто игнорирайте този имейл.',
      ],
    },
    reset: {
      subject: 'Смяна на паролата',
      lines: (link) => [
        'Получихме заявка за смяна на паролата на вашия профил в CV Generator.',
        '',
        'Изберете нова парола чрез тази връзка (валидна 1 час):',
        link,
        '',
        'Ако не сте били вие, игнорирайте този имейл: паролата ви остава същата.',
      ],
    },
  },
  de: {
    verify: {
      subject: 'Bestätigen Sie Ihre E-Mail-Adresse',
      lines: (link) => [
        'Willkommen bei CV Generator!',
        '',
        'Bestätigen Sie Ihre E-Mail-Adresse, indem Sie diesen Link öffnen:',
        link,
        '',
        'Wenn Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren.',
      ],
    },
    reset: {
      subject: 'Passwort zurücksetzen',
      lines: (link) => [
        'Jemand hat angefordert, das Passwort Ihres CV-Generator-Kontos zurückzusetzen.',
        '',
        'Wählen Sie über diesen Link ein neues Passwort (1 Stunde gültig):',
        link,
        '',
        'Falls Sie das nicht waren, ignorieren Sie diese E-Mail: Ihr Passwort bleibt unverändert.',
      ],
    },
  },
}

export function verificationEmail(to: string, locale: Locale, link: string): Email {
  const { subject, lines } = TEXTS[locale].verify
  return { to, subject, text: lines(link).join('\n') }
}

export function resetEmail(to: string, locale: Locale, link: string): Email {
  const { subject, lines } = TEXTS[locale].reset
  return { to, subject, text: lines(link).join('\n') }
}
