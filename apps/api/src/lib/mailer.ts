export interface Email {
  to: string
  subject: string
  text: string
}

/** Sends email. A real service (Brevo, Resend, …) implements this at deployment. */
export interface Mailer {
  send: (email: Email) => Promise<void>
}

/**
 * Development mailer: prints the email to the API log, so a reset or
 * verification link can be copied from the terminal.
 */
export function createLogMailer(log: (message: string) => void = console.info): Mailer {
  return {
    async send({ to, subject, text }) {
      log(`\n--- Email to ${to}: ${subject} ---\n${text}\n---`)
    },
  }
}

/** Test mailer: keeps the emails so tests can read them. */
export function createMemoryMailer(): Mailer & { outbox: Email[] } {
  const outbox: Email[] = []
  return {
    outbox,
    async send(email) {
      outbox.push(email)
    },
  }
}
