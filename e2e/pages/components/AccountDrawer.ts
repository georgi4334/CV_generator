import type { Locator, Page } from '@playwright/test'

/** The drawer that opens from the avatar: account menu, settings, theme, sign out. */
export class AccountDrawer {
  constructor(private readonly page: Page) {}

  /** The drawer itself (the dialog is named after the view that is open). */
  dialog(name?: string): Locator {
    return name ? this.page.getByRole('dialog', { name }) : this.page.getByRole('dialog')
  }

  async open() {
    await this.page.getByRole('button', { name: /^Account: / }).click()
    return this
  }

  async openSettings() {
    await this.page.getByRole('button', { name: /^Account settings/ }).click()
    return this
  }

  /** Menu → "AI key": the view where people add their own Gemini key. */
  async openAiKey() {
    await this.page.getByRole('button', { name: /^AI key/ }).click()
    return this
  }

  /** In the AI key view: types a key and saves it. */
  async saveAiKey(apiKey: string) {
    await this.page.getByLabel('API key', { exact: true }).fill(apiKey)
    await this.page.getByRole('button', { name: 'Check and save key' }).click()
  }

  async back() {
    await this.page.getByRole('button', { name: 'Back' }).click()
  }

  async close() {
    await this.page.getByRole('button', { name: 'Close' }).click()
  }

  /** The drawer's own Theme view: System, Light or Dark. */
  async setTheme(choice: 'System' | 'Light' | 'Dark') {
    await this.page.getByRole('button', { name: /^Theme/ }).click()
    await this.page.getByText(choice, { exact: true }).click()
  }

  async signOut() {
    await this.page.getByRole('button', { name: 'Sign out' }).click()
  }

  /** Account settings → "Delete account…" → type the password → confirm. */
  async deleteAccount(password: string) {
    const settings = this.dialog('Account settings')
    await settings.getByRole('button', { name: 'Delete account…' }).click()
    await settings.getByLabel('Password').last().fill(password)
    await settings.getByRole('button', { name: 'Delete my account' }).click()
  }
}
