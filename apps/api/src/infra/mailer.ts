import { appendFile } from 'node:fs/promises'

export interface Email {
  to: string
  subject: string
  text: string
}

/** Sends email. A real service (Brevo, Resend, …) implements this at deployment. */
export interface Mailer {
  send: (email: Email) => Promise<void>
  /** False when emails only go to the log, so nobody actually receives them. */
  delivers: boolean
}

/**
 * Development mailer: prints the email to the API log, so a reset or
 * verification link can be copied from the terminal.
 */
export function createLogMailer(log: (message: string) => void = console.info): Mailer {
  return {
    delivers: false,
    async send({ to, subject, text }) {
      log(`\n--- Email to ${to}: ${subject} ---\n${text}\n---`)
    },
  }
}

/**
 * Browser-test mailer: appends each email to a file as one JSON line, so a test
 * running in another process can read the links the API would have sent.
 */
export function createFileMailer(path: string): Mailer {
  return {
    delivers: true,
    async send(email) {
      await appendFile(path, `${JSON.stringify(email)}\n`)
    },
  }
}

/** Test mailer: keeps the emails so tests can read them. */
export function createMemoryMailer(): Mailer & { outbox: Email[] } {
  const outbox: Email[] = []
  return {
    outbox,
    delivers: true,
    async send(email) {
      outbox.push(email)
    },
  }
}

interface BrevoOptions {
  apiKey: string
  /** A sender address verified in Brevo. */
  from: { email: string; name: string }
  fetch?: typeof fetch
}

/** Sends through Brevo's transactional email API (free: 300 emails a day). */
export function createBrevoMailer({ apiKey, from, fetch: doFetch = fetch }: BrevoOptions): Mailer {
  return {
    delivers: true,
    async send({ to, subject, text }) {
      const response = await doFetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ sender: from, to: [{ email: to }], subject, textContent: text }),
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) {
        throw new Error(
          `Brevo answered ${response.status}: ${(await response.text()).slice(0, 300)}`,
        )
      }
    },
  }
}
