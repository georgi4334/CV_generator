# Write an end-to-end test

Use this guide when a change needs a check in a real browser: layout, focus, print and PDF, several services working together (browser, web build, API, Postgres), or a whole user journey. If you can test something without a browser, do that instead (see [../testing.md](../testing.md) for where each kind of test belongs). End-to-end tests are slow, so write few and make each one tell a story.

## Prerequisites

- Docker and Postgres: `pnpm db:up`. The e2e run always needs a database; it drops and recreates a database whose name contains `e2e` (`e2e/scripts/reset-db.mjs`).
- Install the browser once: `pnpm --filter @cv/e2e exec playwright install chromium`.
- Know the setup (`e2e/playwright.config.ts` and the servers in `e2e/stack.ts`): the tests run against the **production builds** of the API (port 3101) and the web app (port 4173), a real Postgres, and the **mock AI** provider. Tests run one at a time (`workers: 1`) with no retries locally and one retry in CI. The default project is `chromium` at 1440 x 950. Other projects: `mobile` (Pixel 7, `mobile.spec.ts`), `webkit` and `webkit-iphone` (`cross-browser.spec.ts`, CI or `E2E_WEBKIT=1`), `visual` (`visual.spec.ts`, CI or `E2E_VISUAL=1`).

## The building blocks you will use

Specs import `test` and `expect` from `'../fixtures'`, **not** from `@playwright/test`: that `test` carries the page objects, the console-error check and the account fixtures. The full list, with the rules for page objects, is in [testing.md](../testing.md#page-objects-and-fixtures). The short version:

| You write                                                      | What happens                                                                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `async ({ cvEditor }) => ...`                                  | A fresh user is registered and signed in, an example designer CV (template Creative) is created and open in the editor.              |
| `async ({ account, documents, jobs }) => ...`                  | Only a signed-in user, plus the Documents and Jobs page objects. Without `account` nobody is signed in (use that for sign-up tests). |
| `test.use({ cvTitle: 'Portfolio CV', accountName: 'Георги' })` | Options for the whole file or `describe`.                                                                                            |
| `api.get / post / delete / changeDocument`                     | Talk to the API with the browser's cookie. `changeDocument(path, fn)` starts a test from a long or odd document without typing it.   |
| `mailbox.linkFor(to, regex)`                                   | The link in an email the API "sent" (e2e writes emails to a file).                                                                   |
| `printing.install()`, `printing.capture()`                     | Replaces `window.print`; `capture()` makes the PDF with `page.pdf()` once the app asked to print.                                    |
| `visitors.open(link)`                                          | A signed-out visitor in a fresh browser context.                                                                                     |
| `allowConsoleErrors(/status of 400/)`                          | Allows an error the test causes on purpose. Any other browser error fails the test (automatic).                                      |
| `page.expectAccessible()`, `expectNoSideScroll()`              | On any page object: axe check (WCAG 2.1 AA) and "nothing wider than the screen".                                                     |

PDF reading is in `e2e/pdf.ts`: `readPdf(buffer)` returns pages with `width`, `height`, `text` and positioned `items`; `margins(page)` gives the white space on each side.

If the screen you need has no page object yet, add one in `e2e/pages/` (extend `BasePage`, implement `route()`, keep locators and actions there, no assertions about behaviour) and register it as a fixture in `fixtures/base.ts`.

## Steps

### 1. Pick the file

Add to an existing spec when the story fits (`documents.spec.ts`, `letters.spec.ts`, `pdf.spec.ts`...). Create `e2e/tests/<topic>.spec.ts` for a new topic. The `chromium` project runs every spec except `mobile`, `cross-browser` and `visual`.

### 2. Start every test from a clean account

Tests share one database and never clean up, so never rely on empty lists. Ask for the `account` (or `cvEditor`) fixture and create what you need. For other users, use `browser.newContext()` (a visitor for a share link) or `page.request` calls.

### 3. Choose selectors the way a user finds things

Prefer roles and names: `getByRole('button', { name: 'Create CV' })`, `getByRole('dialog')`, `getByRole('switch', { name: 'Hide my personal details' })`, `getByLabel('Email')`. Button names are the **English** interface texts (from `apps/web/src/i18n/locales/en`), so a text change there breaks tests. Useful facts:

- The page itself is `editor.document()` (`getByRole('document', { name: 'CV' })`, or `'Cover letter'`, `'Resignation letter'`).
- Every editable text in the document is a `textbox` whose accessible name is its **placeholder**: `getByRole('textbox', { name: 'Your Name' })`, `{ name: 'The role you are applying for?' }`, `{ name: "Hiring manager's name" }`. The placeholders are in `apps/web/src/renderer/placeholders.ts`. This holds even when the field has a value.
- To replace the text in a field: `click()`, `keyboard.press('ControlOrMeta+a')`, then `keyboard.type(...)`. `ControlOrMeta` works on Mac, Windows and Linux.
- Use `exact: true` for short names that are a substring of others (`getByText('Saved', { exact: true })`).
- Avoid CSS selectors and indexes. The only common exception is the visual spec, which uses `.grid-templates button`.

### 4. Wait for autosave, not for time

The editor saves 1 second after the last keystroke (`delayMs ?? 1000` in `apps/web/src/features/cv-editor/state/autosave.ts`). The status next to the title changes to "Saving..." at once and back to "Saved" when the server has the document. So:

```ts
await editor.expectSaved() // waits up to 15 s for the "Saved" status
```

Always pass a timeout of about 10 seconds (the default is 5), and **do this before a reload or navigation**. Never use `page.waitForTimeout`. To prove the server has it, read it back with `page.request.get('/api/cvs/<id>')`: the browser context's cookie is sent, and the web server proxies `/api`.

### 5. Handle special cases

- **Email links** (sign-up confirmation, password reset): trigger the email in the UI, then `const link = await mailbox.linkFor(email, /https?:\/\/\S+\/verify-email\?token=\S+/)` and `await page.goto(link)`. See `email.spec.ts`.
- **PDF**: the app opens the browser print dialog, which a test cannot use. Intercept it and make the PDF yourself from the same print layout (copied from `pdf.spec.ts`):

  ```ts
  await printing.install()
  await editor.downloadPdf()
  const pdf = await printing.capture()
  ```

  Then `const pages = await readPdf(pdf)`. Fonts and capitals vary by template: compare with spaces removed and upper case when a title is styled (`pages[0]!.text.replace(/\s/g, '').toUpperCase()`).

- **Errors on purpose**: a test that causes a 400 or 409 must call `allowConsoleErrors(/status of 400/)`, or the console-error fixture fails it. To simulate a server failure use `page.route('**/api/...', (route) => route.fulfill(...))`; see `failures.spec.ts`.
- **Share links**: open the link in `await browser.newContext()` so the visitor is signed out.
- **Accessibility**: add `await somePage.expectAccessible()` after a screen has settled. Do it for new pages (`quality.spec.ts` lists the paths).
- **Phones**: put the test in `mobile.spec.ts`; it runs with the Pixel 7 profile.
- **Screenshots**: only for templates, in `visual.spec.ts`. Do not make screenshots on your own machine and commit them; CI makes them. See the screenshot step in [add-a-template.md](add-a-template.md).

### 6. Keep it fast and honest

One test = one story with several assertions along the way (the repo's tests are like this). Do not repeat what unit tests already cover. Create documents through the wizard once per test (`newCv.createExample()`, or just the `cvEditor` fixture) or through `page.request.post('/api/...')` when the creation is not the point.

## A worked example

This test changes the headline of a CV, waits for autosave, checks the server and a reload, and checks the PDF. It is a real file, `e2e/tests/headline.spec.ts`, and it runs with the rest of the suite.

```ts
import { readPdf } from '../pdf'
import { expect, test } from '../fixtures'

test('a new headline is autosaved, survives a reload and is printed', async ({
  cvEditor,
  api,
  printing,
}) => {
  const headline = cvEditor.document().getByRole('textbox', {
    name: 'The role you are applying for?',
  })
  await cvEditor.replaceText(headline, 'Staff Product Designer')
  await cvEditor.expectSaved()

  // The server has it...
  const record = await api.get(cvEditor.apiPath)
  expect(record.document.header.headline).toBe('Staff Product Designer')

  // ...and a fresh page load shows it.
  await cvEditor.reload()
  await expect(cvEditor.document()).toContainText('Staff Product Designer')

  // The printed PDF has it too (the creative template styles the headline, so ignore
  // spaces and case).
  await printing.install()
  await cvEditor.downloadPdf()
  const pages = await readPdf(await printing.capture())
  expect(pages[0]!.text.replace(/\s/g, '').toUpperCase()).toContain('STAFFPRODUCTDESIGNER')
})
```

If the test ends with a console error (for example a blocked script), the automatic `consoleErrors` fixture fails it even though every assertion passed. That is intended.

## Verification checklist

```bash
pnpm db:up
pnpm --filter @cv/e2e typecheck
pnpm --filter @cv/e2e exec playwright test headline.spec.ts --project=chromium
pnpm --filter @cv/e2e exec playwright test --headed --debug headline.spec.ts   # to watch it
pnpm e2e                                                                        # the whole suite
pnpm lint && pnpm format:check
```

On failure Playwright keeps a trace and a screenshot (`e2e/test-results/`, ignored by git); open the trace with `pnpm --filter @cv/e2e exec playwright show-trace <path>`. CI runs e2e on pull requests only and uploads the report as an artifact when it fails.

Run the new test three times in a row (`--repeat-each=3`) to catch flakiness before you push.

## Common mistakes

- Importing `test` from `@playwright/test`: the fixtures and the console-error check are missing.
- Reloading right after typing without waiting for "Saved": the edit is lost and the test fails at random.
- Fixed sleeps (`waitForTimeout`). Wait for a visible state instead.
- Depending on data from another test. Each test gets its own user from the `account` fixture.
- A selector that matches the hidden measuring copy of the page. The copy is `aria-hidden`, so role-based selectors skip it; text and CSS selectors may not.
- Expecting the default 5 second timeout to cover autosave (1 second wait plus request).
- Asserting English text for something that depends on the interface language. The default language in a test browser is English; if you switch language, switch back or use a new account.
- Changing a button text in the app and forgetting the specs that click it (`grep -rn "Create CV" e2e/tests`).
