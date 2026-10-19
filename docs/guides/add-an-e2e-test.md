# Write an end-to-end test

Use this guide when a change needs a check in a real browser: layout, focus, print and PDF, several services working together (browser, web build, API, Postgres), or a whole user journey. If you can test something without a browser, do that instead (see [../testing.md](../testing.md) for where each kind of test belongs). End-to-end tests are slow, so write few and make each one tell a story.

## Prerequisites

- Docker and Postgres: `pnpm db:up`. The e2e run always needs a database; it drops and recreates a database whose name contains `e2e` (`e2e/scripts/reset-db.mjs`).
- Install the browser once: `pnpm --filter @cv/e2e exec playwright install chromium`.
- Know the setup (`e2e/playwright.config.ts`): the tests run against the **production builds** of the API (port 3101) and the web app (port 4173), a real Postgres, and the **mock AI** provider. Tests run one at a time (`workers: 1`) with no retries locally and one retry in CI. The default project is `chromium` at 1440 x 950. Other projects: `mobile` (Pixel 7, `mobile.spec.ts`), `webkit` and `webkit-iphone` (`cross-browser.spec.ts`, CI or `E2E_WEBKIT=1`), `visual` (`visual.spec.ts`, CI or `E2E_VISUAL=1`).

## The helpers you will use

All in `e2e/tests/fixtures.ts`. Import `test` and `expect` from `./fixtures`, **not** from `@playwright/test`, because `test` there carries the console-error fixture.

| Helper                                             | What it does                                                                                                                                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signUp(page)`                                     | Creates a fresh account through `/api/auth/register` (unique email, so tests never clash) and keeps the cookie in the browser context. Also hides the "confirm your email" toast. Returns `{ email }`.            |
| `createExampleCv(page, title)`                     | Opens the new-CV wizard for the designer example with the `creative` template, creates it and waits for the editor. Returns the CV id. The example's name is "Maria Ivanova", headline "Senior Product Designer". |
| `changeDocument(page, path, fn)`                   | Edits a saved document through the API (GET, change a copy, PATCH with the revision). Use it to start from a long or odd document instead of typing.                                                              |
| `consoleErrors` (automatic)                        | Collects `pageerror` and `console.error` messages and **fails the test** if any remain at the end. A 401 is ignored (it is how the app learns nobody is signed in).                                               |
| `expectErrors(errors, regex)`                      | Removes expected errors from the list. Use it when the test causes one on purpose, e.g. `expectErrors(consoleErrors, /status of 400/)` after opening a used link.                                                 |
| `expectAccessible(page)`                           | Runs axe (WCAG 2.1 A/AA) and fails on serious or critical violations. Waits for animations first.                                                                                                                 |
| `sentMails(to)`, `linkFromMail(to, regex, count?)` | Read the emails the API "sent". In e2e the API writes them to `MAIL_FILE` (`e2e/paths.ts`, a JSON-lines file in the temp folder). `linkFromMail` polls up to 15 seconds and returns the link.                     |
| `interceptPrint(page)`                             | Replaces `window.print` so a test can see the app asked to print. `await print.printed()` resolves when the print layout is ready.                                                                                |
| `PASSWORD`                                         | The password `signUp` uses.                                                                                                                                                                                       |

PDF reading is in `e2e/pdf.ts`: `readPdf(buffer)` returns pages with `width`, `height`, `text` and positioned `items`; `margins(page)` gives the white space on each side.

## Steps

### 1. Pick the file

Add to an existing spec when the story fits (`documents.spec.ts`, `letters.spec.ts`, `pdf.spec.ts`...). Create `e2e/tests/<topic>.spec.ts` for a new topic. The `chromium` project runs every spec except `mobile`, `cross-browser` and `visual`.

### 2. Start every test from a clean account

Tests share one database and never clean up, so never rely on empty lists. Start with `await signUp(page)` and create what you need. For other users, use `browser.newContext()` (a visitor for a share link) or `page.request` calls.

### 3. Choose selectors the way a user finds things

Prefer roles and names: `getByRole('button', { name: 'Create CV' })`, `getByRole('dialog')`, `getByRole('switch', { name: 'Hide my personal details' })`, `getByLabel('Email')`. Button names are the **English** interface texts (from `apps/web/src/i18n/locales/en`), so a text change there breaks tests. Useful facts:

- The page itself is `getByRole('document', { name: 'CV' })` (or `'Cover letter'`, `'Resignation letter'`).
- Every editable text in the document is a `textbox` whose accessible name is its **placeholder**: `getByRole('textbox', { name: 'Your Name' })`, `{ name: 'The role you are applying for?' }`, `{ name: "Hiring manager's name" }`. The placeholders are in `apps/web/src/renderer/placeholders.ts`. This holds even when the field has a value.
- To replace the text in a field: `click()`, `keyboard.press('ControlOrMeta+a')`, then `keyboard.type(...)`. `ControlOrMeta` works on Mac, Windows and Linux.
- Use `exact: true` for short names that are a substring of others (`getByText('Saved', { exact: true })`).
- Avoid CSS selectors and indexes. The only common exception is the visual spec, which uses `.grid-templates button`.

### 4. Wait for autosave, not for time

The editor saves 1 second after the last keystroke (`delayMs ?? 1000` in `apps/web/src/features/cv-editor/state/autosave.ts`). The status next to the title changes to "Saving..." at once and back to "Saved" when the server has the document. So:

```ts
await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })
```

Always pass a timeout of about 10 seconds (the default is 5), and **do this before a reload or navigation**. Never use `page.waitForTimeout`. To prove the server has it, read it back with `page.request.get('/api/cvs/<id>')`: the browser context's cookie is sent, and the web server proxies `/api`.

### 5. Handle special cases

- **Email links** (sign-up confirmation, password reset): trigger the email in the UI, then `const link = await linkFromMail(email, /https?:\/\/\S+\/verify-email\?token=\S+/)` and `await page.goto(link)`. See `email.spec.ts`.
- **PDF**: the app opens the browser print dialog, which a test cannot use. Intercept it and make the PDF yourself from the same print layout (copied from `pdf.spec.ts`):

  ```ts
  async function savePdf(page: Page) {
    const print = await interceptPrint(page)
    await page.getByRole('button', { name: 'Download PDF' }).click()
    await print.printed()
    return page.pdf({ preferCSSPageSize: true, printBackground: true })
  }
  ```

  Then `const pages = await readPdf(await savePdf(page))`. Fonts and capitals vary by template: compare with spaces removed and upper case when a title is styled (`pages[0]!.text.replace(/\s/g, '').toUpperCase()`).

- **Errors on purpose**: a test that causes a 400 or 409 must call `expectErrors(consoleErrors, /status of 400/)` (take `consoleErrors` from the test arguments), or the console-error fixture fails it. To simulate a server failure use `page.route('**/api/...', (route) => route.fulfill(...))`; see `failures.spec.ts`.
- **Share links**: open the link in `await browser.newContext()` so the visitor is signed out.
- **Accessibility**: add `await expectAccessible(page)` after a screen has settled. Do it for new pages (`quality.spec.ts` lists the paths).
- **Phones**: put the test in `mobile.spec.ts`; it runs with the Pixel 7 profile.
- **Screenshots**: only for templates, in `visual.spec.ts`. Do not make screenshots on your own machine and commit them; CI makes them. See the screenshot step in [add-a-template.md](add-a-template.md).

### 6. Keep it fast and honest

One test = one story with several assertions along the way (the repo's tests are like this). Do not repeat what unit tests already cover. Create documents through the wizard once per test (`createExampleCv`) or through `page.request.post('/api/...')` when the creation is not the point.

## A worked example

This test changes the headline of a CV, waits for autosave, checks the server and a reload, and checks the PDF. Save it as `e2e/tests/headline.spec.ts`. Every helper, selector and endpoint in it is used the same way in the existing specs, but I did not run this exact file (running it starts servers); run it yourself.

```ts
import { readPdf } from '../pdf'
import { createExampleCv, expect, interceptPrint, signUp, test } from './fixtures'

test('a new headline is autosaved, survives a reload and is printed', async ({ page }) => {
  await signUp(page)
  const id = await createExampleCv(page, 'Headline CV')
  const cv = page.getByRole('document', { name: 'CV' })

  // Replace the headline in place: select the field's text, then type.
  const headline = cv.getByRole('textbox', { name: 'The role you are applying for?' })
  await headline.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Staff Product Designer')

  // Autosave waits a second, then saves; the status says "Saved" when it is done.
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })

  // The server has it...
  const record = await (await page.request.get(`/api/cvs/${id}`)).json()
  expect(record.document.header.headline).toBe('Staff Product Designer')

  // ...and a fresh page load shows it.
  await page.reload()
  await expect(cv).toContainText('Staff Product Designer')

  // The printed PDF has it too (the creative template styles the headline, so ignore
  // spaces and case).
  const print = await interceptPrint(page)
  await page.getByRole('button', { name: 'Download PDF' }).click()
  await print.printed()
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
  const pages = await readPdf(pdf)
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

- Importing `test` from `@playwright/test`: the console-error fixture is silently missing.
- Reloading right after typing without waiting for "Saved": the edit is lost and the test fails at random.
- Fixed sleeps (`waitForTimeout`). Wait for a visible state instead.
- Depending on data from another test. Each test signs up its own user.
- A selector that matches the hidden measuring copy of the page. The copy is `aria-hidden`, so role-based selectors skip it; text and CSS selectors may not.
- Expecting the default 5 second timeout to cover autosave (1 second wait plus request).
- Asserting English text for something that depends on the interface language. The default language in a test browser is English; if you switch language, switch back or use a new account.
- Changing a button text in the app and forgetting the specs that click it (`grep -rn "Create CV" e2e/tests`).

## Open questions

- I did not run the worked example, because that needs the servers. Every piece comes from an existing spec, but check the creative template's headline styling if the PDF assertion fails.
