# CV Generator — Development Plan

> Status: **Step 0 in progress.** Stack and free-tier hosting decided (see §3). No code yet. Each step ends with a review where we discuss ideas before moving on.
>
> **Decision log**
> - Frontend: React + TS + Vite + Tailwind + Axios + React Router + TanStack Query + Zustand ✅
> - Backend: Node + TypeScript + PostgreSQL (JSONB) with shared Zod types ✅
> - Only free plans that allow commercial use; keep everything portable so it can become paid later ✅

## 1. Goal

A web app where a user can:

- **Create** a new CV from scratch, from an example, or from a job/profession preset.
- **Update** existing CVs (inline editing, like the reference screenshot).
- **Switch styles**: pick a template that fits their job (e.g. developer, designer, sales, academic, healthcare), and change colors, fonts and layout without losing content.
- **Keep variants**: duplicate a CV and tailor it for a specific job posting.
- **Export / share**: download a PDF, share a read-only link.

## 2. Reference UI breakdown (edit mode)

| Area | What it contains | Notes |
|---|---|---|
| **Top toolbar** | Fix Mistakes · Check & Tailor (ATS) · Rearrange · Templates · Design & Font | Fix Mistakes and Check & Tailor are AI features (later phase). |
| **Canvas** | A4 page, two columns: main column (name, headline, contacts, Summary, Experience) and a colored sidebar (Key Achievements, Skills, Courses, Education) | Every field is edited in place; empty fields show grey placeholder text. |
| **Right rail** | Preview · Download · Share link · AI assistant · Premium (crown) | Preview = read-only mode without placeholders. |
| **Theme** | Dark app chrome, teal accent | Accent and sidebar color come from the CV design settings, not the app theme. |

## 3. Tech stack

**Constraint:** this is a hobby project that may become paid. Every service must have a **free plan that also allows commercial use**, so going paid later means upgrading a plan, not migrating. To avoid lock-in we stick to portable standards: plain PostgreSQL, the S3 storage API, and standard JWT auth.

### Frontend ✅ decided
- **React + TypeScript**, built with **Vite**
- **Tailwind CSS** (CV design values passed in as CSS variables so templates can be recolored at runtime)
- **Axios** for REST calls (one shared instance with interceptors for auth and errors)
- **React Router** for routes like `/cvs` (dashboard) and `/cvs/:id/edit`
- **TanStack Query** on top of axios for caching, autosave mutations and loading/error states
- **Zustand** for local editor state (current CV document, selection, undo/redo)
- **dnd-kit** for "Rearrange" drag-and-drop *(free, MIT)*
- **Zod** for schema validation, shared with the backend *(free, MIT)*

### Backend ✅ decided
- **Node.js + TypeScript**
- Framework: **Fastify** recommended over NestJS. It is lighter and starts fast, which matters on free instances with 512 MB RAM and cold starts. Final pick in Step 1.
- **PostgreSQL** with a **JSONB** column for CV content
- ORM: **Drizzle** or **Prisma**, both free. Final pick in Step 1.
- Shared package `packages/shared` holds TypeScript types and Zod schemas used by both apps.

### Free-tier services

| Need | Choice (free plan) | Why | When it becomes paid |
|---|---|---|---|
| Database | **Neon** Postgres (free tier) | Plain Postgres, scales to zero, branching per environment | Paid plan when storage or compute outgrows the free tier |
| API hosting | **Render** free web service (alt: Koyeb) | Deploys from GitHub; Docker or Node | Free instances sleep after ~15 min idle (cold start ~30–60 s). Upgrade to the smallest paid instance to remove that. |
| Frontend hosting | **Cloudflare Pages** (alt: Netlify) | Generous free plan, commercial use allowed | Rarely needed |
| File storage (photos, logos) | **Cloudflare R2** | S3-compatible, free tier ~10 GB, no egress fees | Above free storage |
| Auth | **Self-built** (email/password + Google OAuth, JWT in httpOnly cookies) | Zero cost, no per-user pricing, no lock-in | Never |
| Email (verification, password reset) | **Resend** or **Brevo** free tier | Simple API | Above the daily/monthly free limit |
| PDF export | **Browser print** (`window.print()` + print CSS) first | Zero server cost, selectable text (ATS-friendly) | Later: server-side headless Chromium on a paid instance for one-click download |
| AI features | **Google Gemini** free tier or **Groq** free tier for prototyping | Free while low volume | Switch or upgrade to a paid model when it's a premium feature |
| CI | **GitHub Actions** | Free for public repos; 2,000 min/month for private ones | Unlikely |
| Error monitoring | **Sentry** free developer plan | Frontend and backend errors | Higher event volume |
| Payments (later) | **Stripe** | No monthly fee, only per-transaction | Only when money comes in |

> ⚠️ **Avoid Vercel Hobby** for the frontend: its free plan forbids commercial use. Avoid Render's free Postgres too, because it expires after 30 days; that's why the database is on Neon. Free-tier limits change, so we re-check them when signing up in Step 14.

### Local development (free)
- Docker Compose runs Postgres and MinIO (an S3-compatible stand-in for R2), so development needs no cloud accounts.

## 4. Core data model (draft)

```
User        { id, email, name, passwordHash | oauthId, plan: 'free' | 'pro', createdAt }  // plan field ready for premium later
Cv          { id, userId, title, professionId, templateId, design (JSON), content (JSONB), updatedAt }
CvVersion   { id, cvId, snapshot (JSONB), label, createdAt }        // history / restore
ShareLink   { id, cvId, slug, isActive, createdAt }
Template    { id, name, layout, defaultDesign, previewImage, tags[] } // could start as code, not DB
Profession  { id, name, recommendedTemplateIds[], defaultSections[], exampleContent }
```

The CV document (`content` + `design`):

```ts
CvDocument {
  header:   { name, headline, phone, email, link, location, photo? }
  sections: Section[]        // ordered; each one has a column: "main" | "sidebar"
  design:   { templateId, accentColor, sidebarColor, font, fontSize, spacing, showIcons, ... }
}
Section = { id, type, title, column, visible, items[] }
type ∈ summary | experience | education | skills | achievements | courses
       | projects | languages | certificates | custom ...
```

Splitting **content** from **design** is what lets a user switch template or style without losing anything.

## 5. Step plan

Every step ends with a demo and a discussion before the next one starts.

### Step 0: Discovery & decisions *(now)*
- ✅ Frontend stack, backend direction, and the free-tier hosting rule.
- Still open: MVP scope, accounts on day one or later, and which features are out of scope for v1.
- List the first professions and templates to support.
- **Output:** this plan, updated with the decisions.

### Step 1: Project setup
- Monorepo (pnpm workspaces): `apps/web`, `apps/api`, `packages/shared`.
- Vite + React + TS + Tailwind; ESLint, Prettier, Husky pre-commit hooks.
- Pick Fastify vs NestJS and Drizzle vs Prisma.
- Docker Compose for local Postgres and MinIO (S3 stand-in).
- GitHub Actions CI: lint, typecheck, tests.
- **Output:** empty app that builds, runs and passes CI.

### Step 2: Shared domain model
- Define `CvDocument`, `Section` and item types as Zod schemas in `packages/shared`.
- Write a few sample CVs as JSON fixtures (one per profession).
- **Discuss:** the exact section types and fields.

### Step 3: Editor shell (frontend, mock data)
- App layout from the screenshot: dark chrome, top toolbar, centered A4 canvas, right icon rail.
- Routing: Dashboard → Editor → Preview.
- Toolbar and rail buttons wired to empty panels/modals.
- **Output:** a clickable UI on mock data, no backend.

### Step 4: CV renderer & template system
- A4 page component (210×297 mm, print-accurate units).
- First 2–3 templates: **Two-column sidebar** (as in the screenshot), **Classic single column**, **Modern/compact**.
- Templates read design tokens (colors, font, spacing) through CSS variables.
- Multi-page support: content flows onto page 2 when it overflows. This is technically the hardest part, so we tackle it early.
- **Discuss:** the template list per profession.

### Step 5: Inline editing
- Click any text to edit in place, with placeholders like "Company Name" and "Date period".
- Add/remove/duplicate items, edit bullet lists, pick achievement icons, upload company logo or photo.
- Hover controls per section and per item.
- Undo/redo; keyboard friendly.

### Step 6: Rearrange
- Drag-and-drop sections within a column and between main and sidebar.
- Show/hide sections; add custom sections.

### Step 7: Templates & Design/Font panels
- Template picker with live previews, filtered or recommended by profession.
- Design panel: accent and sidebar color, font family (with **Cyrillic support** if you need Bulgarian CVs), font size, spacing, icons on/off.

### Step 8: Backend API & database
- REST endpoints:
  - `GET/POST /cvs`, `GET/PATCH/DELETE /cvs/:id`
  - `POST /cvs/:id/duplicate`
  - `GET /cvs/:id/versions`, `POST /cvs/:id/versions/:vid/restore`
  - `GET /templates`, `GET /professions`
- Postgres schema and migrations; request validation using the shared Zod schemas.
- File storage for photos and logos through the S3 API: MinIO in dev, Cloudflare R2 in prod.
- Simple per-plan limits (e.g. max CVs on the free plan), enforced in one place so premium is easy to switch on later.

### Step 9: Connect frontend ↔ backend
- Axios client (base URL, interceptors, error normalization) plus TanStack Query hooks.
- Debounced **autosave** with a "Saved ✓" indicator, and handling for conflicts and offline.
- Dashboard: list, create, rename, duplicate and delete CVs.

### Step 10: "Create new CV" flow
- Wizard: choose profession → recommended templates → start blank or from example content.
- (Later) import an existing CV from PDF/DOCX or from a LinkedIn export.

### Step 11: Preview, PDF export & sharing
- Preview mode: placeholders and empty sections hidden.
- PDF download, phase 1 (free): browser print with dedicated print CSS (`@page` A4, no margins, colors kept). The text stays selectable, which keeps it ATS-friendly.
- PDF download, phase 2 (when paid hosting exists): server-side headless Chromium for a one-click download that is identical in every browser.
- Public read-only share link (`/s/:slug`) that can be turned on and off.

### Step 12: Authentication & accounts
- Email/password and Google OAuth; JWT in httpOnly cookies.
- Ownership checks on every CV endpoint.
- (Possible earlier option: anonymous CVs in local storage, then "sign up to save".)

### Step 13: AI features
- **Fix Mistakes:** grammar and spelling pass with accept/reject per suggestion.
- **Check & Tailor:** paste a job posting → ATS keyword match score, missing skills, suggested rewrites → save as a tailored copy.
- **AI assistant:** generate or improve the summary and experience bullets.
- Calls go through the backend so the API key never reaches the browser.
- Provider behind a small interface, so we can start with a free tier (Gemini/Groq) and switch providers without touching the UI.
- Per-user rate limits to stay inside free quotas. Later these become "AI credits" for premium.

### Step 14: Quality & release
- Unit tests (Vitest), component tests, E2E (Playwright).
- Accessibility, performance, i18n (EN/BG?).
- Deployment on free plans: frontend on Cloudflare Pages, API on Render, DB on Neon, files on Cloudflare R2.
- Sentry for errors; a keep-warm ping is optional, because Render's free plan sleeps when idle.

### Step 15 (optional): Premium
- The crown icon suggests premium features (more templates, AI credits, unlimited CVs). Payments via Stripe, which has no monthly fee.
- Going paid means upgrading hosting plans (Render instance, Neon), not migrating, because the stack is portable.

## 6. Open questions for discussion

1. **Accounts:** login required from day one, or allow anonymous editing first?
2. **Professions:** which job types and templates should v1 support?
3. **Languages:** English only, or also Bulgarian/other (affects fonts and UI i18n)?
4. **AI:** in scope for v1 or a later phase?
5. **Photo on CV:** optional photo support (common in EU CVs, discouraged for US/ATS)?
6. **Import:** do we need to import existing CVs (PDF/DOCX/LinkedIn), and when?
7. **Repo visibility:** public or private? Public gets unlimited free GitHub Actions minutes; private gets 2,000 min/month.
