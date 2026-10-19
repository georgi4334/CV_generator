# Add a new document type

Use this guide when you want a fourth kind of document next to CVs, cover letters and resignation letters (for example a reference letter). It is a big change: the resignation letter commit (`93ae6bb`, "Add resignation letters, created from Documents") touched 83 files. Read that commit with `git show --stat 93ae6bb` and keep it open while you work. This guide follows its file set and names the same files.

If you only need a new look for CVs, use [add-a-template.md](add-a-template.md). If you only need a new field in a CV, use [add-a-section-or-field.md](add-a-section-or-field.md).

## Prerequisites

- The document is a JSON document with its own schema, stored in its own table, like the other three (see [../data-model.md](../data-model.md) and [../domain-model.md](../domain-model.md)).
- You have read [add-an-api-endpoint.md](add-an-api-endpoint.md): this guide does not repeat the migration steps.
- Decide the product questions first, because they decide how much work it is. The resignation letter answered them like this:
  - Created only from Documents (no dashboard button; recent ones still show on the dashboard).
  - No templates, no sections, no photo, no AI assistant, no Check & Tailor (so it needs `toolUnavailable` messages).
  - Has Design & Font, Fix Mistakes, autosave, undo, conflict handling, zoom, preview, PDF, share link and "Hide my personal details".
  - Not linked to a saved job (`jobId` is always `null`).

I call the new type `xxx` below.

## How to find every place

The type name `'coverLetter'` appears in a fixed set of non-test files. Search for it and check that each file also handles your type:

```bash
grep -rln "'coverLetter'" apps packages e2e --include=*.ts --include=*.tsx | grep -v node_modules
```

At the time of writing this lists 19 non-test files (the cover-letter module itself, the share and document schemas, the editor, preview, documents, dashboard and print code, and the test fakes). TypeScript helps a lot: most places are `Record<DocumentType, ...>` or exhaustive checks, so adding the type to `DocumentType` makes the compiler list the rest.

## Steps

### 1. Shared package

| File                                         | Change                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/shared/src/xxx/xxx.ts` (new)       | `XxxDocumentSchema` with `schemaVersion: z.literal(XXX_SCHEMA_VERSION)`, `language`, content fields and `design: CvDesignSchema`; limits (`RESIGNATION_LIMITS`, `resignationFieldMaxLength`, `resignationWithinLimits`); defaults per CV language (`RESIGNATION_DEFAULTS`); a factory (`createResignationLetter`). |
| `packages/shared/src/index.ts`               | `export * from './resignation/resignation'`                                                                                                                                                                                                                                                                        |
| `packages/shared/src/documents/documents.ts` | Add to `DocumentTypeSchema` (`z.enum(['cv', 'coverLetter', 'resignation'])`) and add `XxxRecordSchema` (type literal, `revision`, `document`).                                                                                                                                                                     |
| `packages/shared/src/api/api.ts`             | `SaveableXxxSchema` (document schema + limit refinements) and `CreateXxxInputSchema` / `UpdateXxxInputSchema` (a document save needs a `revision`).                                                                                                                                                                |
| `packages/shared/src/documents/share.ts`     | `SharedXxxSchema`, add it to the `SharedDocumentSchema` union, and a branch in `hidePersonalDetails` that masks personal data (names, contacts, employer...) and scrubs those words from the free text.                                                                                                            |
| `packages/shared/src/ai/ai.ts`               | `xxxFields(doc)` if Fix Mistakes should work (`resignationFields`).                                                                                                                                                                                                                                                |
| `packages/shared/src/cv/design.ts`           | Nothing, but remember `letterDesign` / `letterTemplateFor`: the factory takes the design from a CV and maps its template to one the page renderer can draw.                                                                                                                                                        |
| tests                                        | `resignation.test.ts`, `share.test.ts` (new document hides what it must), `textLimit.test.ts` if limits changed.                                                                                                                                                                                                   |

Same rule as for sections: the schema must keep reading old stored documents. Limits are enforced when saving (`Saveable...` in `api.ts`) and while typing, not when reading.

### 2. API

| File                                              | Change                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/db/schema/xxx.ts` (new)             | Table with `id`, `userId` (cascade), `title`, `document` JSONB typed `$type<XxxDocument>()`, `revision`, timestamps, an index on `(userId, updatedAt desc)`. Pattern: `schema/resignations.ts`.                                                                                                           |
| `apps/api/src/db/schema/index.ts`                 | `export * from './xxx'`                                                                                                                                                                                                                                                                                   |
| `apps/api/src/db/schema/shareLinks.ts`            | New unique nullable column `xxxId` referencing the table with cascade, and the check constraint `share_links_one_document` now counts all ids (`... = 1`).                                                                                                                                                |
| `apps/api/drizzle/00NN_xxx.sql` + `drizzle/meta/` | Generate with `pnpm --filter @cv/api db:generate`. Check that the SQL drops and re-adds the check constraint (see `0008_resignations.sql`).                                                                                                                                                               |
| `apps/api/src/modules/xxx/routes.ts` (new)        | `GET/POST /xxx`, `GET/PATCH/DELETE /xxx/:id`, `POST /xxx/:id/duplicate`. Copy `modules/resignations/routes.ts`: every query filters by `userId`, `PATCH` compares `revision` and answers `409 conflict`, create checks the plan limit (`assertCanCreate`; resignations reuse `PLAN_LIMITS[plan].maxCvs`). |
| `apps/api/src/app.ts`                             | `await scope.register(xxxRoutes, { database })` in the signed-in scope.                                                                                                                                                                                                                                   |
| `apps/api/src/modules/share/routes.ts`            | Add an entry to `KINDS` (`path`, `table`, `column`, `name`) so `GET/PUT /xxx/:id/share` and `POST /xxx/:id/share/reset` exist; extend the `key` choice; extend the public `GET /share/:slug` query (a `leftJoin` and a new branch) and the `hidePersonalDetails` call.                                    |
| `apps/api/src/modules/auth/routes.ts`             | The "first account takes over the old dev data" code moves rows table by table: add `tx.update(xxx).set(move)...`. Easy to forget.                                                                                                                                                                        |
| tests                                             | `apps/api/test/modules/xxx.test.ts`; a case in `isolation.test.ts`; share cases in `share.test.ts`; add the table to the `truncate` list in `apps/api/test/support/context.ts`.                                                                                                                           |

Account deletion works through `onDelete: 'cascade'` on `userId`.

### 3. Web: the feature folder

New folder `apps/web/src/features/xxx/`, modelled on `features/resignation/`:

- `api.ts`: `xxxApi` with `list/get/create/update/remove/duplicate/getShare/setShare/resetShare`, each response parsed with a shared schema.
- `queries.ts`: `xxxKeys` (`list`, `detail(id)`, `share(id)`), `useXxxList`, `useXxx`, create/duplicate/rename/delete hooks and `rememberXxx` (keeps the list and the detail cache in step).
- `state/xxxEditorStore.ts`: a Zustand store with the document, `past`/`future` for undo, `setField(path, value)`, `endTyping()`.
- `state/xxxSession.ts`: an `AutosaveController` (from `features/cv-editor/state/autosave.ts`), `flushXxxSave()`, `loadXxxIntoEditor()`, `overwriteXxxServerCopy()`, and an `EditorApi` object where the CV-only functions are no-ops (`resignationEditorApi`).
- `pages/NewXxxPage.tsx` (the creation form) and `pages/XxxEditorPage.tsx` (wraps `EditorLayout`, provides `AiTargetContext` and `DesignTarget`).
- `xxx.test.tsx`: route-level tests (import `@/test/appHarness` first).

### 4. Web: the renderer

`apps/web/src/renderer/document/ResignationRenderer.tsx` draws the page with the shared helpers: `RenderContext`, `pageStyle`, `layoutTokens`, `backgroundStyle`, `Field` for every editable text, and the exported `Paragraphs` from `LetterRenderer.tsx` (it takes a `hint` function for custom placeholders). Then:

- `renderer/index.ts`: export `XxxRenderer` and `XxxThumbnail`.
- `renderer/document/CvThumbnail.tsx`: add `XxxThumbnail` (not interactive, `staticLinks`).
- `renderer/placeholders.ts`: add the grey hint keys in English **and** Bulgarian (CV language texts).
- `renderer/editing/EditableText.tsx`: typing limit lookup. It already chains `fieldMaxLength(path) ?? resignationFieldMaxLength(path)`; add yours.

### 5. Web: every place that lists or switches on document type

Registered in the resignation commit:

| File                                                                                                                                 | Change                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/lazyPages.ts`, `app/router.tsx`                                                                                                 | Lazy `NewXxxPage`; routes `xxx/new`, `xxx/:id/edit` (`<EditorPage type="xxx" />`), `xxx/:id/preview` (`<PreviewPage type="xxx" />`).                                                              |
| `shared/lib/paths.ts`                                                                                                                | `NEW_XXX_PATH`, `editPath`, and a new entry in `DOCUMENT_SUBTABS` (`/documents/xxx`).                                                                                                             |
| `shared/ui/Badges.tsx`, `shared/ui/badgeStyles.ts`                                                                                   | Icon and colour per type (resignation: `DoorOpen`, amber).                                                                                                                                        |
| `features/documents/DocumentsPage.tsx`                                                                                               | Fetch the list, merge it with the others, `DOCUMENT_TYPE_OF_SUBTAB`, `DELETE_TITLE` / `DELETE_MESSAGE`, a "Create new" menu entry, and a `subtab === 'resignations'` branch in `CreateNewButton`. |
| `features/documents/documentActions.ts`                                                                                              | `rename`, `duplicate`, `remove` and `download` branches.                                                                                                                                          |
| `features/dashboard/DashboardPage.tsx`                                                                                               | Merge the list into "recent documents" and draw its thumbnail. Do not add a quick action unless the product wants one.                                                                            |
| `features/cv-editor/pages/EditorPage.tsx`, `PreviewPage.tsx`                                                                         | Pick your editor and a `XxxPreview` (renderer, `FitToWidth`, `ShareDialog type="xxx"`, download with `printDocument`).                                                                            |
| `features/cv-editor/layout/{EditorLayout,EditorRail,EditorToolbar,EditorTopBar,ConflictBanner,tools}.ts(x)`, `state/designTarget.ts` | `kind` now is `DocumentType`; `toolUnavailable(kind, panel)` returns the reason a tool does not apply (the editor shows it as a notice); `ConflictBanner` uses `editor.conflict.${kind}`.         |
| `features/ai/aiTarget.ts`, `useAiTargets.ts`                                                                                         | `useXxxAiTarget` if the AI panels apply (see [add-an-ai-feature.md](add-an-ai-feature.md)).                                                                                                       |
| `features/print/printCv.ts`, `PrintHost.tsx`                                                                                         | Add `{ kind: 'xxx', ... }` to `Printable` and render it in `PrintView`. PDF is the browser's print dialog, so this is all it takes.                                                               |
| `features/share/SharedDocumentPage.tsx`, `share/queries.ts`                                                                          | `UNTITLED` title key, the print branch, the renderer branch; `SHARE_API` and `KEYS` maps.                                                                                                         |
| `features/auth/queries.ts`, `features/auth/sessionState.ts`                                                                          | Flush your pending save on logout (`flushXxxSave()`); reset your store in `resetClientState`. Forgetting this leaks one user's open letter into the next session.                                 |
| `test/fakeCvApi.ts`, `test/appHarness.ts`                                                                                            | A fake `xxxApi` (and `seedXxx`), `vi.mock('@/features/xxx/api', ...)`, and reset.                                                                                                                 |

### 6. i18n (all of `en`, `bg`, `de`)

In `apps/web/src/i18n/locales/{en,bg,de}/`:

- new file `xxx.ts` (page and editor messages) and its line in `index.ts` (both the import and the `en`/`bg`/`de` object);
- `labels.ts`: `documentType.xxx`;
- `documents.ts`: sub-tab name, `createXxx`, delete confirm title and message;
- `editor.ts`: `conflict.xxx`, and `topBar.*` messages for tools that do not apply;
- `share.ts`: `page.untitledXxx`.

The key-parity test in `i18n.test.tsx` and `pnpm typecheck` catch gaps.

### 7. Docs and plan

Update [../api/endpoints.md](../api/endpoints.md), [../data-model.md](../data-model.md), `docs/ARCHITECTURE.md` (feature folder list) and add a line to `docs/PLAN.md`, as the resignation commit did.

### 8. E2E

`e2e/tests/documents.spec.ts` got one scenario in the resignation commit: creating from Documents (not from the dashboard), filling from a CV, checking the text, and listing it under its sub-tab. See [add-an-e2e-test.md](add-an-e2e-test.md).

## Verification checklist

```bash
pnpm typecheck            # most missed places show up here
pnpm --filter @cv/shared test
pnpm --filter @cv/api test        # needs pnpm db:up
pnpm --filter @cv/web test
pnpm lint && pnpm format:check
pnpm build
pnpm e2e
```

By hand, for each of the three views (editor, preview, shared link):

- Create, edit, wait for "Saved", reload.
- Open in two tabs, edit in both: the conflict banner appears and "Load the other version" / "Keep my version" both work.
- Documents: listed under "All" and its own tab; rename, duplicate, delete, download PDF.
- Dashboard: recent documents show a correct thumbnail.
- Share: create the link, open it in a private window; switch on "Hide my personal details" and check no real name, email, phone, company or address is left, including inside the free text and the page title.
- Sign out with unsaved edits, sign in as another user: nothing from the first user is visible.
- Dark theme, phone width, Bulgarian and German.

## Common mistakes

- Forgetting the new id in the share check constraint: inserts fail at runtime with a database error.
- Forgetting the dev-data takeover in `auth/routes.ts`.
- Forgetting the test `truncate` list.
- A share link that returns the real data: the hiding must happen on the server (`publicShareRoutes`), not in the browser.
- Forgetting `resetClientState` and the logout flush.
- Using the CV template picker for a document without templates; show the reason with `toolUnavailable` instead of an empty panel.
- Only handling `DocumentType` in `cv` / `coverLetter` ternaries (`doc.type === 'cv' ? a : b`). Use maps keyed by type, as the resignation commit did in `documentActions.ts` and `DocumentsPage.tsx`.

## Open questions

- Resignations reuse `PLAN_LIMITS.maxCvs` as their limit (the comment in `modules/resignations/routes.ts` says so). A new type may deserve its own entry in `PLAN_LIMITS`.
