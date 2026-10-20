import photos from '../data/photos.json' with { type: 'json' }
import rules from '../data/signupRules.json' with { type: 'json' }
import { expect, test } from '../fixtures'

// Data-driven: one test per row of a JSON file, so adding a case is adding a line of data.

test.describe('sign-up form refuses bad input before asking the server', () => {
  for (const { case: label, password } of rules.invalidPasswords) {
    test(`a password that is ${label}`, async ({ registerPage }) => {
      await registerPage.open()
      await registerPage.register({ email: 'ada@example.com', password })
      await registerPage.expectUrl(/\/register$/)
      expect(await registerPage.isAccepted(registerPage.passwordField())).toBe(false)
    })
  }

  for (const { case: label, email } of rules.invalidEmails) {
    test(`an email that is ${label}`, async ({ registerPage }) => {
      await registerPage.open()
      await registerPage.register({ email, password: rules.validPassword })
      await registerPage.expectUrl(/\/register$/)
      expect(await registerPage.isAccepted(registerPage.emailField())).toBe(false)
    })
  }
})

test.describe('the photo picker refuses files that are not usable photos', () => {
  for (const { case: label, name, mimeType, bytes, message } of photos.rejected) {
    test(`${label}`, async ({ cvEditor, api }) => {
      const design = await cvEditor.openDesignFont()
      await design.chooseFile({ name, mimeType, buffer: Buffer.alloc(bytes, 1) })

      await expect(cvEditor.notifications()).toContainText(`Photo not uploaded: ${message}`)
      // Nothing was attached, and the CV is unchanged.
      await expect(design.changePhotoButton()).toHaveCount(0)
      expect((await api.get(cvEditor.apiPath)).document.header.photoUrl).toBeNull()
    })
  }
})
