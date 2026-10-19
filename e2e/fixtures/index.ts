/* eslint-disable no-empty-pattern -- Playwright reads a fixture's dependencies from its first argument */
import { CvEditorPage } from '../pages/editor/CvEditorPage'
import { LetterEditorPage, ResignationEditorPage } from '../pages/editor/LetterEditorPages'
import { expect, PASSWORD, test as base } from './base'

export interface Account {
  email: string
  password: string
  name: string
}

interface SignedInFixtures {
  /** A fresh account, already signed in (the session cookie is in the browser context). */
  account: Account
  /** The signed-in account's name, to set per test or file: `test.use({ accountName: 'Георги' })`. */
  accountName: string
  /** The title of the CV that `cvEditor` creates. */
  cvTitle: string
  /** A signed-in user with an example designer CV (template Creative) open in the editor. */
  cvEditor: CvEditorPage
  /** Makes the editors of the other kinds for a page that is already on their address. */
  letterEditor: (page: import('@playwright/test').Page) => LetterEditorPage
  resignationEditor: (page: import('@playwright/test').Page) => ResignationEditorPage
}

let counter = 0

/**
 * The `test` most specs use: everything from `./base`, plus a signed-in account and an example CV.
 * A test only gets an account if it asks for one (`account`, `cvEditor`), so tests of signing up
 * and signing in start with nobody signed in.
 */
export const test = base.extend<SignedInFixtures>({
  accountName: ['Test User', { option: true }],
  cvTitle: ['Designer CV', { option: true }],

  account: async ({ page, api, accountName }, use) => {
    const email = `e2e-${Date.now()}-${++counter}-${Math.floor(Math.random() * 1e6)}@example.com`
    await api.register(email, PASSWORD, accountName)
    // People can close the "confirm your email" toast; these tests start with it closed so it
    // does not cover buttons in the corner (auth.spec checks the reminder itself).
    await page.addInitScript(() => sessionStorage.setItem('cv-verify-dismissed', '1'))
    await use({ email, password: PASSWORD, name: accountName })
  },

  cvEditor: async ({ account, newCv, cvTitle }, use) => {
    void account
    await use(await newCv.createExample({ title: cvTitle }))
  },

  letterEditor: async ({}, use) => use((page) => new LetterEditorPage(page)),
  resignationEditor: async ({}, use) => use((page) => new ResignationEditorPage(page)),
})

export { expect, PASSWORD }
