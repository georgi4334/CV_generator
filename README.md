# CV Generator

Build, style and update CVs and cover letters, and track job applications.

See [`docs/PLAN.md`](docs/PLAN.md) for the full development plan and decisions.

## Project structure

```
apps/
  web/        React + TypeScript + Vite + Tailwind (React Router, TanStack Query, Axios, Zustand)
  api/        Fastify + TypeScript + Drizzle ORM (PostgreSQL)
packages/
  shared/     Zod schemas and TypeScript types shared by web and api
docs/         Plan and UI reference screenshots
```

## Requirements

- Node.js 22+ (see `.nvmrc`)
- pnpm 10 (`corepack enable` picks the version from `package.json`)
- Docker Desktop, for the local Postgres database

## Getting started

```bash
pnpm install
pnpm db:up                                   # start Postgres (docker compose, port 5433)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm dev                                     # web on :5173, api on :3001
```

Docker's Postgres listens on port **5433** so it does not clash with a PostgreSQL installed directly on your computer (which usually uses 5432). If you created `apps/api/.env` before this change, update its `DATABASE_URL` to port 5433.

Open http://localhost:5173 and create an account. In development the emails (confirm your address, reset your password) are printed in the API terminal: copy the link from there.

If you used the app before accounts existed, the **first account you create takes over** those CVs, cover letters, saved jobs and images. Accounts created afterwards start empty. (This is switched off when `NODE_ENV=production`.)

After a `git pull`, just run `pnpm dev` again: if dependencies changed, pnpm installs them first (`verifyDepsBeforeRun` in `pnpm-workspace.yaml`).

## API

The API runs on http://localhost:3001 and applies database migrations when it starts. In development the web app proxies `/api` to it. See the endpoint table in [`docs/PLAN.md`](docs/PLAN.md) (Step 8).

`pnpm test` also runs the API's database tests against a `cv_generator_test` database, created automatically on the Postgres from `pnpm db:up`. Without a running Postgres they are skipped with a warning (CI always runs them).

### Account settings (`apps/api/.env`)

| Variable           | Default                                       | Meaning                                                                                |
| ------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `CORS_ORIGIN`      | `http://localhost:5173,http://127.0.0.1:5173` | Web addresses allowed to call the API (also used to refuse writes from other websites) |
| `APP_URL`          | `http://localhost:5173`                       | Where the web app lives; links in emails point here                                    |
| `COOKIE_SECURE`    | `true` in production, otherwise `false`       | Send the session cookie over HTTPS only                                                |
| `COOKIE_SAME_SITE` | `lax`                                         | `none` when web app and API are on different sites (requires `COOKIE_SECURE=true`)     |
| `TRUST_PROXY`      | `false`                                       | `true` behind a hosting proxy, so rate limits use the real client address              |

### AI features (`apps/api/.env`)

Fix Mistakes, Check & Tailor and the AI Assistant use Google Gemini. Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey) and add it:

| Variable            | Default                         | Meaning                                                                        |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `GEMINI_API_KEY`    | (empty: AI off)                 | Your Gemini API key. Stays on the server; the browser never sees it            |
| `GEMINI_MODEL`      | `gemini-flash-latest`           | The Gemini model; the default always points at Google's current Flash model    |
| `AI_PROVIDER`       | `gemini` with a key, else `off` | `mock` gives fake answers to try the features without a key (development only) |
| `AI_MAX_PER_MINUTE` | `10`                            | AI requests per minute for the whole API, to stay inside the free quota        |

Each account can make 30 AI requests per day on the free plan.

## Tests

- `pnpm test`: unit and API tests (the API tests use the Postgres from `pnpm db:up`).
- `pnpm e2e`: browser tests with Playwright against the production builds, a fresh
  `cv_generator_e2e` database and the mock AI, including automatic accessibility checks (axe).
  The first time, install the browser: `pnpm --filter @cv/e2e exec playwright install chromium`.

## Deployment

Free plans: Cloudflare Pages (web), Render (API), Neon (database), Cloudflare R2 (images),
Brevo (emails), Gemini (AI), Sentry (errors). Step-by-step guide: [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Scripts

| Command                             | What it does                                    |
| ----------------------------------- | ----------------------------------------------- |
| `pnpm dev`                          | Run web and api in watch mode                   |
| `pnpm e2e`                          | Browser tests (Playwright)                      |
| `pnpm build`                        | Build all packages                              |
| `pnpm lint`                         | ESLint across the repo                          |
| `pnpm typecheck`                    | TypeScript check in every package               |
| `pnpm test`                         | Vitest in every package                         |
| `pnpm format`                       | Format with Prettier                            |
| `pnpm db:up` / `pnpm db:down`       | Start / stop local services                     |
| `pnpm --filter @cv/api db:generate` | Generate SQL migrations from the Drizzle schema |
| `pnpm --filter @cv/api db:migrate`  | Apply migrations                                |

A pre-commit hook (Husky + lint-staged) lints and formats staged files.
