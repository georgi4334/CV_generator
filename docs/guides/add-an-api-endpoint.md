# Add an API endpoint and a database change

Use this guide when the web app needs something the API does not offer yet: a new route, a new column, or a new table. The worked example is the Saved Jobs module (`apps/api/src/modules/jobs/routes.ts`), which is small and has every ingredient. Resignation letters (commit `93ae6bb`) show a bigger case with a new table.

## Prerequisites

- Docker running Postgres: `pnpm db:up` (port 5433, see [README](../../README.md)).
- `apps/api/.env` copied from `apps/api/.env.example`.
- Background: [../api/README.md](../api/README.md), [../data-model.md](../data-model.md), and the list of existing routes in [../api/endpoints.md](../api/endpoints.md).

## How a request flows

`buildApp` in `apps/api/src/app.ts` registers everything under the `/api` prefix. Routes in the "Acting for the signed-in user" scope run an `onRequest` hook, `requireUser(database)`, which reads the session cookie and sets `request.user` (`id`, `plan`, locale...). If you register your module in that scope, you get authentication for free. Public routes (health, share links, auth) are registered outside it.

Errors are thrown, not returned. `registerErrorHandler` (`apps/api/src/infra/errors.ts`) turns them into `{ "error": { "code", "message", "details"? } }`:

- `HttpError(status, code, message, details?)` becomes that status and code.
- A `ZodError` (from `.parse`) becomes `400 validation_error`.
- Anything else becomes `500 internal_error`.

## Steps

### 1. Define the input and output in the shared package

File: `packages/shared/src/<area>/<name>.ts`, exported from `packages/shared/src/index.ts`. The API validates with these schemas and the web app validates responses with the same ones. From `packages/shared/src/jobs/jobs.ts`:

```ts
export const CreateJobInputSchema = z.object({
  ...jobFields,
  status: jobFields.status.default('to_apply'),
  // ...
})
export type CreateJobInput = z.input<typeof CreateJobInputSchema>

export const UpdateJobInputSchema = z.object({ ...jobFields /* ... */ }).partial()
export const JobSchema = z.object({ ...jobFields, id: IdSchema /* ... */ })
```

Put length limits on every string (`.max(...)`); user text must not be unbounded.

### 2. Add the table or column (only if you store something new)

Tables are in `apps/api/src/db/schema/`, one file per area, re-exported from `apps/api/src/db/schema/index.ts`. A new table needs the user column with cascade, so deleting an account deletes the rows:

```ts
export const resignations = pgTable(
  'resignations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    document: jsonb('document').$type<ResignationDocument>().notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('resignations_user_updated_idx').on(t.userId, t.updatedAt.desc())],
)
```

Then add `export * from './yourTable'` to `schema/index.ts`; `drizzle.config.ts` reads that file.

### 3. Generate the migration

Commands from `apps/api/package.json`:

```bash
cd apps/api
pnpm db:generate     # drizzle-kit generate: writes drizzle/00NN_name.sql and meta/
```

Open the new SQL file and read it. Rename it to something meaningful if you like (existing ones are `0008_resignations.sql`, `0007_share_hide_personal.sql`). Commit the SQL **and** the `drizzle/meta/` changes (`_journal.json` and the new snapshot).

Migrations are applied automatically when the API starts (`MIGRATE_ON_START` defaults to true; code in `apps/api/src/db/migrate.ts`) and by the API test setup (`test/support/globalSetup.ts`). To apply by hand: `pnpm db:migrate`. `pnpm db:studio` opens a database browser.

Rules of thumb:

- Never edit a migration that is already on `main`. Add a new one.
- New NOT NULL columns on an existing table need a default, or the migration fails on a table with rows.
- Do not hand-edit the `meta/` snapshots.

### 4. Write the routes

File: `apps/api/src/modules/<name>/routes.ts`, exporting `async function xxxRoutes(app, opts: { database })`. Pattern from `jobs/routes.ts`:

```ts
const IdParams = z.object({ id: z.uuid() })

app.get('/jobs/:id', async (request) => {
  const { id } = IdParams.parse(request.params)
  const [row] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.userId, request.user.id)))
  if (!row) throw notFound('Job')
  return toJob(row)
})
```

The rules that keep users apart:

1. **Every query filters by `request.user.id`**, including update and delete (`.where(and(eq(jobs.id, id), eq(jobs.userId, request.user.id)))`).
2. **Another user's row is "not found"**, never "forbidden": `throw notFound('Job')` gives 404 for both a missing id and someone else's id, so ids cannot be probed.
3. **Linked ids in the body must be owned too.** Jobs do this with `assertOwnCv` and `assertOwnLetter` before insert and update.
4. Convert database rows to the shared type in a `toXxx` function (dates to ISO strings), so the response always matches the schema.
5. Create answers `201` (`reply.status(201).send(...)`), delete answers `204`.
6. Saving a whole document uses a `revision` check and returns `409 conflict` when it is stale (see `cvs/routes.ts`). Copy that pattern for new document types.

Register the module in `apps/api/src/app.ts` inside the signed-in scope:

```ts
await scope.register(jobRoutes, { database })
```

Note that CORS allows `GET, POST, PUT, PATCH, DELETE` only.

### 5. Errors, plan limits, rate limits

- Use `notFound('Thing')` for 404 and `new HttpError(status, 'code', 'English message')` for the rest. Reuse existing codes when they fit: `conflict` (409), `plan_limit` (403), `forbidden` (403), `too_many_requests` (429), `validation_error` (400).
- **Plan limits:** `PLAN_LIMITS` in `packages/shared/src/api/api.ts` has `maxCvs`, `maxVersionsPerCv`, `aiRequestsPerDay` per plan (`free`, `pro`). The CV routes check with `assertCanCreate(request.user.id, request.user.plan)` and throw `HttpError(403, 'plan_limit', ...)`. Add a new entry to `PLAN_LIMITS` if your feature has a cap.
- **Rate limits:** `createRateLimiter({ max, windowMs })` in `apps/api/src/infra/rateLimit.ts` is an in-memory fixed window. Create it once when the routes are registered, call `limiter.hit(key)` per request, and throw a 429 when it returns `false`. The AI module uses `'all'` as the key; auth uses account and IP keys. It protects one API instance only.
- **A new error code must get a translation.** Add it to `apps/web/src/i18n/locales/{en,bg,de}/errors.ts`; the web app shows `errors.<code>` and falls back to the server's English message (`apps/web/src/shared/api/errorMessage.ts`).

### 6. Web side

Three files per feature, following `apps/web/src/features/jobs/`:

1. `api.ts` has typed calls and validates responses with the shared schema:

   ```ts
   async list() {
     const { data } = await api.get('/jobs')
     return z.array(JobSchema).parse(data)
   },
   ```

2. `queries.ts` has TanStack Query hooks (`useQuery`, `useMutation`) and a keys object (`jobKeys`). Update the cache in `onSuccess` instead of refetching when you can; `useUpdateJob` shows an optimistic update with rollback.
3. Components call the hooks only, never `api` directly. Show failures with `errorMessage(error)`.

**Fake API for tests.** Route-level web tests do not use the network. `apps/web/src/test/appHarness.ts` mocks each `api.ts` module with a fake from `apps/web/src/test/fakeCvApi.ts` (see `jobsApi` there; it throws `ApiRequestError(404, 'not_found', ...)` for missing rows). For a new module: add a fake object to `createFakeCvApi()`, return it from there, add a `vi.mock('@/features/<name>/api', ...)` block in `appHarness.ts`, and clear your state in the fake's `reset()`.

### 7. API tests

Tests live in `apps/api/test/modules/<name>.test.ts` and use `useTestApp()` (`apps/api/test/support/context.ts`): a real app on a real test database (`TEST_DATABASE_URL`, default port 5433), emptied before each test, with a signed-in user (`ctx.cookie`) and `ctx.signUp(email)` for a second one.

```ts
describe.skipIf(!dbAvailable)('jobs API', () => {
  const ctx = useTestApp()
  const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    ctx.app.inject({ method, url: `/api${url}`, payload, headers: { cookie: ctx.cookie } })
  // ...
})
```

Cover: success and defaults, validation (`400`), not found (`404` with a random uuid), unauthenticated (`401`), plan or rate limit if any.

**Add a cross-user isolation test** to `apps/api/test/modules/isolation.test.ts`. Pattern:

```ts
it('jobs: only your own, and a job cannot link to someone else’s CV', async () => {
  const { a, b } = await setup()
  const job = (await a('POST', '/jobs', { position: 'Dev', company: 'Acme' })).json()
  expect((await b('GET', '/jobs')).json()).toEqual([])
  for (const [method, url, payload] of [
    ['GET', `/jobs/${job.id}`],
    // PATCH and DELETE as well
  ] as const) {
    expect((await b(method, url, payload)).statusCode, `${method} ${url}`).toBe(404)
  }
})
```

**New table: add it to the `truncate` list** in `useTestApp` (`apps/api/test/support/context.ts`: `truncate users, cvs, cv_versions, uploads, share_links, jobs, cover_letters, resignations, sessions, auth_tokens cascade`). If you forget, data leaks between tests. `ai_usage` is not in that list, but it cascades from `users` (it has `onDelete: 'cascade'`).

Tests that need Postgres are skipped locally when it is down, but CI sets `REQUIRE_DB_TESTS=1`, so they never skip there.

### 8. Document it

Add the endpoint to [../api/endpoints.md](../api/endpoints.md): method, path, auth, body schema, response, error codes. If you added a table, update [../data-model.md](../data-model.md). If the change is user-visible, add a line to `docs/PLAN.md` (see how earlier entries read).

## Verification checklist

```bash
pnpm db:up
pnpm --filter @cv/api db:generate      # nothing new should be generated if you already did
pnpm --filter @cv/api test
pnpm --filter @cv/web test
pnpm typecheck && pnpm lint && pnpm format:check
pnpm build
pnpm e2e                               # if a user flow changed
```

Also try it by hand with the app running (`pnpm dev`): a second browser profile (second account) must not see the first account's data.

## Common mistakes

- Forgetting `userId` in the `where` of an update or delete. The tests above catch it only if you wrote the isolation test.
- Returning 403 for someone else's data. Use 404.
- Editing an old migration instead of adding a new one.
- Forgetting the new table in the test `truncate` list.
- Not committing `drizzle/meta/`: other developers get a broken migration state.
- A new error code with no translation: users see an English server message.
- Adding a required field to a shared input schema without a `.default()`: old web clients in open tabs fail with `400`.
- Doing sorting or filtering that the browser already does (see the comment on `jobRoutes`).

## Open questions

- I found no automated check that a new table is in the test `truncate` list; it relies on you remembering. A test that compares it with `schema/index.ts` would help.
