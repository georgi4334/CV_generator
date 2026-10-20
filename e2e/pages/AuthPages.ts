import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/** `/login` */
export class LoginPage extends BasePage {
  protected route() {
    return '/login'
  }

  emailField(): Locator {
    return this.page.getByLabel('Email')
  }

  passwordField(): Locator {
    return this.page.getByLabel(/^Password/)
  }

  async signIn(email: string, password: string) {
    await this.emailField().fill(email)
    await this.passwordField().fill(password)
    await this.page.getByRole('button', { name: 'Sign in' }).click()
  }

  /** The red message under the form ("Wrong email or password"). */
  errorMessage(): Locator {
    return this.page.getByRole('alert')
  }

  async goToRegister() {
    await this.page.getByRole('link', { name: 'Create one' }).click()
  }

  async goToForgotPassword() {
    await this.page.getByRole('link', { name: 'Forgot password?' }).click()
  }

  async expectSignedIn() {
    await expect(this.page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  }
}

/** `/register` */
export class RegisterPage extends BasePage {
  protected route() {
    return '/register'
  }

  emailField(): Locator {
    return this.page.getByLabel('Email')
  }

  passwordField(): Locator {
    return this.page.getByLabel(/^Password/)
  }

  /** Whether the browser itself accepts what is typed in a field (required, type, minlength). */
  async isAccepted(field: Locator): Promise<boolean> {
    return field.evaluate((el: HTMLInputElement) => el.validity.valid)
  }

  async register({ email, password, name }: { email: string; password: string; name?: string }) {
    if (name) await this.page.getByLabel('Name (optional)').fill(name)
    await this.emailField().fill(email)
    await this.passwordField().fill(password)
    await this.page.getByRole('button', { name: 'Create account' }).click()
  }

  async openPrivacyPolicy() {
    await this.page.getByRole('link', { name: 'Privacy policy' }).click()
  }

  async openTerms() {
    await this.page.getByRole('link', { name: 'Terms' }).click()
  }
}

/** `/forgot-password` */
export class ForgotPasswordPage extends BasePage {
  protected route() {
    return '/forgot-password'
  }

  async requestLink(email: string) {
    await this.page.getByLabel('Email').fill(email)
    await this.page.getByRole('button', { name: 'Send reset link' }).click()
  }

  /** The (always the same) answer: it never says whether the address has an account. */
  sentMessage(): Locator {
    return this.page.getByText(/a reset link is on its way/)
  }
}

/** `/reset-password?token=...` (open it with the link from the email). */
export class ResetPasswordPage extends BasePage {
  protected route() {
    return '/reset-password'
  }

  async openLink(link: string) {
    await this.page.goto(link)
  }

  async changePassword(newPassword: string) {
    await this.page.getByLabel('New password').fill(newPassword)
    await this.page.getByRole('button', { name: 'Change password' }).click()
  }

  doneMessage(): Locator {
    return this.page.getByText('Your password was changed. Sign in with the new one.')
  }

  errorMessage(): Locator {
    return this.page.getByRole('alert')
  }
}

/** `/verify-email?token=...` (open it with the link from the email). */
export class VerifyEmailPage extends BasePage {
  protected route() {
    return '/verify-email'
  }

  async openLink(link: string) {
    await this.page.goto(link)
  }

  confirmedMessage(): Locator {
    return this.page.getByText('Your email address is confirmed. Thank you!')
  }

  async goToApp() {
    await this.page.getByRole('link', { name: 'Go to the app' }).click()
  }
}

/** The "please confirm your email" reminder shown after sign-up. */
export function verifyReminder(page: import('@playwright/test').Page): Locator {
  return page.getByText(/Please confirm your email address/)
}

/** `/welcome`, what first-time visitors see. */
export class WelcomePage extends BasePage {
  protected route() {
    return '/welcome'
  }

  async goToCreateAccount() {
    await this.page.getByRole('main').getByRole('link', { name: 'Create your CV' }).first().click()
  }

  async goToLogin() {
    await this.page.getByRole('banner').getByRole('link', { name: 'Log in' }).click()
  }
}

/** Any screen a signed-out visitor can open (welcome, legal pages...): `open('/privacy')`. */
export class PublicPage extends BasePage {
  protected route() {
    return '/welcome'
  }
}
