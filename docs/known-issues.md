# Known issues and oddities

Collected while writing the developer documentation (October 2026). The writers read the
code page by page and noted what looked wrong, surprising or out of date. Each item says where
it was found and whether it is fixed. Items marked **checked** were reproduced or confirmed by
reading the exact code; the others are reported from reading and should be confirmed before
anyone relies on them.

## Fixed

| Problem                                                                                                                                                                         | Fix                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Checked.** On a link that hides personal details, a name equal to a fixed value (for example "Main" or "Sidebar") rewrote every section's `column` and `type` to the stand-in | Fixed values (`id`, `type`, `column`, `levelDisplay`, `icon`) are never scanned; test added |
| **Checked.** A cover letter's header headline was not scrubbed of the owner's name when hiding details (CVs were)                                                               | Scrubbed like a CV's; test added                                                            |
| **Checked.** A malformed id in a request body (`jobId`, `cvId`, `coverLetterId`) was passed to Postgres and answered `500` (and would reach Sentry as a server error)           | Request inputs use `RefIdSchema`, so it is a `400 validation_error`; test added             |
| The Documents tab was not highlighted on `/resignations/new` (it was on the other "new" pages)                                                                                  | Added to the tab's list                                                                     |
| The German password-reset email hard-coded "CV-Generator" instead of the product name                                                                                           | Uses `APP_NAME` like the English and Bulgarian emails                                       |
| Stale comments: share links "CV or cover letter" (they also cover resignation letters), a misplaced `TRUST_PROXY` comment, the `pruneVersions` comment                          | Comments corrected                                                                          |
| The README said browser tests run on every push (they run on pull requests only)                                                                                                | Corrected                                                                                   |

## Open: behaviour worth a decision

| #   | What                                                                                                                                                                                                           | Where                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Checked.** Pruning versions deletes the oldest versions beyond the plan limit (30 on the free plan), **named ones included**. Users who save named versions may expect those to be kept                      | `pruneVersions` in `apps/api/src/modules/cvs/routes.ts`                                                                        |
| 2   | The server session is extended to 90 days, but the browser cookie is set once at sign-in with a 30-day `Max-Age` and never refreshed, so people are signed out 30 days after signing in                        | `apps/api/src/modules/auth/sessions.ts`                                                                                        |
| 3   | If someone leaves the editor while the last save fails (offline, or a conflict), those edits are dropped. Nothing is kept in local storage                                                                     | `useCvSession` cleanup in `apps/web/src/features/cv-editor/state/editorSession.ts` (letters and resignations have equivalents) |
| 4   | The `409` raised when the revision check loses a race has no `details.revision`; the conflict banner then keeps "Keep my version" disabled. The usual conflict path does include it (the e2e test covers that) | `apps/api/src/modules/cvs/routes.ts`, `ConflictBanner.tsx`; resignations use the same pattern                                  |
| 5   | Hiding personal details does not hide: a name that appears only in free text and in no field; a cover letter's `recipient.title` and `date`; an experience's `logoUrl`                                         | `packages/shared/src/documents/share.ts` ([domain model](domain-model.md))                                                     |
| 6   | Uploads: the body limit is 2 MiB but images up to 5 MiB are allowed; only small images and files over 5 MiB are tested, so a 2–5 MiB image may be refused by the server before the size check                  | `apps/api` upload route and server `bodyLimit`                                                                                 |
| 7   | Resignation letters reuse `PLAN_LIMITS.maxCvs` as their count limit                                                                                                                                            | `apps/api/src/modules/resignations/routes.ts`                                                                                  |

## Open: missing pieces

- **No stored-document migration.** `schemaVersion` exists but the schemas use `z.literal(1)` and
  nothing migrates old documents; bumping it would break every saved document. Additive fields
  rely on `.default()`. See [domain model](domain-model.md).
- **The API does not validate documents when reading them from the database** (`toRecord` returns
  the stored JSON); only the web app parses responses.
- **No cleanup jobs** for expired sessions or tokens, old `ai_usage` rows, or uploads no longer
  referenced.
- **`ErrorPage` is the only error boundary**, so errors in event handlers or async code are not
  sent to Sentry automatically.
- **API tests are skipped silently without Postgres** (`pnpm test` still passes), and the table
  list in `apps/api/test/support/context.ts` that is emptied between tests is hard-coded: a new
  table must be added by hand. See [testing](testing.md).
- `paginateColumn` moves a block that is taller than a page to a new page only if other blocks
  come before it; otherwise it stays and is clipped.

## Open: dead code and stale wording

- `TemplateDefinition.name` is not used by the pickers (they use `labels.template.<id>`).
- `DOCUMENT_SUBTABS[].label` in `apps/web/src/shared/lib/paths.ts` is English and never shown.
- `editor.rail.letterDownloads` and `editor.rail.letterLinks` ("arrive in Step 13") are fallbacks
  no page triggers any more.
- The `dev@localhost` user is not created any more; `claimDevData` only helps old local databases.
- `docs/PLAN.md` still mentions `apps/web/src/mocks/data.ts` (gone) and CSS variables for the
  slider steps (the code computes pixel values in `renderer/templates/tokens.ts`). PLAN is a
  history log, so it was left as it is.
- The ARCHITECTURE rule "between features import only `api.ts`, `queries.ts` and `state/`" is a
  convention, not enforced by ESLint, and has exceptions (for example `cover-letters` imports from
  `cv-editor/layout`, `cv-editor` imports `ai/panels` and `share/ShareDialog`, `dashboard` imports
  `jobs/jobHelpers`).
- `CONTRIBUTING.md` says to branch from `dev` and open the pull request against `dev`, while the
  history shows pull requests from `dev` into `main`. See [guides](guides/README.md).
- Plurals in the i18n README are described for two-form languages only.
