import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'
import { AccountDrawer } from './components/AccountDrawer'
import { CvEditorPage } from './editor/CvEditorPage'
import { LetterEditorPage, ResignationEditorPage } from './editor/LetterEditorPages'

/** `/`, the dashboard. */
export class DashboardPage extends BasePage {
  protected route() {
    return '/'
  }
  readonly account = new AccountDrawer(this.page)
}

/** `/documents/:tab`: the list of CVs, cover letters and resignation letters. */
export class DocumentsPage extends BasePage {
  protected route() {
    return '/documents/all'
  }
  readonly account = new AccountDrawer(this.page)

  async openTab(tab: 'all' | 'cvs' | 'cover-letters' | 'resignations') {
    return this.open(`/documents/${tab}`)
  }

  /** The "Actions for <name>" button of a row (the first row when no name is given). */
  rowActions(name?: string | RegExp): Locator {
    return this.page
      .getByRole('button', { name: name ? new RegExp(`^Actions for.*${name}`) : /^Actions for/ })
      .first()
  }

  async openRowMenu(name?: string | RegExp) {
    await this.rowActions(name).click()
  }

  menuItem(name: string | RegExp): Locator {
    return this.page.getByRole('menuitem', { name })
  }

  async openCreateMenu() {
    await this.page.getByRole('button', { name: 'Create new' }).click()
  }

  /** "Create new" → "Resignation letter" (or "CV", "Cover letter"). */
  async createViaMenu(kind: string) {
    await this.openCreateMenu()
    await this.menuItem(kind).click()
  }

  /** Row menu → Delete → confirm in the dialog. */
  async deleteFirst() {
    await this.openRowMenu()
    await this.menuItem('Delete').click()
    await this.page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  }

  skipLink(): Locator {
    return this.page.getByRole('link', { name: 'Skip to content' })
  }

  /** A link of the list: a document (by its title) or the "Create new..." link of an empty tab. */
  link(name: RegExp | string): Locator {
    return this.page.getByRole('link', { name })
  }

  async expectListed(title: string) {
    await expect(this.page.getByText(title)).toBeVisible()
  }
}

/** `/jobs`: the saved jobs tracker. */
export class JobsPage extends BasePage {
  protected route() {
    return '/jobs'
  }

  /** Opens the "Add job" drawer from the address (`?add=1`). */
  async openAddForm() {
    await this.page.goto('/jobs?add=1')
    await this.page.getByLabel('Position').waitFor()
  }

  async addJob({
    position,
    company,
    description,
  }: {
    position: string
    company: string
    description?: string
  }) {
    await this.page.getByLabel('Position').fill(position)
    await this.page.getByLabel('Company').fill(company)
    if (description) await this.page.getByLabel('Job description').fill(description)
    await this.page
      .getByRole('button', { name: /^(Add job|Save)$/ })
      .last()
      .click()
  }

  /** A table row on wide screens, a card on phones: find the job by its text, not a button name. */
  job(position: string): Locator {
    return this.page.getByText(position, { exact: true }).first()
  }
}

/** `/cvs/new`: the "Create new CV" wizard (here by its address, with a profession and template). */
export class NewCvPage extends BasePage {
  protected route() {
    return '/cvs/new'
  }

  /** Creates a CV from a profession's example in a template and opens it in the editor. */
  async createExample({
    title = 'Designer CV',
    profession = 'designer',
    template = 'creative',
  }: { title?: string; profession?: string; template?: string } = {}) {
    await this.page.goto(`/cvs/new?profession=${profession}&template=${template}`)
    await this.page.getByRole('textbox', { name: 'CV name' }).fill(title)
    await this.page.getByRole('button', { name: 'Create CV' }).click()
    await this.page.waitForURL(/\/cvs\/[^/]+\/edit$/)
    const editor = new CvEditorPage(this.page)
    await editor.document().waitFor()
    return editor
  }

  /** Opens the wizard on its template step for a profession. */
  async openWizard(profession = 'designer') {
    await this.page.goto(`/cvs/new?profession=${profession}`)
    await this.templateButtons().first().waitFor()
  }

  /** The template buttons of the wizard's template step. */
  templateButtons(): Locator {
    return this.page.locator('.grid-templates button')
  }
}

/** `/cover-letters/new` */
export class NewLetterPage extends BasePage {
  protected route() {
    return '/cover-letters/new'
  }

  async createFromCv() {
    await this.open()
    const create = this.page.getByRole('button', { name: 'Create cover letter' })
    await expect(create).toBeEnabled()
    await create.click()
    await this.page.waitForURL(/\/cover-letters\/[^/]+\/edit$/)
    const editor = new LetterEditorPage(this.page)
    await editor.document().waitFor()
    return editor
  }
}

/** `/resignations/new` */
export class NewResignationPage extends BasePage {
  protected route() {
    return '/resignations/new'
  }

  /** Fills the form (which must already be open) without submitting it. */
  async fill({
    fromCv,
    company,
    contact,
  }: {
    fromCv?: string
    company?: string
    contact?: string
  }) {
    if (fromCv) await this.page.getByLabel(/Fill in from a CV/).selectOption({ label: fromCv })
    if (company) await this.page.getByRole('textbox', { name: 'Company name' }).fill(company)
    if (contact) await this.page.getByRole('textbox', { name: 'Contact name' }).fill(contact)
  }

  /** The sender's name field (filled from the chosen CV). */
  senderName(): Locator {
    return this.page.getByRole('textbox', { name: 'Name', exact: true })
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Create resignation letter' }).click()
    await this.page.waitForURL(/\/resignations\/[^/]+\/edit$/)
    const editor = new ResignationEditorPage(this.page)
    await editor.document().waitFor()
    return editor
  }

  /** Opens the form, fills it and creates the letter. */
  async create(values: { fromCv?: string; company?: string; contact?: string } = {}) {
    await this.open()
    await this.fill(values)
    return this.submit()
  }
}

/** `/s/:slug`: what a visitor sees on a share link. */
export class SharedDocumentPage extends BasePage {
  protected route() {
    return '/'
  }

  /** Opens the link and returns the API's answer, i.e. what reached the visitor's browser. */
  async openLink(link: string): Promise<string> {
    const answer = this.page.waitForResponse((r) => r.url().includes('/api/shared/'))
    await this.page.goto(link)
    return (await answer).text()
  }

  document(name = 'CV'): Locator {
    return this.page.getByRole('document', { name })
  }

  hiddenNotice(): Locator {
    return this.page.getByText('The owner hid their personal details on this link.')
  }
}
