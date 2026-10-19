# API endpoint reference

Every route the API registers, checked against `apps/api/src/app.ts` and
`apps/api/src/modules/*/routes.ts`. For the big picture (hooks, sessions, error shape) read
[README.md](./README.md) first; for tables see [../data-model.md](../data-model.md).

## Conventions

- **Base path:** every route is under `/api` (for example `GET /api/cvs`).
- **Format:** JSON in, JSON out. Dates are ISO 8601 strings. Ids are UUIDs.
- **Auth:** "Yes" means the `cv_session` cookie is required, otherwise `401 unauthorized`.
  Send `credentials: 'include'` from the browser.
- **Schemas:** names such as `CreateCvInputSchema` are Zod schemas in `packages/shared/src/`
  (mostly `api/api.ts`, `auth/auth.ts`, `jobs/jobs.ts`, `documents/share.ts`, `ai/ai.ts`).
  Response types (`CvRecord`, `Job`, ...) are the matching types in `@cv/shared`.
- **Errors:** always `{ "error": { "code", "message", "details?" } }`. These apply to **every**
  route and are not repeated in the tables:
  - `403 forbidden` (missing proxy secret, when `PROXY_SECRET` is set; not for `/health` and `/ping`)
  - `403 forbidden_origin` (POST, PUT, PATCH, DELETE with a foreign `Origin` header)
  - `400 validation_error` (bad params, query or body; `details` = Zod issues)
  - `503 database_unavailable`, `500 internal_error`
  - Routes marked "Auth: Yes" also give `401 unauthorized`.
- **Ownership:** a row that does not exist and a row owned by someone else both answer
  `404 not_found`.
- **Params:** `:id` and `:versionId` must be UUIDs (`400 validation_error` otherwise). So must ids
  inside request bodies that point at another row (`jobId`, `cvId`, `coverLetterId`; `RefIdSchema`).
- **Preflight:** `OPTIONS` requests are answered by the CORS plugin and are not listed.
- Total: 58 routes.

## Contents

[System](#system) · [Auth](#auth) · [CVs](#cvs) · [Cover letters](#cover-letters) ·
[Resignation letters](#resignation-letters) · [Jobs](#jobs) · [Share links](#share-links-owner) ·
[Public shared documents](#public-shared-documents) · [Uploads](#uploads) · [AI](#ai) ·
[Open questions](#open-questions)

---

## System

Registered in `apps/api/src/app.ts` and `modules/health`, `modules/professions`. These do not wait
for database migrations.

| Method | Path               | Auth | Request | Response                                                                                                 | Notable errors                            | Side effects                                       |
| ------ | ------------------ | ---- | ------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| GET    | `/api/health`      | No   | none    | `200 HealthResponse`: `{ status: "ok", database: "up" \| "down", email: "service" \| "log", timestamp }` | none (200 even when the database is down) | Runs `select 1`.                                   |
| GET    | `/api/ping`        | No   | none    | `200 { ok: true }`                                                                                       | none                                      | None. Does not touch the database (keep-warm job). |
| GET    | `/api/professions` | No   | none    | `200` array of profession presets (`Object.values(PROFESSIONS)` from `@cv/shared`)                       | none                                      | None.                                              |

---

## Auth

Code: `apps/api/src/modules/auth/routes.ts`. Rate limits are described in
[README.md](./README.md#9-rate-limiters). "Session cookie" below means a `Set-Cookie: cv_session=...`
header (see [README.md](./README.md#7-auth-sessions-and-cookies)). The user object is
`User`: `{ id, email, name, plan, emailVerified, locale, createdAt }`.

| Method | Path                            | Auth | Request body (schema)                                                             | Response                        | Notable errors                                                                                                          | Side effects                                                                                                                                                                                    |
| ------ | ------------------------------- | ---- | --------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/register`            | No   | `RegisterInputSchema`: `email`, `password`, `name?`, `locale?` (`en`, `bg`, `de`) | `201 { user }` + session cookie | `409 email_taken` (also for `dev@localhost`); `429 too_many_requests`; `400 validation_error` (weak or common password) | Inserts the user and a session; issues a 24 h verification token and sends the email in the background; in non-production, the first account takes over the legacy `dev@localhost` user's data. |
| POST   | `/api/auth/login`               | No   | `LoginInputSchema`: `email`, `password`                                           | `200 { user }` + session cookie | `401 invalid_credentials`; `429 too_many_requests`                                                                      | Inserts a new session (other sessions stay); clears the per-account failure counter.                                                                                                            |
| POST   | `/api/auth/logout`              | No   | none                                                                              | `204`                           | none                                                                                                                    | Deletes the session of the cookie (if any) and clears the cookie. Safe to call when signed out.                                                                                                 |
| POST   | `/api/auth/forgot-password`     | No   | `ForgotPasswordInputSchema`: `email`, `locale?`                                   | `204` always                    | `429 too_many_requests` (per-IP limit only)                                                                             | If the account exists and has a password (and the per-email limit allows): issues a 1 h reset token (deleting older ones) and emails the link. Same answer otherwise.                           |
| POST   | `/api/auth/reset-password`      | No   | `ResetPasswordInputSchema`: `token`, `password`                                   | `204` + cleared cookie          | `400 invalid_token`; `429 too_many_requests`; `400 validation_error`                                                    | Marks the token used; sets the new password; sets `email_verified_at`; deletes **all** sessions of the user.                                                                                    |
| POST   | `/api/auth/verify-email`        | No   | `VerifyEmailInputSchema`: `token`                                                 | `204`                           | `400 invalid_token`; `429 too_many_requests`                                                                            | Marks the token used; sets `email_verified_at`. Works when signed out.                                                                                                                          |
| GET    | `/api/auth/me`                  | Yes  | none                                                                              | `200 { user }`                  | none                                                                                                                    | None. The web app calls it to find out whether it is signed in.                                                                                                                                 |
| PATCH  | `/api/auth/me`                  | Yes  | `UpdateProfileInputSchema`: `name?`, `locale?` (at least one)                     | `200 { user }`                  | `400 validation_error` ("Nothing to update")                                                                            | Updates the user row.                                                                                                                                                                           |
| POST   | `/api/auth/resend-verification` | Yes  | none                                                                              | `204`                           | `429 too_many_requests` (3 per hour); `502 email_failed`                                                                | If the email is not verified: issues a new verification token and sends the email **before** answering. If already verified: does nothing (the limiter still counts the call).                  |
| POST   | `/api/auth/change-password`     | Yes  | `ChangePasswordInputSchema`: `currentPassword`, `newPassword`                     | `204`                           | `403 wrong_password`; `429 too_many_requests`                                                                           | Replaces the password hash and deletes all **other** sessions of the user.                                                                                                                      |
| POST   | `/api/auth/delete-account`      | Yes  | `DeleteAccountInputSchema`: `password`                                            | `204` + cleared cookie          | `403 wrong_password`; `429 too_many_requests`                                                                           | Deletes the user row (cascade: CVs, letters, jobs, uploads rows, shares, sessions, tokens, AI usage), then removes the uploaded files from storage (failures are only logged).                  |

Notes:

- `change-password` and `delete-account` share one rate limiter (10 per 15 minutes per user).
- Sign-in, sign-up and the forgot-password email are the only auth routes that read `locale` for emails.

---

## CVs

Code: `apps/api/src/modules/cvs/routes.ts`. Record type `CvRecord`:
`{ id, type: "cv", title, professionId, jobId, revision, document, createdAt, updatedAt }`.
List rows are `DocumentSummary`: `{ id, type, title, jobId, shared, createdAt, updatedAt }`, where
`shared` is true when the CV has an **active** share link.

| Method | Path                                       | Auth | Request body (schema)                                                                                                            | Response                                                                  | Notable errors                                                                                                                                                                    | Side effects                                                                                                                                                                                                                                                                                                        |
| ------ | ------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/cvs`                                 | Yes  | none                                                                                                                             | `200 DocumentSummary[]`, newest `updated_at` first                        | none                                                                                                                                                                              | None.                                                                                                                                                                                                                                                                                                               |
| POST   | `/api/cvs`                                 | Yes  | `CreateCvInputSchema`: `title?`, `professionId?`, `jobId?`, `document?` (all optional; the body may be empty)                    | `201 CvRecord`                                                            | `403 plan_limit`; `404 not_found` ("Job not found"); `400 validation_error` (invalid document or a text over 5000 characters)                                                     | Inserts a CV. Title defaults to "`<Profession>` CV" or "Untitled CV"; document defaults to `createEmptyCv()`. Revision is 1.                                                                                                                                                                                        |
| GET    | `/api/cvs/:id`                             | Yes  | none                                                                                                                             | `200 CvRecord`                                                            | `404 not_found`                                                                                                                                                                   | None.                                                                                                                                                                                                                                                                                                               |
| PATCH  | `/api/cvs/:id`                             | Yes  | `UpdateCvInputSchema`: `revision?`, `title?`, `professionId?`, `jobId?`, `document?`. `revision` is **required** with `document` | `200 CvRecord`                                                            | `409 conflict` (`details.revision` = the current revision, when detected by the check; no details when a parallel save wins); `404 not_found` (CV or Job); `400 validation_error` | In one transaction: if a `document` is sent and no automatic snapshot exists from the last 10 minutes, stores the **old** document as an automatic version; updates the row (document change also does `revision + 1`); prunes old versions. A metadata-only change does not touch the revision or make a snapshot. |
| DELETE | `/api/cvs/:id`                             | Yes  | none                                                                                                                             | `204`                                                                     | `404 not_found`                                                                                                                                                                   | Deletes the CV. Cascades to its versions and share link; jobs and cover letters that pointed at it get `cv_id = null`.                                                                                                                                                                                              |
| POST   | `/api/cvs/:id/duplicate`                   | Yes  | `DuplicateCvInputSchema`: `jobId?` (body may be empty)                                                                           | `201 CvRecord` (the copy, revision 1)                                     | `403 plan_limit`; `404 not_found` (CV or Job)                                                                                                                                     | Inserts a copy. Without `jobId` the title is "Copy of `<title>`". With `jobId` the title is "`<title>` – `<company>`", the copy is linked to that job, and **the job's `cv_id` is set to the copy**. Titles are cut at 200 characters.                                                                              |
| GET    | `/api/cvs/:id/versions`                    | Yes  | none                                                                                                                             | `200 CvVersionSummary[]` (`{ id, label, auto, createdAt }`), newest first | `404 not_found`                                                                                                                                                                   | None.                                                                                                                                                                                                                                                                                                               |
| POST   | `/api/cvs/:id/versions`                    | Yes  | `CreateVersionInputSchema`: `label?` (1 to 100 characters)                                                                       | `201 CvVersionSummary`                                                    | `404 not_found`                                                                                                                                                                   | Stores the CV's **current** document as a manual version (`auto = false`); prunes versions beyond the plan limit.                                                                                                                                                                                                   |
| GET    | `/api/cvs/:id/versions/:versionId`         | Yes  | none                                                                                                                             | `200 { id, label, auto, createdAt, document }`                            | `404 not_found` (CV or Version)                                                                                                                                                   | None.                                                                                                                                                                                                                                                                                                               |
| POST   | `/api/cvs/:id/versions/:versionId/restore` | Yes  | none                                                                                                                             | `200 CvRecord` (with the restored document and `revision + 1`)            | `404 not_found` (CV or Version)                                                                                                                                                   | In one transaction: saves the current document as a version labelled "Before restore" (`auto = false`), then replaces the CV's document with the version's and bumps the revision. No revision check is made. Does not prune.                                                                                       |

---

## Cover letters

Code: `apps/api/src/modules/cover-letters/routes.ts`. `CoverLetterRecord`:
`{ id, type: "coverLetter", title, cvId, jobId, revision, document, createdAt, updatedAt }`.
Same revision rules as CVs, but **no version history**.

| Method | Path                               | Auth | Request body (schema)                                                                                                       | Response                                        | Notable errors                                                                                                       | Side effects                                                                                                                                                                                            |
| ------ | ---------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/cover-letters`               | Yes  | none                                                                                                                        | `200 DocumentSummary[]` (`type: "coverLetter"`) | none                                                                                                                 | None.                                                                                                                                                                                                   |
| POST   | `/api/cover-letters`               | Yes  | `CreateCoverLetterInputSchema`: `title?`, `cvId?`, `jobId?`, `document?`                                                    | `201 CoverLetterRecord`                         | `403 plan_limit` (counts letters; same number as `maxCvs`); `404 not_found` ("CV not found" or "Job not found")      | Inserts a letter (title defaults to "Cover letter", document to `createCoverLetter()`). If `jobId` is given and that job has no cover letter yet, the job's `cover_letter_id` is set to the new letter. |
| GET    | `/api/cover-letters/:id`           | Yes  | none                                                                                                                        | `200 CoverLetterRecord`                         | `404 not_found`                                                                                                      | None.                                                                                                                                                                                                   |
| PATCH  | `/api/cover-letters/:id`           | Yes  | `UpdateCoverLetterInputSchema`: `revision?`, `title?`, `cvId?`, `jobId?`, `document?` (`revision` required with `document`) | `200 CoverLetterRecord`                         | `409 conflict` (`details.revision` when detected early); `404 not_found` (letter, CV or Job); `400 validation_error` | Updates the row; a document change does `revision + 1`. `updated_at` is always refreshed. No snapshots.                                                                                                 |
| DELETE | `/api/cover-letters/:id`           | Yes  | none                                                                                                                        | `204`                                           | `404 not_found`                                                                                                      | Deletes the letter. Its share link is deleted (cascade); jobs that pointed at it get `cover_letter_id = null`.                                                                                          |
| POST   | `/api/cover-letters/:id/duplicate` | Yes  | none                                                                                                                        | `201 CoverLetterRecord`                         | `403 plan_limit`; `404 not_found`                                                                                    | Inserts a copy titled "Copy of `<title>`" with the same `cvId`, `jobId` and document. Does not change any job.                                                                                          |

---

## Resignation letters

Code: `apps/api/src/modules/resignations/routes.ts`. `ResignationRecord`:
`{ id, type: "resignation", title, jobId: null, revision, document, createdAt, updatedAt }`.
`jobId` is always `null` (the field exists so all document types look alike). Same revision rules
as CVs, no version history.

| Method | Path                              | Auth | Request body (schema)                                                                                    | Response                                                       | Notable errors                                          | Side effects                                                                                        |
| ------ | --------------------------------- | ---- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| GET    | `/api/resignations`               | Yes  | none                                                                                                     | `200 DocumentSummary[]` (`type: "resignation"`, `jobId: null`) | none                                                    | None.                                                                                               |
| POST   | `/api/resignations`               | Yes  | `CreateResignationInputSchema`: `title?`, `document?`                                                    | `201 ResignationRecord`                                        | `403 plan_limit`; `400 validation_error`                | Inserts a letter (title defaults to "Resignation letter", document to `createResignationLetter()`). |
| GET    | `/api/resignations/:id`           | Yes  | none                                                                                                     | `200 ResignationRecord`                                        | `404 not_found`                                         | None.                                                                                               |
| PATCH  | `/api/resignations/:id`           | Yes  | `UpdateResignationInputSchema`: `revision?`, `title?`, `document?` (`revision` required with `document`) | `200 ResignationRecord`                                        | `409 conflict`; `404 not_found`; `400 validation_error` | Updates the row; a document change does `revision + 1`.                                             |
| DELETE | `/api/resignations/:id`           | Yes  | none                                                                                                     | `204`                                                          | `404 not_found`                                         | Deletes the letter and its share link (cascade).                                                    |
| POST   | `/api/resignations/:id/duplicate` | Yes  | none                                                                                                     | `201 ResignationRecord`                                        | `403 plan_limit`; `404 not_found`                       | Inserts a copy titled "Copy of `<title>`".                                                          |

---

## Jobs

Code: `apps/api/src/modules/jobs/routes.ts`. The application tracker. `Job`:
`{ id, position, company, status, type, dateSaved, dateApplied, cvId, coverLetterId, notes, location, salary, contact, description, createdAt, updatedAt }`.
`status` is one of `to_apply`, `applied`, `interviewing`, `negotiating`, `accepted`, `rejected`,
`no_answer`. `type` is `remote`, `onsite`, `hybrid` or `null`. Dates such as `dateSaved` are
`YYYY-MM-DD`. Sorting and filtering are done in the browser: there are no query parameters.

| Method | Path            | Auth | Request body (schema)                                                                                                                                                                                                   | Response                                                           | Notable errors                                                                                                                                                               | Side effects                                                                                               |
| ------ | --------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| GET    | `/api/jobs`     | Yes  | none                                                                                                                                                                                                                    | `200 Job[]`, ordered by `dateSaved` then `createdAt`, newest first | none                                                                                                                                                                         | None.                                                                                                      |
| POST   | `/api/jobs`     | Yes  | `CreateJobInputSchema`: `position` and `company` required; optional `status` (default `to_apply`), `type`, `dateApplied`, `cvId`, `coverLetterId`, `notes`, `location`, `salary`, `contact`, `description`, `dateSaved` | `201 Job`                                                          | `404 not_found` ("CV not found" or "Cover letter not found" when the id is not the user's); `400 validation_error` (for example `dateApplied` more than a day in the future) | Inserts a job. `dateSaved` defaults to today (server date, UTC).                                           |
| GET    | `/api/jobs/:id` | Yes  | none                                                                                                                                                                                                                    | `200 Job`                                                          | `404 not_found`                                                                                                                                                              | None.                                                                                                      |
| PATCH  | `/api/jobs/:id` | Yes  | `UpdateJobInputSchema`: any subset of the editable fields (not `dateSaved`)                                                                                                                                             | `200 Job`                                                          | `404 not_found` (job, CV or cover letter); `400 validation_error`                                                                                                            | Updates the given fields and `updated_at`. An empty body `{}` is accepted and only refreshes `updated_at`. |
| DELETE | `/api/jobs/:id` | Yes  | none                                                                                                                                                                                                                    | `204`                                                              | `404 not_found`                                                                                                                                                              | Deletes the job. CVs and cover letters that pointed at it get `job_id = null`.                             |

There is no plan limit on jobs. The API does not fill `dateApplied` from `status`; that rule
(`withStatus` in `packages/shared/src/jobs/jobs.ts`) runs in the browser.

---

## Share links (owner)

Code: `apps/api/src/modules/share/routes.ts` (`shareRoutes`). The same three routes exist for
three kinds of document. `<kind>` is one of `cvs`, `cover-letters`, `resignations`, so the full set
is 9 routes, for example `GET /api/cvs/:id/share`, `PUT /api/cover-letters/:id/share`,
`POST /api/resignations/:id/share/reset`.

`ShareState` is `{ link: ShareLink | null }` where
`ShareLink = { slug, isActive, hidePersonal, createdAt, updatedAt }`. A document has at most one
link. The public address is `/s/<slug>` in the web app (`sharePath`).

| Method | Path                          | Auth | Request body (schema)                                                 | Response                                        | Notable errors                                                 | Side effects                                                                                                                                                                                        |
| ------ | ----------------------------- | ---- | --------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/<kind>/:id/share`       | Yes  | none                                                                  | `200 ShareState` (`link: null` if never shared) | `404 not_found` (`CV`, `Cover letter` or `Resignation letter`) | None.                                                                                                                                                                                               |
| PUT    | `/api/<kind>/:id/share`       | Yes  | `UpdateShareInputSchema`: `isActive?`, `hidePersonal?` (at least one) | `200 ShareState` with the link                  | `404 not_found`; `400 validation_error` ("Nothing to change")  | Upsert. First call creates the link with a new random slug, `isActive` defaulting to **false** and `hidePersonal` to false. Later calls change only the fields sent and keep the slug.              |
| POST   | `/api/<kind>/:id/share/reset` | Yes  | none                                                                  | `200 ShareState` with the link                  | `404 not_found`                                                | Creates the link if missing, otherwise gives it a **new slug** (the old address stops working at once) and sets `isActive = true`. `hidePersonal` is kept on an existing link (false on a new one). |

---

## Public shared documents

Registered in the data scope without `requireUser`, so anyone with the slug can call it.

| Method | Path                | Auth | Request                                                        | Response                                                                                                           | Notable errors                                                                                            | Side effects                                                                                                                                                                                                                        |
| ------ | ------------------- | ---- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/shared/:slug` | No   | `slug` must match `SHARE_SLUG_PATTERN` (`[A-Za-z0-9_-]{8,64}`) | `200 SharedDocument`: `{ type: "cv" \| "coverLetter" \| "resignation", title, document, hidePersonal, updatedAt }` | `404 not_found` ("Shared document not found") for a malformed, unknown or **inactive** slug (same answer) | Headers `x-robots-tag: noindex, nofollow` and `cache-control: private, no-store`. If `hidePersonal` is on, `title` is `""` and the document is run through `hidePersonalDetails` **on the server**, so real details never leave it. |

---

## Uploads

Code: `apps/api/src/modules/uploads/routes.ts`. `Upload` is `{ id, url, contentType, size }` where
`url` is `/api/uploads/<id>`.

| Method | Path               | Auth | Request                                                                     | Response                                                                                                                                  | Notable errors                                                                                 | Side effects                                                                               |
| ------ | ------------------ | ---- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| POST   | `/api/uploads`     | Yes  | `multipart/form-data` with one image file (max 5 MiB; one file per request) | `201 Upload`                                                                                                                              | `400 no_file`; `413 file_too_large`; `415 unsupported_type` (not PNG, JPEG or WebP by content) | Writes the file to storage under `<uuid>.<png\|jpg\|webp>`, then inserts an `uploads` row. |
| GET    | `/api/uploads/:id` | No   | none                                                                        | `200` image bytes with the stored `Content-Type`, `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff` | `404 not_found` (no row, or the file is missing in storage)                                    | None. Public on purpose: documents embed images by URL.                                    |
| DELETE | `/api/uploads/:id` | Yes  | none                                                                        | `204`                                                                                                                                     | `404 not_found` (also for another user's upload)                                               | Deletes the row, then the file in storage.                                                 |

---

## AI

Code: `apps/api/src/modules/ai/routes.ts`. All routes need a signed-in user and send nothing to
the database except the usage counter. Text of the open document comes **in the request**
(`fields`), see [README.md](./README.md#14-the-ai-layer).

Errors common to the three POST routes (everything that calls the provider):
`503 ai_unavailable` (no provider), `429 ai_busy` (global per-minute limit or provider quota),
`429 ai_limit` (daily quota used), `422 ai_blocked`, `502 ai_failed`, `400 validation_error`.
`usage` in every result is `{ used, limit }` for today (UTC).

| Method | Path                   | Auth | Request body (schema)                                                                                                                                           | Response                                                                                                                      | Notable errors                                                                                                 | Side effects                                                                                                                                                |
| ------ | ---------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/ai/status`       | Yes  | none                                                                                                                                                            | `200 AiStatus`: `{ enabled, provider, usage }` (`provider` is the label such as "Google Gemini", empty when off)              | none                                                                                                           | None (reads `ai_usage`).                                                                                                                                    |
| POST   | `/api/ai/fix-mistakes` | Yes  | `FixMistakesInputSchema`: `language` (`en-US`, `en-GB`, `bg`), `fields[]` (`{ path, label, text }`)                                                             | `200 FixMistakesResult`: `{ suggestions[], usage }`; each suggestion has `path`, `label`, `original`, `replacement`, `reason` | common AI errors                                                                                               | Spends one request of the daily quota (refunded if the provider fails). With an empty `fields` list it answers at once and spends nothing.                  |
| POST   | `/api/ai/tailor`       | Yes  | `TailorInputSchema`: `language`, `fields[]`, `jobDescription` (30 to 20 000 characters)                                                                         | `200 TailorResult`: `{ keywords[], advice[], rewrites[], usage }`                                                             | common AI errors                                                                                               | Spends one request.                                                                                                                                         |
| POST   | `/api/ai/assist`       | Yes  | `AssistInputSchema`: `task` (`summary`, `bullets`, `letter`), `language`, `fields[]`, `targetPath?`, `instruction?`, `jobDescription?`, `company?`, `position?` | `200 AssistResult`: `{ texts[], usage }`                                                                                      | common AI errors; `400 invalid_target` (see below); `502 ai_failed` when no usable text is left after cleaning | Spends one request. For `summary` the target is the field with path `targetPath`; for `bullets` the fields under `<targetPath>.`; `letter` needs no target. |

`invalid_target` is returned when `task` is `summary` or `bullets` and `targetPath` is missing
("Choose what to write"), or when `task` is `bullets` and no field lies under the path ("Give the
entry a title first"). That check happens before the quota is touched.

---

## Open questions

- **Upload field name.** The error text says "multipart field named `file`", but the code takes
  the first file of the request whatever the field is called (`request.file()`).
- **`POST /api/cvs` `professionId`.** The body is validated against known profession ids, but the
  database column is a plain `text`; the API never re-checks old rows.
- **Empty JSON bodies.** Several handlers accept `request.body ?? {}` (for example
  `POST /api/cvs`, `POST /api/cvs/:id/duplicate`). How Fastify treats a request that sets
  `Content-Type: application/json` with no body was not tested here; the web app's client is the
  reference for what works.
