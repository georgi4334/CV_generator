import type { Locator } from '@playwright/test'
import { EditorPage } from './EditorPage'

/** The cover letter editor (`/cover-letters/:id/edit`). */
export class LetterEditorPage extends EditorPage {
  protected readonly documentName = 'Cover letter'
  protected readonly folder = 'cover-letters'

  recipientName(): Locator {
    return this.document().getByRole('textbox', { name: "Hiring manager's name" })
  }

  recipientCompany(): Locator {
    return this.document().getByRole('textbox', { name: 'Company Name' })
  }

  /** The greeting field; its accessible name is its current text. */
  greeting(current = 'Dear Hiring Manager,'): Locator {
    return this.document().getByRole('textbox', { name: current })
  }

  /** The first paragraph, which hints at an opening. */
  opening(): Locator {
    return this.document().getByRole('textbox', { name: /^Opening/ })
  }
}

/** The resignation letter editor (`/resignations/:id/edit`). */
export class ResignationEditorPage extends EditorPage {
  protected readonly documentName = 'Resignation letter'
  protected readonly folder = 'resignations'

  opening(): Locator {
    return this.document().getByRole('textbox', { name: /^Opening/ })
  }
}
