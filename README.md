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
pnpm db:up                                   # start Postgres (docker compose)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm dev                                     # web on :5173, api on :3001
```

Open http://localhost:5173. The page shows whether the API and database are reachable.

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
