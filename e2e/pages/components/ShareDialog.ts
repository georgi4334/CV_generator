import { expect, type Locator, type Page } from '@playwright/test'

/** The "Share link" dialog of the editor: turn the link on, hide personal details. */
export class ShareDialog {
  constructor(private readonly page: Page) {}

  dialog(): Locator {
    return this.page.getByRole('dialog')
  }

  private linkSwitch() {
    return this.dialog().getByRole('switch', { name: 'Share a read-only link' })
  }

  private hideSwitch() {
    return this.dialog().getByRole('switch', { name: 'Hide my personal details' })
  }

  async open() {
    await this.page.getByRole('button', { name: 'Share link' }).click()
    return this
  }

  /** Turns the link on and returns it. */
  /** Switches the link off again (the dialog must be open). */
  async disable() {
    await expect(this.linkSwitch()).toBeChecked()
    await this.linkSwitch().click()
    await expect(this.linkSwitch()).not.toBeChecked()
  }

  async enable(): Promise<string> {
    await this.linkSwitch().click()
    const link = await this.dialog().getByRole('textbox').inputValue()
    expect(link).toContain('/s/')
    return link
  }

  async hidePersonalDetails() {
    await this.hideSwitch().click()
    await expect(this.hideSwitch()).toBeChecked()
  }

  async close() {
    await this.page.keyboard.press('Escape')
    await expect(this.dialog()).toHaveCount(0)
  }

  /** Open the dialog, turn the link on (and optionally hide details), close it; returns the link. */
  async shareWith({ hidePersonal = false } = {}): Promise<string> {
    await this.open()
    const link = await this.enable()
    if (hidePersonal) await this.hidePersonalDetails()
    await this.close()
    return link
  }

  /** For a link that is already on: open the dialog, hide details, close it. */
  async hideDetailsOfSharedLink() {
    await this.open()
    await this.hidePersonalDetails()
    await this.close()
  }
}
