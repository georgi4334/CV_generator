# CV Generator — Development Plan

> Status: **Draft for discussion.** No code yet. Each step ends with a review where we discuss ideas before moving on.

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

## 3. Proposed tech stack

### Frontend (decided)
- **React + TypeScript**, built with **Vite**
- **Tailwind CSS** (CV design values passed in as CSS variables so templates can be recolored at runtime)
- **Axios** for REST calls (one shared instance with interceptors for auth and errors)

### Frontend (proposed, open for discussion)
- **React Router**: routes like `/cvs` (dashboard) and `/cvs/:id/edit`
- **TanStack Query** on top of axios: caching, autosave mutations, loading/error states
- **Zustand**: local editor state (current CV document, selection, undo/redo)
- **dnd-kit**: the "Rearrange" drag-and-drop
- **Zod**: schema validation, shared with the backend
- **TipTap** (optional): rich text for bullet points and summary

### Backend (open for discussion)
**Recommendation: Node.js + TypeScript (NestJS or Fastify) + PostgreSQL + Prisma/Drizzle.**

Why:
- One language across the stack. Types and Zod schemas for the CV document live in a shared package used by both frontend and backend.
- **PostgreSQL with JSONB** fits this domain: users, CVs, versions and share links are relational, while the CV *content* (sections and items that vary by template) is a flexible JSON document stored in a `JSONB` column and validated by Zod.
- PDF export can reuse the same React templates rendered in headless Chromium (Playwright/Puppeteer), so the PDF matches the editor exactly.

| Option | Pros | Cons |
|---|---|---|
| **PostgreSQL (JSONB)** ⭐ | Relational + flexible document; mature; free hosting options (Supabase, Neon) | Needs migrations |
| MongoDB | Document model maps directly to a CV | Weaker for relations (users, versions, sharing) |
| Supabase (Postgres + Auth + Storage) | Auth and file storage (photos, logos) built in, less backend code | Vendor coupling |
| Firebase / Firestore | Fastest to start | Vendor lock-in, harder querying, not SQL |

Alternative backends if you prefer: Java/Spring Boot, .NET or Python/FastAPI. They all work, but we lose the shared TypeScript types.

## 4. Core data model (draft)

```
User        { id, email, name, passwordHash | oauthId, createdAt }
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
- Agree on MVP scope, backend/DB choice, auth approach, and which features are out of scope for v1.
- List the first professions and templates to support.
- **Output:** this plan, updated with the decisions.

### Step 1: Project setup
- Monorepo (pnpm workspaces): `apps/web`, `apps/api`, `packages/shared`.
- Vite + React + TS + Tailwind; ESLint, Prettier, Husky pre-commit hooks.
- Docker Compose for local Postgres.
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
- File storage for photos and logos (local disk in dev, S3-compatible in prod).

### Step 9: Connect frontend ↔ backend
- Axios client (base URL, interceptors, error normalization) plus TanStack Query hooks.
- Debounced **autosave** with a "Saved ✓" indicator, and handling for conflicts and offline.
- Dashboard: list, create, rename, duplicate and delete CVs.

### Step 10: "Create new CV" flow
- Wizard: choose profession → recommended templates → start blank or from example content.
- (Later) import an existing CV from PDF/DOCX or from a LinkedIn export.

### Step 11: Preview, PDF export & sharing
- Preview mode: placeholders and empty sections hidden.
- PDF download, rendered server-side with headless Chromium for pixel-perfect output with selectable text (ATS-friendly).
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

### Step 14: Quality & release
- Unit tests (Vitest), component tests, E2E (Playwright).
- Accessibility, performance, i18n (EN/BG?).
- Deployment, e.g. frontend on Vercel/Netlify, API and DB on Render/Fly/Railway with Neon/Supabase Postgres.

### Step 15 (optional): Premium
- The crown icon suggests premium features (more templates, AI credits, unlimited CVs). Payments via Stripe.

## 6. Open questions for discussion

1. **Backend/DB:** Node + PostgreSQL as recommended, or do you prefer another language, MongoDB, or Supabase/Firebase?
2. **Accounts:** login required from day one, or allow anonymous editing first?
3. **Professions:** which job types and templates should v1 support?
4. **Languages:** English only, or also Bulgarian/other (affects fonts and UI i18n)?
5. **AI:** in scope for v1 or a later phase? Which provider?
6. **Photo on CV:** optional photo support (common in EU CVs, discouraged for US/ATS)?
7. **Import:** do we need to import existing CVs (PDF/DOCX/LinkedIn), and when?
8. **Hosting & budget:** any constraints on where it runs?
