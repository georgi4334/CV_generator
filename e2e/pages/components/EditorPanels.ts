import { expect, type Locator, type Page } from '@playwright/test'

/** The Templates panel: templates grouped by the kind of work they suit. */
export class TemplatesPanel {
  constructor(private readonly page: Page) {}

  group(): Locator {
    return this.page.getByRole('group', { name: 'Templates' })
  }

  buttons(): Locator {
    return this.group().getByRole('button')
  }

  template(name: string | RegExp): Locator {
    return this.group().getByRole('button', { name })
  }

  section(name: string): Locator {
    return this.group().getByRole('region', { name })
  }

  async choose(name: string) {
    await this.template(name).click()
  }

  async expectSelected(name: string) {
    await expect(this.template(name)).toHaveAttribute('aria-pressed', 'true')
  }
}

/** The Design & Font panel (a side panel on desktop, a bottom sheet on phones). */
export class DesignFontPanel {
  constructor(private readonly page: Page) {}

  panel(): Locator {
    return this.page.getByRole('complementary', { name: 'Design & Font' })
  }

  async close() {
    await this.panel()
      .getByRole('button', { name: /^Close/ })
      .click()
    await expect(this.panel()).toHaveCount(0)
  }

  /** Offers a file to the photo picker, without waiting for the result. */
  async chooseFile(file: { name: string; mimeType: string; buffer: Buffer } | string) {
    const chooser = this.page.waitForEvent('filechooser')
    await this.page.getByRole('button', { name: 'Upload photo' }).click()
    await (await chooser).setFiles(file)
  }

  /** The "Change photo" button: there once a photo is attached. */
  changePhotoButton(): Locator {
    return this.panel().getByRole('button', { name: 'Change photo' })
  }

  /** Uploads an image through the photo picker and waits until it is attached. */
  async uploadPhoto(file: { name: string; mimeType: string; buffer: Buffer } | string) {
    await this.chooseFile(file)
    await this.page
      .getByRole('button', { name: 'Change photo' })
      .first()
      .waitFor({ timeout: 30_000 })
  }
}

/** Fix Mistakes: spelling and grammar suggestions. */
export class FixMistakesPanel {
  constructor(private readonly page: Page) {}

  panel(): Locator {
    return this.page.getByRole('complementary', { name: 'Fix Mistakes' })
  }

  async check() {
    await this.panel().getByRole('button', { name: 'Check spelling & grammar' }).click()
  }

  suggestion(text: string | RegExp): Locator {
    return this.panel().getByRole('listitem', { name: text })
  }

  suggestions(): Locator {
    return this.panel().getByRole('listitem')
  }

  async accept(text: string | RegExp) {
    await this.suggestion(text).getByRole('button', { name: 'Accept' }).click()
  }

  alert(): Locator {
    return this.panel().getByRole('alert')
  }
}

/** Check & Tailor: how well a CV matches a pasted job description. */
export class CheckTailorPanel {
  constructor(private readonly page: Page) {}

  panel(): Locator {
    return this.page.getByRole('complementary', { name: 'Check & Tailor' })
  }

  async checkMatch(jobDescription: string) {
    await this.panel().getByPlaceholder('Paste the full job description…').fill(jobDescription)
    await this.panel().getByRole('button', { name: 'Check match' }).click()
  }

  score(): Locator {
    return this.panel().getByLabel(/^Match score \d+%$/)
  }

  async scoreValue(): Promise<number> {
    const label = await this.score().getAttribute('aria-label')
    return Number(label!.match(/\d+/)![0])
  }

  async applyFirstSuggestion() {
    await this.panel().getByRole('button', { name: 'Apply', exact: true }).first().click()
  }
}

/** The AI Assistant: improve or write a text, then replace or insert the proposal. */
export class AssistantPanel {
  constructor(private readonly page: Page) {}

  panel(): Locator {
    return this.page.getByRole('complementary', { name: 'AI Assistant' })
  }

  async run() {
    await this.panel()
      .getByRole('button', { name: /^(Improve|Write)$/ })
      .click()
  }

  proposal(): Locator {
    return this.panel().getByRole('region', { name: 'Proposal' })
  }

  async accept() {
    await this.panel()
      .getByRole('button', { name: /^(Replace|Insert)$/ })
      .click()
  }

  quota(): Locator {
    return this.panel().getByText(/AI requests left today/)
  }
}
