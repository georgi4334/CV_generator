import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

/**
 * What every screen shares: navigation, the page heading, the header controls (language,
 * theme, account) and the two checks most tests end with (accessibility, no sideways scroll).
 * Page objects hold the locators and the actions; the tests hold the assertions about
 * behaviour. Keep selectors here, so a changed label is fixed in one place.
 */
export abstract class BasePage {
  /** The path of the screen, for `open()`. */
  protected abstract route(): string

  constructor(readonly page: Page) {}

  async open(path: string = this.route()) {
    await this.page.goto(path)
    await this.heading().waitFor()
    return this
  }

  /** The page's main heading (the first `h1`), or a named heading. */
  heading(name?: string | RegExp): Locator {
    return name
      ? this.page.getByRole('heading', { name })
      : this.page.getByRole('heading', { level: 1 }).first()
  }

  // --- Header controls -----------------------------------------------------------------

  languageSelect(): Locator {
    return this.page.getByRole('combobox', {
      name: /Interface language|Език на интерфейса|Sprache der Oberfläche/,
    })
  }

  async selectLanguage(code: 'en' | 'bg' | 'de') {
    await this.languageSelect().selectOption(code)
  }

  /** Opens the theme menu and picks one of System, Light, Dark. */
  async setTheme(choice: 'System' | 'Light' | 'Dark') {
    await this.page.getByRole('button', { name: /^Theme/ }).click()
    await this.page.getByRole('menuitemradio', { name: choice }).click()
  }

  accountButton(): Locator {
    return this.page.getByRole('button', { name: /^Account: / })
  }

  /** The toast region in the corner. */
  notifications(): Locator {
    return this.page.getByRole('region', { name: 'Notifications' })
  }

  // --- Checks every test may end with -------------------------------------------------------

  /** No serious or critical WCAG 2.1 AA violations (axe), once animations have settled. */
  async expectAccessible() {
    // Colours are only final once fades and slides have finished. Endless animations (the
    // loading shimmer) are skipped; cancelled ones count as done.
    await this.page.evaluate(() =>
      Promise.allSettled(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
          .map((a) => a.finished),
      ),
    )
    const results = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const serious = results.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => {
        const where = v.nodes
          .slice(0, 3)
          .map(
            (n) =>
              `\n    ${n.html.slice(0, 140)} → ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`,
          )
        return `${v.id}: ${v.help}${where.join('')}`
      })
    expect(serious, `accessibility on ${this.page.url()}`).toEqual([])
  }

  /** The page is no wider than the screen: nothing sticks out and scrolls sideways. */
  async expectNoSideScroll() {
    const { scroll, viewport } = await this.page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }))
    expect(scroll, `horizontal overflow on ${this.page.url()}`).toBeLessThanOrEqual(viewport)
  }

  async expectUrl(pattern: RegExp) {
    await expect(this.page).toHaveURL(pattern)
  }
}
