import { readFile } from 'node:fs/promises'
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { MAIL_FILE } from '../paths'
import { SharedDocumentPage } from '../pages/AppPages'

/** A thin client for the app's API, using the browser's session cookie (`page.request`). */
export class ApiClient {
  constructor(private readonly page: Page) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T = any>(path: string): Promise<T> {
    const res = await this.page.request.get(path)
    expect(res.status(), `GET ${path}: ${await res.text()}`).toBe(200)
    return res.json()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async post<T = any>(path: string, data?: object): Promise<T> {
    const res = await this.page.request.post(path, { data })
    expect(res.ok(), `POST ${path}: ${await res.text()}`).toBe(true)
    return res.status() === 204 ? (undefined as T) : res.json()
  }

  async delete(path: string) {
    const res = await this.page.request.delete(path)
    expect([200, 204, 404], `DELETE ${path}: ${await res.text()}`).toContain(res.status())
  }

  async register(email: string, password: string, name?: string) {
    const res = await this.page.request.post('/api/auth/register', {
      data: { email, password, ...(name ? { name } : {}) },
    })
    expect(res.status(), await res.text()).toBe(201)
  }

  /**
   * Changes a saved document through the API (GET, edit a copy, PATCH with the revision):
   * quicker than typing, and lets a test start from a long or unusual document.
   */
  async changeDocument(
    path: string,
    change: (document: Record<string, any>) => void, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    const record = await this.get(path)
    const document = structuredClone(record.document)
    change(document)
    const res = await this.page.request.patch(path, {
      data: { revision: record.revision, document },
    })
    expect(res.status(), await res.text()).toBe(200)
  }
}

export interface SentMail {
  to: string
  subject: string
  text: string
}

/** The emails the API "sent" during this run (its test mailer writes them to a file). */
export class Mailbox {
  async sent(to: string): Promise<SentMail[]> {
    const raw = await readFile(MAIL_FILE, 'utf8').catch(() => '')
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as SentMail)
      .filter((mail) => mail.to === to)
  }

  /** The link in the newest email to an address whose text matches, waiting for it to arrive. */
  async linkFor(to: string, link: RegExp, count = 1): Promise<string> {
    let found = ''
    await expect
      .poll(
        async () => {
          const mails = (await this.sent(to)).filter((mail) => link.test(mail.text))
          found = mails.length >= count ? (mails.at(-1)!.text.match(link)?.[0] ?? '') : ''
          return found
        },
        { message: `an email to ${to} with a link matching ${link}`, timeout: 15_000 },
      )
      .not.toBe('')
    return found
  }

  confirmationLink(to: string, count = 1) {
    return this.linkFor(to, /https?:\/\/\S+\/verify-email\?token=\S+/, count)
  }

  resetLink(to: string) {
    return this.linkFor(to, /https?:\/\/\S+\/reset-password\?token=\S+/)
  }
}

/**
 * "Download PDF" opens the browser's print dialog, which a test cannot use. `install()` replaces
 * `window.print`; `capture()` waits until the app asked to print and then makes the PDF itself
 * with `page.pdf()` from the same print layout.
 */
export class Printing {
  constructor(private readonly page: Page) {}

  async install() {
    const install = () => {
      const w = window as unknown as { __printed?: number }
      w.__printed = 0
      window.print = () => {
        w.__printed = (w.__printed ?? 0) + 1
      }
    }
    // For pages opened later, and for the one that is open now.
    await this.page.addInitScript(install)
    await this.page.evaluate(install).catch(() => undefined)
  }

  /** Resolves once the app has built its print layout and called `window.print()`. */
  async printed() {
    await this.page.waitForFunction(
      () => ((window as unknown as { __printed?: number }).__printed ?? 0) > 0,
      null,
      { timeout: 20_000 },
    )
  }

  /** The printed document as a PDF (Chromium only). */
  async capture(): Promise<Buffer> {
    await this.printed()
    return this.page.pdf({ preferCSSPageSize: true, printBackground: true })
  }
}

/** Someone who is not signed in, in a fresh browser context: opens share links. */
export class Visitors {
  private readonly contexts: BrowserContext[] = []

  constructor(private readonly browser: Browser) {}

  /** A new signed-out page, and what it shows for a share link. */
  async open(link: string) {
    const context = await this.browser.newContext()
    this.contexts.push(context)
    const page = await context.newPage()
    const shared = new SharedDocumentPage(page)
    const body = await shared.openLink(link)
    return { page, shared, body }
  }

  async closeAll() {
    await Promise.all(this.contexts.map((context) => context.close()))
  }
}
