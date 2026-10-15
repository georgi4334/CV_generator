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

## Scripts

| Command                             | What it does                                    |
| ----------------------------------- | ----------------------------------------------- |
| `pnpm dev`                          | Run web and api in watch mode                   |
| `pnpm build`                        | Build all packages                              |
| `pnpm lint`                         | ESLint across the repo                          |
| `pnpm typecheck`                    | TypeScript check in every package               |
| `pnpm test`                         | Vitest in every package                         |
| `pnpm format`                       | Format with Prettier                            |
| `pnpm db:up` / `pnpm db:down`       | Start / stop local services                     |
| `pnpm --filter @cv/api db:generate` | Generate SQL migrations from the Drizzle schema |
| `pnpm --filter @cv/api db:migrate`  | Apply migrations                                |

A pre-commit hook (Husky + lint-staged) lints and formats staged files.
