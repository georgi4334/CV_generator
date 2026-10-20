import photos from '../data/photos.json' with { type: 'json' }
import rules from '../data/signupRules.json' with { type: 'json' }
import { expect, test } from '../fixtures'

// Data-driven: one test per row of a JSON file, so adding a case is adding a line of data.

test.describe('sign-up form refuses bad input before asking the server', () => {
  for (const { case: label, password } of rules.invalidPasswords) {
    test(`a password that is ${label}`, async ({ page, registerPage }) => {
      await registerPage.open()
      await registerPage.register({ email: 'ada@example.com', password })
      await expect(page).toHaveURL(/\/register$/)
      const field = page.getByLabel(/^Password/)
      expect(await field.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false)
    })
  }

  for (const { case: label, email } of rules.invalidEmails) {
    test(`an email that is ${label}`, async ({ page, registerPage }) => {
      await registerPage.open()
      await registerPage.register({ email, password: rules.validPassword })
      await expect(page).toHaveURL(/\/register$/)
      const field = page.getByLabel('Email')
      expect(await field.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false)
    })
  }
})

test.describe('the photo picker refuses files that are not usable photos', () => {
  for (const { case: label, name, mimeType, bytes, message } of photos.rejected) {
    test(`${label}`, async ({ cvEditor }) => {
      const design = await cvEditor.openDesignFont()
      const chooser = cvEditor.page.waitForEvent('filechooser')
      await cvEditor.page.getByRole('button', { name: 'Upload photo' }).click()
      await (await chooser).setFiles({ name, mimeType, buffer: Buffer.alloc(bytes, 1) })

      await expect(cvEditor.notifications()).toContainText(`Photo not uploaded: ${message}`)
      // Nothing was attached, and the CV is unchanged.
      await expect(design.panel().getByRole('button', { name: 'Change photo' })).toHaveCount(0)
      const record = await cvEditor.page.request.get(cvEditor.apiPath)
      expect((await record.json()).document.header.photoUrl).toBeNull()
    })
  }
})
