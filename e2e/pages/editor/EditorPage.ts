import { expect, type Locator, type Page } from '@playwright/test'
import { BasePage } from '../BasePage'
import { ShareDialog } from '../components/ShareDialog'
import {
  AssistantPanel,
  CheckTailorPanel,
  DesignFontPanel,
  FixMistakesPanel,
  TemplatesPanel,
} from '../components/EditorPanels'

/**
 * The editor shell the three document kinds share: the top bar and tools, the save status,
 * the side panels, and the page being edited. CvEditorPage, LetterEditorPage and
 * ResignationEditorPage add the fields of their own kind.
 */
export abstract class EditorPage extends BasePage {
  /** The accessible name of the document being edited: "CV", "Cover letter"... */
  protected abstract readonly documentName: string
  /** The URL folder of the kind: "cvs", "cover-letters", "resignations". */
  protected abstract readonly folder: string

  readonly templates = new TemplatesPanel(this.page)
  readonly designFont = new DesignFontPanel(this.page)
  readonly fixMistakes = new FixMistakesPanel(this.page)
  readonly checkTailor = new CheckTailorPanel(this.page)
  readonly assistant = new AssistantPanel(this.page)
  readonly share = new ShareDialog(this.page)

  protected route() {
    return `/${this.folder}`
  }

  /** The document id, from the address. */
  get id(): string {
    return new URL(this.page.url()).pathname.split('/')[2]!
  }

  /** The API path of this document, e.g. `/api/cvs/<id>`. */
  get apiPath(): string {
    return `/api/${this.folder}/${this.id}`
  }

  /** Opens the editor for an existing document. */
  async openDocument(id: string) {
    await this.page.goto(`/${this.folder}/${id}/edit`)
    await this.document().waitFor()
    return this
  }

  async openPreview() {
    await this.page.goto(`/${this.folder}/${this.id}/preview`)
    await this.document().waitFor()
  }

  async reload() {
    await this.page.reload()
    await this.document().waitFor()
  }

  /** The page(s) of the document, as the editor draws them. */
  document(): Locator {
    return this.page.getByRole('document', { name: this.documentName })
  }

  /** The document's first printed page (one sheet of paper). */
  firstPage(): Locator {
    return this.page.locator('[data-cv-page], [data-letter-page]').first()
  }

  // --- Saving ----------------------------------------------------------------------

  savedStatus(): Locator {
    return this.page.getByText('Saved', { exact: true })
  }

  async expectSaved(timeout = 15_000) {
    await expect(this.savedStatus()).toBeVisible({ timeout })
  }

  notSavedStatus(): Locator {
    return this.page.getByText(/^Not saved/)
  }

  async expectNotSaved(timeout = 15_000) {
    await expect(this.notSavedStatus()).toBeVisible({ timeout })
  }

  // --- Typing ----------------------------------------------------------------------

  /** Clicks a field and replaces its text. (`Ctrl+A` selects the field, not the page.) */
  async replaceText(field: Locator, text: string) {
    await field.click()
    await this.page.keyboard.press('ControlOrMeta+a')
    await this.page.keyboard.type(text)
  }

  /**
   * Clicks a field and types after its last character. `Ctrl+End`, not `End`: `End` stops at the
   * end of the visual line the click landed on, so on wrapped text the typing lands mid-sentence.
   */
  async typeAtEnd(field: Locator, text: string) {
    await field.click()
    await this.page.keyboard.press('ControlOrMeta+End')
    await this.page.keyboard.type(text)
  }

  // --- Tools and panels ------------------------------------------------------------

  /** A button of the top bar or the bottom toolbar: "Templates", "Design & Font", "Fix Mistakes"... */
  tool(name: string): Locator {
    return this.page.getByRole('button', { name }).first()
  }

  async openTemplates() {
    await this.tool('Templates').click()
    return this.templates
  }

  async openDesignFont() {
    await this.tool('Design & Font').click()
    return this.designFont
  }

  async openFixMistakes() {
    await this.tool('Fix Mistakes').click()
    return this.fixMistakes
  }

  async openCheckTailor() {
    await this.tool('Check & Tailor').click()
    return this.checkTailor
  }

  async openAssistant() {
    await this.tool('AI Assistant').click()
    return this.assistant
  }

  async downloadPdf() {
    await this.page.getByRole('button', { name: 'Download PDF' }).click()
  }

  zoomControls(): Locator {
    return this.page.getByRole('group', { name: 'Zoom controls' })
  }

  // --- Phone layout ----------------------------------------------------------------

  editorTools(): Locator {
    return this.page.getByRole('navigation', { name: 'Editor tools' })
  }

  async openMoreMenu() {
    await this.page.getByRole('button', { name: 'More' }).click()
  }

  // --- Conflicts -------------------------------------------------------------------

  conflictMessage(kind: 'CV' | 'cover letter' | 'resignation letter' = 'CV'): Locator {
    return this.page.getByText(
      `This ${kind} was changed in another tab or window. Your latest edits are not saved yet.`,
    )
  }

  async loadOtherVersion() {
    await this.page.getByRole('button', { name: 'Load the other version' }).click()
  }

  keepMyVersionButton(): Locator {
    return this.page.getByRole('button', { name: 'Keep my version' })
  }

  async keepMyVersion() {
    await this.keepMyVersionButton().click()
  }

  /** The same editor in another browser tab of the same signed-in browser. */
  async inAnotherTab(newPage: Page): Promise<this> {
    const Same = this.constructor as new (page: Page) => this
    await newPage.addInitScript(() => sessionStorage.setItem('cv-verify-dismissed', '1'))
    const other = new Same(newPage)
    await newPage.goto(this.page.url())
    await other.document().waitFor()
    return other
  }
}
