# Developer guides

Step-by-step recipes for the changes you are most likely to make in Vitae. Each guide says when to use it, what you need first, the numbered steps with real file paths, how to check your work, and the usual mistakes.

If you are new, read this page first (the second half is about working in the repo), then pick a guide. For the big picture, read the [architecture](../ARCHITECTURE.md), the [domain model](../domain-model.md), the [data model](../data-model.md), the [API docs](../api/README.md), the [web app docs](../web/README.md) and the [testing guide](../testing.md).

## The guides

| I want to...                                             | Guide                                                  |
| -------------------------------------------------------- | ------------------------------------------------------ |
| Add a new CV look (header, section titles, sidebar)      | [add-a-template.md](add-a-template.md)                 |
| Add a CV section type, or a field to a section           | [add-a-section-or-field.md](add-a-section-or-field.md) |
| Add an API route, a table or a column                    | [add-an-api-endpoint.md](add-an-api-endpoint.md)       |
| Add an interface language, or a language for CV content  | [add-a-language.md](add-a-language.md)                 |
| Add something the AI can do                              | [add-an-ai-feature.md](add-an-ai-feature.md)           |
| Add a new kind of document (like the resignation letter) | [add-a-document-type.md](add-a-document-type.md)       |
| Write a browser test                                     | [add-an-e2e-test.md](add-an-e2e-test.md)               |

A change often needs more than one. A new field with a new endpoint is the section guide plus the API guide. A new document type is the biggest: it points to most of the others.

## Working in this repo

### Set up

Follow the [README](../../README.md#how-to-install-and-run-the-project). The short version:

```bash
pnpm install
pnpm db:up          # Postgres in Docker, port 5433
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm dev            # web on :5173, api on :3001
```

You need Node 22 (`.nvmrc`) and pnpm 10. After a `git pull`, run `pnpm dev` or `pnpm install` again; pnpm checks the dependencies for you.

### Branches and pull requests

What the history shows (`git log --graph`):

- Day-to-day work happens on the **`dev`** branch. Commits go straight onto it.
- Changes reach **`main`** through a pull request from `dev`. `main` contains the merge commits (`Merge pull request #35 from georgi4334/dev`) and nothing else. Each PR so far bundles a handful of commits about one theme (for example "Add resignation letters" or "Add eight CV templates").
- CI (`.github/workflows/ci.yml`) runs on every push to `main` and `dev` and on every pull request. The browser tests (`e2e` job) run **on pull requests only**, to save CI minutes.
- There is no PR template. A good description says what changed and why, and mentions anything the reviewer should try by hand.

`CONTRIBUTING.md` is written for people outside the project: fork, create a branch from `dev`, open the pull request against `dev`. That differs a little from the owner's own flow (`dev` into `main`). If you are unsure which target to use, ask. See "Open questions" below.

Never commit secrets or `.env` files. Do not force-push shared branches.

### Commit messages

Look at `git log --oneline` and copy the style:

- One short line in the imperative mood and sentence case, no prefix like `feat:` and no full stop: `Add eight CV templates and group templates by kind of work`, `Fix the findings of the second UI test`. Keep it under about 100 characters.
- For anything not obvious, leave a blank line and add a paragraph that says what and why, wrapped at about 90 characters.
- Commits made with Claude Code end with trailer lines (`Co-Authored-By: ...` and `Claude-Session: ...`), as in the existing history.
- Small and focused. A commit that adds a template does not also reformat unrelated files.

### The pre-commit hook

`pnpm install` sets up Husky (`"prepare": "husky"`). `.husky/pre-commit` runs `pnpm exec lint-staged`, which, on the files you are committing only:

- `*.{ts,tsx,js}`: `eslint --fix`, then `prettier --write`
- `*.{json,md,yml,yaml,css,html}`: `prettier --write`

So your files are formatted and linted when you commit, and the commit fails if ESLint finds an error it cannot fix. The hook does **not** run type checks or tests. Do not skip it with `--no-verify`; CI will fail the same checks (`pnpm format:check` and `pnpm lint`). Prettier settings are in `.prettierrc.json` (no semicolons, single quotes, trailing commas, 100 columns); `.editorconfig` sets two-space indentation.

### Before you open a pull request

Run these from the repository root. CI runs the same checks (in `ci.yml`: format check, lint, typecheck, coverage run of the tests, build; and on pull requests the e2e job).

| Step | Command             | What it checks                                                                                                                                                                               |
| ---- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `pnpm format:check` | Prettier. Fix with `pnpm format`.                                                                                                                                                            |
| 2    | `pnpm lint`         | ESLint for the whole repo.                                                                                                                                                                   |
| 3    | `pnpm typecheck`    | TypeScript in every package (`pnpm -r typecheck`).                                                                                                                                           |
| 4    | `pnpm test`         | Vitest in shared, api and web. API tests need `pnpm db:up`, or they are skipped with a warning (CI never skips them).                                                                        |
| 5    | `pnpm e2e`          | Playwright against the production builds. Needs Postgres and `playwright install chromium` the first time. Slow; run it when you changed a user flow, the editor, printing, sharing or auth. |
| 6    | `pnpm build`        | Builds every package, as CI does.                                                                                                                                                            |

Then check by hand:

- New user-visible text exists in **all three** languages (`apps/web/src/i18n/locales/{en,bg,de}`); `pnpm typecheck` fails if a key is missing.
- You added or updated tests for what you changed (each feature keeps its tests next to its code).
- Docs: if you changed behaviour that [../api/endpoints.md](../api/endpoints.md), [../data-model.md](../data-model.md) or `docs/PLAN.md` describe, update them.
- Template layout changed on purpose: add the `update-screenshots` label to the PR. A workflow then commits new pictures to your branch; approve the waiting CI run afterwards (see [add-a-template.md](add-a-template.md)).

### Where do I look when...

| When...                                                            | Look at                                                                                                                                   |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A button, label or message in the app has the wrong text           | `apps/web/src/i18n/locales/{en,bg,de}/<area>.ts` (see `apps/web/src/i18n/README.md`)                                                      |
| A section title, month name, or grey hint **inside a CV** is wrong | `packages/shared/src/cv/i18n.ts` (titles, months) and `apps/web/src/renderer/placeholders.ts` (hints)                                     |
| A template looks wrong                                             | `apps/web/src/renderer/templates/` (`templates.ts`, `headers.tsx`, `pageStyle.ts`) and `renderer/editing/primitives.tsx` (section titles) |
| Content breaks across pages badly                                  | `apps/web/src/renderer/document/CvRenderer.tsx`, `PageFrame.tsx`, `paginate.ts`                                                           |
| Typing in the CV does not save                                     | `apps/web/src/features/cv-editor/state/` (`cvEditorStore.ts`, `autosave.ts`, `editorSession.ts`)                                          |
| Two tabs overwrite each other / conflict banner                    | `autosave.ts` and the `revision` check in `apps/api/src/modules/cvs/routes.ts`                                                            |
| The PDF is wrong                                                   | `apps/web/src/features/print/` (the browser's print dialog, no server PDF); `e2e/tests/pdf.spec.ts`                                       |
| A share link shows something it should hide                        | `hidePersonalDetails` in `packages/shared/src/documents/share.ts` and `apps/api/src/modules/share/routes.ts`                              |
| An API call fails with a code like `plan_limit` or `conflict`      | `apps/api/src/infra/errors.ts`, then grep the code in `apps/api/src`; texts in `locales/*/errors.ts`                                      |
| A user sees data that is not theirs                                | The `userId` filter in the module's `routes.ts`; `apps/api/test/modules/isolation.test.ts`                                                |
| The database schema or a migration                                 | `apps/api/src/db/schema/`, `apps/api/drizzle/`, `apps/api/src/db/migrate.ts`                                                              |
| Limits (CV count, versions, AI per day)                            | `PLAN_LIMITS` in `packages/shared/src/api/api.ts`                                                                                         |
| Text length limits                                                 | `packages/shared/src/common/textLimit.ts`, `cv/header.ts`, `resignation/resignation.ts`                                                   |
| AI answers are wrong or an AI error appears                        | `apps/api/src/modules/ai/` (`routes.ts`, `prompts.ts`, `mock.ts`, `gemini.ts`)                                                            |
| Sign-up, login, password reset, emails                             | `apps/api/src/modules/auth/` (`routes.ts`, `emails.ts`), `apps/web/src/features/auth/`                                                    |
| Colours, spacing, dark mode                                        | `apps/web/src/shared/styles/tokens.css` (see the styles section of `docs/ARCHITECTURE.md`)                                                |
| A web test cannot reach the API                                    | `apps/web/src/test/` (fake APIs, `appHarness.ts`)                                                                                         |
| CI fails but local passes                                          | `.github/workflows/ci.yml`; CI needs `REQUIRE_DB_TESTS=1`, a Postgres service and `--frozen-lockfile`                                     |
| Environment variables                                              | `apps/api/src/config/env.ts` and `apps/api/.env.example`                                                                                  |
| Deploying                                                          | `docs/DEPLOY.md`, `render.yaml`                                                                                                           |
| What was decided and why                                           | `docs/PLAN.md` (decision log and one entry per finished step)                                                                             |

### Habits that save time

- Let TypeScript lead you. Many tables in the code are `Record<TemplateId, ...>`, `Record<CvLanguage, ...>` or `Record<DocumentType, ...>`, so adding a value to a list makes the compiler show you every place that needs an entry.
- Imports: use `@/...` for anything outside the current folder, `./...` inside it. `shared/` and `renderer/` never import from `features/`. Features import each other's data layer only (`api.ts`, `queries.ts`, `state/`). Details in the architecture doc.
- Shared Zod schemas are the contract between web and API. Change them first, then let both sides follow.
- Keep a change small. Several small commits are easier to review than one big one.

### Open questions

- `CONTRIBUTING.md` asks outside contributors to open pull requests against `dev`, while `main` only contains merges of `dev`. Which branch should a team member target for a normal change? This page documents what the history shows.
- There is no written rule about squashing or rebasing; the history shows merge commits on `main` and plain commits on `dev`.
