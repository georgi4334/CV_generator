# Add a language

Vitae has **two separate kinds of language**. Decide which one you need before you start.

| Kind                        | What it controls                                                                       | Today                  | Defined in                                           |
| --------------------------- | -------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------- |
| Interface language (locale) | Buttons, menus, errors, legal pages, account emails                                    | `en`, `bg`, `de`       | `LOCALES` in `packages/shared/src/auth/auth.ts`      |
| CV language                 | Text inside a document: section titles, placeholders, month names, letter defaults, AI | `en-US`, `en-GB`, `bg` | `CV_LANGUAGES` in `packages/shared/src/cv/common.ts` |

A German user can write a Bulgarian CV. Part A below adds an interface language, Part B a CV language. They can be done independently. The short version is in `apps/web/src/i18n/README.md`; read it first.

## Prerequisites

- Good command of the language, or a native speaker who will review your texts. Bulgarian uses the formal "Вие", German the formal "Sie", both in sentence case (from the i18n README). Follow the same tone for a new language.
- Related: [add-a-template.md](add-a-template.md) (template names are interface texts), [add-an-api-endpoint.md](add-an-api-endpoint.md) (error codes).

## Part A: a new interface language

The example is Spanish, code `es`.

### A1. Register the code

`packages/shared/src/auth/auth.ts`:

```ts
export const LOCALES = ['en', 'bg', 'de'] as const
```

Add `'es'`. This single list is also the allowed value of the account setting (`LocaleSchema`, used by sign-up, the profile and "forgot password") and of `UI_LANGUAGES` in the web app. The `users.locale` column is plain `text` with default `'en'` (`apps/api/src/db/schema/users.ts`), so **no database migration is needed**.

### A2. Web: names and date locale

`apps/web/src/i18n/languages.ts` has two `Record<UiLanguage, string>` tables. Both fail to compile until you add the new code:

```ts
export const UI_LANGUAGE_NAMES: Record<UiLanguage, string> = {
  en: 'English',
  bg: 'Български',
  de: 'Deutsch', // add: es: 'Español'
}
export const UI_LOCALES: Record<UiLanguage, string> = {
  en: 'en-GB',
  bg: 'bg-BG',
  de: 'de-DE', // add: es: 'es-ES'
}
```

The name is written in the language itself. `UI_LOCALES` drives `formatDate` and `formatDateTime` (`apps/web/src/shared/lib/format.ts`, `features/cv-editor/lib/formatDateTime.ts`). The picker (`shared/ui/LanguageSelect.tsx`) lists `UI_LANGUAGES` automatically.

### A3. Web: the loader

`apps/web/src/i18n/index.ts` has `loaders: Record<Exclude<UiLanguage, 'en'>, ...>`. Other languages are downloaded only when someone picks them:

```ts
const loaders = {
  bg: () => import('./locales/bg').then((m) => m.bg),
  de: () => import('./locales/de').then((m) => m.de),
  // es: () => import('./locales/es').then((m) => m.es),
}
```

### A4. Web: the translation files

Copy the folder `apps/web/src/i18n/locales/de/` to `locales/es/` (19 area files plus `index.ts`). English is the source: `Messages = typeof en` (`apps/web/src/i18n/types.ts`). Each file is typed, for example `export const ai: Messages['ai'] = { ... }`, so TypeScript reports every missing or extra key. `locales/es/index.ts` exports `es: Messages`.

Rules (README): every visible string, `aria-label`, `title`, `placeholder` and `alt` goes through `t()`; keep `{{placeholders}}` identical; plurals use `_one` / `_other` keys; write the product name as `{{app}}`; keep names like Gemini, PDF and ATS. If the language needs more than two plural forms, check how i18next handles them first (the README only covers the two-form languages).

The test `apps/web/src/i18n/i18n.test.tsx` checks that bg and de have every English key, the same placeholders, and no empty text. Add your language to its `it.each([...])` list.

### A5. API: account emails

`apps/api/src/modules/auth/emails.ts` has `TEXTS: Record<Locale, { verify, reset }>`. The compiler requires an `es` entry once `LOCALES` has it. Translate `subject` and `lines`, keeping the link line and `APP_NAME`:

```ts
export function verificationEmail(to: string, locale: Locale, link: string): Email {
  const { subject, lines } = TEXTS[locale].verify
  return { to, subject, text: lines(link).join('\n') }
}
```

### A6. How the language is chosen and remembered

Nothing to change, but know it (this is where bugs come from):

- `detectLanguage()` uses the saved choice (`localStorage` key `cv-ui-language`), then the browser's languages (first part of the tag, so `es-MX` becomes `es`), then English.
- `features/auth/localeSync.ts` saves the choice on the account (`authApi.setLocale`) and, on a browser without its own choice, switches to the account's language after sign-in.
- Emails use the account's `locale` (and `forgot-password` can pass one).

### A7. Tests and checks

- `i18n.test.tsx` as above. Also look at `features/auth/localeSync.test.ts` and `apps/api/test/modules/auth.test.ts` (it uses `locale: 'bg'`, `'de'` and rejects `'fr'`; if you add `'fr'`, that rejection test must use another value).
- `e2e/tests/i18n.spec.ts` switches the language and checks `lang`. Add a quick step for yours if you like.
- `pnpm typecheck` is your best friend here.

## Part B: a new CV language

The example is Spanish for CVs, code `es`. A CV language is stored in every document (`language`), so a code is forever.

### B1. Register the code

`packages/shared/src/cv/common.ts`: add it to `CV_LANGUAGES`. Existing documents are not affected.

### B2. Fill every `Record<CvLanguage, ...>`

The compiler lists them. Today they are:

| File                                              | What                                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/cv/i18n.ts`                  | `DEFAULT_SECTION_TITLES` (every section type), `PRESENT`, `LANGUAGE_LEVEL_LABELS` (5 levels), `MONTHS` (12 short names), `EXPIRES` |
| `packages/shared/src/cover-letter/coverLetter.ts` | `COVER_LETTER_DEFAULTS`: greeting, closing and `dateLocale`                                                                        |
| `packages/shared/src/resignation/resignation.ts`  | `RESIGNATION_DEFAULTS`: subject, greeting, closing and the three paragraphs                                                        |
| `packages/shared/src/ai/ai.ts`                    | `AI_LANGUAGE_NAMES` (the AI is told to write in this language)                                                                     |
| `apps/web/src/renderer/placeholders.ts`           | `PLACEHOLDERS`: every grey hint text (about 50 keys; `en-GB` is `{ ...EN, ... }`)                                                  |
| `apps/web/src/i18n/locales/{en,bg,de}/labels.ts`  | `cvLanguage` names, shown in the language pickers: `'en-GB': 'English (UK)'`                                                       |

Month names: `shortMonthNames` returns fixed tables on purpose ("rather than Intl, whose output differs between browsers and Node"). The date picker in the editor (`renderer/editing/dateInputs.tsx`) uses the CV table for Bulgarian and `Intl` for the interface language otherwise.

### B3. Prompts and spelling variants

`apps/api/src/modules/ai/prompts.ts` adds "Use American/British spelling" only for `en-US` / `en-GB`. A new language works through `AI_LANGUAGE_NAMES` alone; add a rule only if it has spelling variants.

### B4. Fonts

All fonts must cover the language's alphabet. They cover Latin and Cyrillic (comment in `FONT_FAMILIES`). A language with other letters (Greek, for example) needs fonts that cover them; see the fonts step in [add-a-template.md](add-a-template.md).

### B5. Pickers

`StartStep.tsx`, `NewLetterPage.tsx`, `NewResignationPage.tsx` and `TemplatesPanel.tsx` all map over `CV_LANGUAGES`, so the new language shows up by itself.

### B6. Tests

Search for the existing codes: tests that use `'bg'` are in `packages/shared/src/cv/cv.test.ts`, `format.test.ts`, `cover-letter/coverLetter.test.ts`, `resignation/resignation.test.ts`, `apps/web/src/renderer/document/CvRenderer.test.tsx`, `apps/web/src/features/new-cv/newCv.test.tsx`. Add cases for your language where they test titles, dates and defaults.

## Verification checklist

```bash
pnpm typecheck                 # missing keys and Records show up here
pnpm --filter @cv/shared test
pnpm --filter @cv/web test     # includes the i18n key-parity test
pnpm --filter @cv/api test
pnpm lint && pnpm format:check
pnpm build
```

By hand:

- Switch the interface language: no page reload, open editor content kept, `<html lang>` changes.
- Create a CV in the new CV language: titles, placeholders, dates ("May 2024"), "Present", language levels, and a cover letter and resignation letter with the right defaults.
- Check long words in the new language do not overflow buttons (German is the usual stress test).
- Request a password reset in the new interface language and read the email in the API log (emails are printed there without a mail provider).

## Common mistakes

- Mixing the two kinds of language. Section titles and placeholders are **CV language** texts (code), not `locales/` texts.
- Translating `{{count}}` or `{{app}}` placeholders or changing their names. The test fails.
- Forgetting the API email table: the compiler catches it, but only if you run `pnpm typecheck` in the API too (`pnpm -r typecheck` does).
- Forgetting a bundle loader in `i18n/index.ts`: the picker shows the language but switching does nothing useful.
- Hard-coded product name in a text. See "Open questions".

## Open questions

- `apps/api/src/modules/auth/emails.ts`, German password-reset email: the text says "Ihres CV-Generator-Kontos" instead of using `APP_NAME` like the English and Bulgarian ones. Looks like a leftover from the old product name.
- The i18n README documents plurals for two-form languages only. I did not find notes about languages with more forms.
