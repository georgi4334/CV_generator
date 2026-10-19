<a id="readme-top"></a>

<div align="center">

<img src="docs/screenshots/logo.svg" alt="Vitae logo" width="80" height="80">

# Vitae

**CVs, cover letters and job tracking, with a little help from AI.**

Build and style CVs, cover letters and resignation letters, share them as read-only links, and keep track of every job you apply for.

[![CI](https://github.com/georgi4334/CV_generator/actions/workflows/ci.yml/badge.svg)](https://github.com/georgi4334/CV_generator/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle-4169E1?logo=postgresql&logoColor=white)
![Node](https://img.shields.io/badge/Node-22%2B-5FA04E?logo=nodedotjs&logoColor=white)

[Features](#features) · [Getting started](#getting-started) · [AI features](#ai-features) · [Deployment](#deployment) · [Documentation](#documentation)

<img src="docs/screenshots/editor.webp" alt="The CV editor with the Templates panel open" width="900">

</div>

<details>
<summary><b>Table of contents</b></summary>

- [About the project](#about-the-project)
- [Features](#features)
- [Screenshots](#screenshots)
- [Built with](#built-with)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [AI features](#ai-features)
- [Languages](#languages)
- [Tests](#tests)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

</details>

## About the project

Vitae (from _curriculum vitae_) is a hobby project for writing a CV once and sending it many times: edit the document right on the page, switch the template with one click, and keep a list of the jobs you applied to next to it.
It is also a playground for trying AI features (spell and wording fixes, matching a CV to a job description, a writing assistant) on top of the free Google Gemini tier.

It runs entirely on free plans and is meant for personal and family use, not as a business.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Features

**Documents**

- **CVs** you edit in place, with autosave, undo/redo, version history, zoom and a live multi-page layout.
- **16 templates** grouped by kind of work (Professional, Design & creative, Marketing, Sales), and a Design & Font panel for colours, fonts, spacing, column layout, background patterns and photo.
- **Examples to start from** for developers, designers, sales and marketing, healthcare and academic CVs, or start blank.
- **Cover letters** and **resignation letters** that match the CV's look, filled in from a CV or a saved job.
- **PDF download** and a **print layout** with proper page margins.
- **Share links**: a read-only page anyone can open, with an option to hide your name, contacts and photo (done on the server, so the real details never reach the visitor).

**Job tracking**

- **Saved jobs** with status, dates, notes, salary, contact and the CV used.
- A **dashboard** with the pipeline, an application funnel, response rate and reminders (no answer for 14 days, saved for a week without applying).

**AI** (Google Gemini, free tier)

- **Fix Mistakes**: spelling and wording suggestions you accept one by one.
- **Check & Tailor**: compares a CV with a job description and suggests honest edits.
- **AI Assistant**: a writing helper for summaries and bullet points.

**Around it**

- Accounts with email confirmation and password reset.
- English, Bulgarian and German interface, and Cyrillic-capable fonts.
- Light and dark themes; layouts for phones; keyboard-friendly menus, a skip link and automatic accessibility tests (axe).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/dashboard.webp" alt="Dashboard with recent documents, job pipeline and funnel"><br><sub>Dashboard</sub></td>
    <td width="50%"><img src="docs/screenshots/dashboard-dark.webp" alt="The dashboard in the dark theme"><br><sub>Dark theme</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/documents.webp" alt="The Documents list"><br><sub>Documents: CVs, cover letters and resignation letters</sub></td>
    <td width="50%"><img src="docs/screenshots/phone.webp" alt="Dashboard and a CV on a phone"><br><sub>On a phone</sub></td>
  </tr>
</table>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Built with

| Part       | Technology                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| Web app    | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Zustand, i18next                      |
| API        | Fastify 5, TypeScript, Drizzle ORM, PostgreSQL                                                                  |
| Shared     | Zod schemas and types used by both the web app and the API (`packages/shared`)                                  |
| AI         | Google Gemini through the API's own provider layer (a mock provider for development and tests)                  |
| Tests      | Vitest, Testing Library, Playwright (with axe accessibility checks)                                             |
| Production | Cloudflare Pages, Render, Neon, Cloudflare R2, Brevo, Sentry (all on free plans, see [Deployment](#deployment)) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting started

### Requirements

- Node.js 22+ (see `.nvmrc`)
- pnpm 10 (`corepack enable` picks the version from `package.json`)
- Docker Desktop, for the local Postgres database

### Installation

```bash
pnpm install
pnpm db:up                                   # start Postgres (docker compose, port 5433)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm dev                                     # web on :5173, api on :3001
```

Open http://localhost:5173 and create an account. In development the emails (confirm your address, reset your password) are printed in the API terminal: copy the link from there.

Notes:

- Docker's Postgres listens on port **5433** so it does not clash with a PostgreSQL installed directly on your computer (which usually uses 5432). If you created `apps/api/.env` before this change, update its `DATABASE_URL` to port 5433.
- If you used the app before accounts existed, the **first account you create takes over** those CVs, cover letters, saved jobs and images. Accounts created afterwards start empty. (This is switched off when `NODE_ENV=production`.)
- After a `git pull`, just run `pnpm dev` again: if dependencies changed, pnpm installs them first (`verifyDepsBeforeRun` in `pnpm-workspace.yaml`).

The API applies database migrations when it starts, and in development the web app proxies `/api` to it. See the endpoint table in [`docs/PLAN.md`](docs/PLAN.md) (Step 8).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Configuration

Settings for the API live in `apps/api/.env` (copy from `.env.example`).

### Accounts and cookies

| Variable           | Default                                       | Meaning                                                                                |
| ------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `CORS_ORIGIN`      | `http://localhost:5173,http://127.0.0.1:5173` | Web addresses allowed to call the API (also used to refuse writes from other websites) |
| `APP_URL`          | `http://localhost:5173`                       | Where the web app lives; links in emails point here                                    |
| `COOKIE_SECURE`    | `true` in production, otherwise `false`       | Send the session cookie over HTTPS only                                                |
| `COOKIE_SAME_SITE` | `lax`                                         | `none` when web app and API are on different sites (requires `COOKIE_SECURE=true`)     |
| `TRUST_PROXY`      | `false`                                       | `true` behind a hosting proxy, so rate limits use the real client address              |

Production-only settings (storage, email, proxy secret, error reporting) are in [`docs/DEPLOY.md`](docs/DEPLOY.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## AI features

Fix Mistakes, Check & Tailor and the AI Assistant use Google Gemini. Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey) (no card needed) and add it to `apps/api/.env`:

| Variable            | Default                         | Meaning                                                                        |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `GEMINI_API_KEY`    | (empty: AI off)                 | Your Gemini API key. Stays on the server; the browser never sees it            |
| `GEMINI_MODEL`      | `gemini-flash-latest`           | The Gemini model; the default always points at Google's current Flash model    |
| `AI_PROVIDER`       | `gemini` with a key, else `off` | `mock` gives fake answers to try the features without a key (development only) |
| `AI_MAX_PER_MINUTE` | `10`                            | AI requests per minute for the whole API, to stay inside the free quota        |

Each account can make 30 AI requests per day. When Gemini's quota is reached the app says the AI is busy and does not count that request.

> **Privacy note:** on Google's free tier, the text you send may be used to improve Google's products, and Google's terms only allow paid use for people in the EU, UK and Switzerland. Fine for trying things out; avoid putting sensitive details (ID numbers, health information) into CVs you run through the AI.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Languages

The interface is available in English, Bulgarian and German (dropdown in the header). Texts live in
`apps/web/src/i18n/locales/{en,bg,de}`; see [`apps/web/src/i18n/README.md`](apps/web/src/i18n/README.md) for how to add or change them.

## Tests

- `pnpm test`: unit and API tests. The API tests use a `cv_generator_test` database, created automatically on the Postgres from `pnpm db:up`. Without a running Postgres they are skipped with a warning (CI always runs them).
- `pnpm e2e`: browser tests with Playwright against the production builds, a fresh `cv_generator_e2e` database and the mock AI, including automatic accessibility checks (axe). They cover desktop and a phone. The first time, install the browser: `pnpm --filter @cv/e2e exec playwright install chromium`.

CI runs the format check, lint, type checks, tests and build, then the browser tests, on every push and pull request.

## Scripts

| Command                             | What it does                                    |
| ----------------------------------- | ----------------------------------------------- |
| `pnpm dev`                          | Run web and api in watch mode                   |
| `pnpm build`                        | Build all packages                              |
| `pnpm test`                         | Vitest in every package                         |
| `pnpm e2e`                          | Browser tests (Playwright)                      |
| `pnpm lint`                         | ESLint across the repo                          |
| `pnpm typecheck`                    | TypeScript check in every package               |
| `pnpm format`                       | Format with Prettier                            |
| `pnpm db:up` / `pnpm db:down`       | Start / stop local services                     |
| `pnpm --filter @cv/api db:generate` | Generate SQL migrations from the Drizzle schema |
| `pnpm --filter @cv/api db:migrate`  | Apply migrations                                |

A pre-commit hook (Husky + lint-staged) lints and formats staged files.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Deployment

Everything can run on free plans:

```
Browser ──► Cloudflare Pages (web app + /api proxy) ──► Render (API) ──► Neon (Postgres)
                                                          ├──► Cloudflare R2 (uploaded images)
                                                          ├──► Brevo (account emails)
                                                          ├──► Google Gemini (AI features)
                                                          └──► Sentry (errors, optional)
```

Step-by-step guide, including what each service gives you and how to test emails and AI: [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Project structure

```
apps/
  web/        React + TypeScript + Vite + Tailwind (React Router, TanStack Query, Axios, Zustand)
  api/        Fastify + TypeScript + Drizzle ORM (PostgreSQL)
packages/
  shared/     Zod schemas and TypeScript types shared by web and api
e2e/          Browser tests (Playwright)
docs/         Plan, deployment guide, architecture, screenshots
```

Inside the apps, code is organised by feature; see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the folder map and the import rules.

## Documentation

| Document                                                     | What is in it                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`docs/PLAN.md`](docs/PLAN.md)                               | The development plan, decisions, API endpoints and what was built |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)               | Folder map and import rules                                       |
| [`docs/DEPLOY.md`](docs/DEPLOY.md)                           | Deploying on free plans and troubleshooting emails                |
| [`apps/web/src/i18n/README.md`](apps/web/src/i18n/README.md) | Adding or changing translations                                   |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

- [x] CV editor with templates, design settings, photo, version history and PDF
- [x] Cover letters and resignation letters
- [x] Saved jobs, dashboard and reminders
- [x] Accounts, share links and "hide my personal details"
- [x] AI: Fix Mistakes, Check & Tailor, AI Assistant
- [x] English, Bulgarian and German, light and dark themes, phone layouts
- [ ] First deployment on free plans
- [ ] Try the AI features with real use on the Gemini free tier

Ideas are collected in [`docs/PLAN.md`](docs/PLAN.md); there is no fixed schedule.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

This is a personal project, but suggestions and bug reports are welcome.

1. Open an issue describing the idea or the bug.
2. For a change, fork the repository and create a branch from `dev`.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm e2e` before you push; the pre-commit hook formats staged files.
4. Open a pull request against `dev`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

No license has been chosen yet, so all rights are reserved. Please ask before reusing the code.

## Contact

Georgi: [@georgi4334](https://github.com/georgi4334). Project link: <https://github.com/georgi4334/CV_generator>

## Acknowledgments

- [Google Gemini](https://ai.google.dev/) for the AI features
- [Fontsource](https://fontsource.org/) for the self-hosted open-source fonts
- [Lucide](https://lucide.dev/) for the icons
- [Shields.io](https://shields.io/) for the badges
- Free plans of Cloudflare, Render, Neon, Brevo and Sentry that make a hobby deployment possible

<p align="right">(<a href="#readme-top">back to top</a>)</p>
