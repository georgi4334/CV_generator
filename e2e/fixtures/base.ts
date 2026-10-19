/* eslint-disable no-empty-pattern -- Playwright reads a fixture's dependencies from its first argument */
import { test as base, expect } from '@playwright/test'
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
  WelcomePage,
} from '../pages/AuthPages'
import {
  DashboardPage,
  DocumentsPage,
  JobsPage,
  NewCvPage,
  NewLetterPage,
  NewResignationPage,
} from '../pages/AppPages'
import { ApiClient, Mailbox, Printing, Visitors } from './helpers'

export const PASSWORD = 'correct horse battery'

interface Fixtures {
  /** The patterns `allowConsoleErrors` collects (internal). */
  allowedErrors: RegExp[]
  /** Browser errors the test expects (e.g. a 400 for a link used twice): `allowConsoleErrors(/status of 400/)`. */
  allowConsoleErrors: (pattern: RegExp) => void
  /** Errors the page logged; the test fails when any is left that was not allowed (automatic). */
  consoleErrors: string[]

  api: ApiClient
  mailbox: Mailbox
  printing: Printing
  visitors: Visitors

  loginPage: LoginPage
  registerPage: RegisterPage
  forgotPasswordPage: ForgotPasswordPage
  resetPasswordPage: ResetPasswordPage
  verifyEmailPage: VerifyEmailPage
  welcomePage: WelcomePage
  dashboard: DashboardPage
  documents: DocumentsPage
  jobs: JobsPage
  newCv: NewCvPage
  newLetter: NewLetterPage
  newResignation: NewResignationPage
}

/**
 * The base `test`: page objects, an API client, the mailbox, the print helper and visitors, with
 * no account. Specs that need a signed-in user import `test` from `./index` instead; the live
 * smoke tests build on this one with their own account.
 */
export const test = base.extend<Fixtures>({
  allowedErrors: async ({}, use) => use([]),
  allowConsoleErrors: async ({ allowedErrors }, use) =>
    use((pattern) => allowedErrors.push(pattern)),

  consoleErrors: [
    async ({ page, allowedErrors }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => {
        // A 401 is how the app learns nobody is signed in.
        if (m.type() === 'error' && !/status of 401/.test(m.text())) errors.push(m.text())
      })
      await use(errors)
      const unexpected = errors.filter((e) => !allowedErrors.some((pattern) => pattern.test(e)))
      expect(unexpected, 'browser errors').toEqual([])
    },
    { auto: true },
  ],

  api: async ({ page }, use) => use(new ApiClient(page)),
  mailbox: async ({}, use) => use(new Mailbox()),
  printing: async ({ page }, use) => use(new Printing(page)),
  visitors: async ({ browser }, use) => {
    const visitors = new Visitors(browser)
    await use(visitors)
    await visitors.closeAll()
  },

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  forgotPasswordPage: async ({ page }, use) => use(new ForgotPasswordPage(page)),
  resetPasswordPage: async ({ page }, use) => use(new ResetPasswordPage(page)),
  verifyEmailPage: async ({ page }, use) => use(new VerifyEmailPage(page)),
  welcomePage: async ({ page }, use) => use(new WelcomePage(page)),
  dashboard: async ({ page }, use) => use(new DashboardPage(page)),
  documents: async ({ page }, use) => use(new DocumentsPage(page)),
  jobs: async ({ page }, use) => use(new JobsPage(page)),
  newCv: async ({ page }, use) => use(new NewCvPage(page)),
  newLetter: async ({ page }, use) => use(new NewLetterPage(page)),
  newResignation: async ({ page }, use) => use(new NewResignationPage(page)),
})

export { expect }
