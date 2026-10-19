import type { Locator } from '@playwright/test'
import { EditorPage } from './EditorPage'

/** The CV editor (`/cvs/:id/edit`). The example CVs start with a summary that the tests edit. */
export class CvEditorPage extends EditorPage {
  protected readonly documentName = 'CV'
  protected readonly folder = 'cvs'

  /** The document under any interface language (its name is translated: CV, Lebenslauf...). */
  documentInAnyLanguage(): Locator {
    return this.page.getByRole('document', { name: /CV|Lebenslauf|Автобиография/ })
  }

  nameField(): Locator {
    return this.page.getByRole('textbox', { name: 'Your Name' })
  }

  /** The example designer CV's summary paragraph (it starts "Product designer focused…"). */
  summary(): Locator {
    return this.document().getByText(/^Product designer focused/)
  }

  async setName(name: string) {
    await this.replaceText(this.nameField(), name)
  }

  async typeInSummary(text: string) {
    await this.typeAtEnd(this.summary(), text)
  }

  /** The first job-title field of the document (used to reach the entry toolbar by keyboard). */
  firstEntryTitle(): Locator {
    return this.document()
      .getByRole('textbox', { name: /^Job title|Title/ })
      .first()
  }

  dateButtons(): Locator {
    return this.page.getByRole('button', { name: /, edit dates$/ })
  }
}
