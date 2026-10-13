# CV Generator — Development Plan

> Status: **Step 6 done, awaiting review.** Stack and free-tier hosting decided (see §4). Each step ends with a review where we discuss ideas before moving on.
>
> **Decision log**
>
> - App tabs: Dashboard · Documents (All documents / Cover letters / CVs) · Saved Jobs ✅
> - Job statuses: To apply · Applied · Interviewing · Negotiating · Accepted · Rejected · No answer ✅
> - Backend framework: Fastify; ORM: Drizzle ✅
> - Step 0 closed. Step 1 (project setup) ✅. Step 2 (shared domain model) ✅. Step 3 (app shell) ✅. Step 4 (CV renderer) ✅. Step 5 (inline editing) ✅. Step 6 (rearrange) built; awaiting review before Step 7.
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
- **Write cover letters** that match their CV.
- **Track job applications** in a Saved Jobs table linked to the CV and cover letter used for each one.

## 2. App structure & navigation

The app has a persistent main navigation with **three major tabs**. The CV editor (§3) opens full-screen from Documents.

| Tab            | Route                | Purpose                                                 |
| -------------- | -------------------- | ------------------------------------------------------- |
| **Dashboard**  | `/`                  | Overview and quick actions                              |
| **Documents**  | `/documents/:subtab` | Saved CVs and cover letters, with a "Create new" button |
| **Saved Jobs** | `/jobs`              | Job application tracker (table)                         |

### 2.1 Dashboard ✅ approved

- **Quick actions:** New CV · New cover letter · Add job.
- **Recent documents:** the last 3–4 edited CVs and cover letters, with thumbnails.
- **Job pipeline summary:** counts per status (To apply → Applied → Interviewing → Negotiating → Accepted / Rejected / No answer).
- **Reminders:** e.g. jobs still "Applied" after 14+ days with a suggestion to mark them "No answer", and jobs in "To apply" for 7+ days.

### 2.2 Documents (3 sub-tabs) ✅ decided

| Sub-tab                     | Route                      | Content                                                                      |
| --------------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| **All documents** (default) | `/documents/all`           | Every CV and cover letter in one list, with a type badge (CV / Cover letter) |
| **Cover letters**           | `/documents/cover-letters` | Cover letters only                                                           |
| **CVs**                     | `/documents/cvs`           | CVs only                                                                     |

All three sub-tabs share the same list component with these features:

- **Sort** by name, type, last edited or date created; search by title.
- **Select** with a checkbox per row plus "select all".
- **Per-document actions:** open, copy (duplicate), download (PDF), delete. Rename and share are also in the menu.
- **Bulk actions** on the selection: copy, download, delete (with a confirm dialog).
- **"+ Create new"** button. On _All documents_ it opens a small menu (CV / Cover letter); on the other sub-tabs it creates that type directly.
- Each row shows a small live thumbnail, title, type, linked job (if any) and last edited date. A list/grid view toggle is optional.

### 2.3 Saved Jobs (table)

| Column       | Type                   | Notes                                                                                                                                                       |
| ------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Position     | text                   | Click opens the job details drawer                                                                                                                          |
| Company      | text                   |                                                                                                                                                             |
| Status       | badge / dropdown       | `To apply · Applied · Interviewing · Negotiating · Accepted · Rejected · No answer` ✅, editable inline, color per status. New jobs default to **To apply** |
| Date saved   | date                   | Set automatically                                                                                                                                           |
| Date applied | date                   | Set automatically the first time the status becomes Applied; editable                                                                                       |
| Type         | badge                  | `Remote · On-site · Hybrid`                                                                                                                                 |
| Resume       | link to a CV           | Pick an existing CV or "Create tailored copy"                                                                                                               |
| Cover letter | link to a cover letter | Pick an existing one or create a new one                                                                                                                    |
| Notes        | text                   | Short preview in the table; full text in the drawer                                                                                                         |

Table features:

- Sort by any column; filter by status and type; text search.
- Inline editing of status, dates, type and notes.
- "+ Add job" button opens a form or drawer.
- Details drawer: all fields plus **job URL, job description, salary, location, contact person** (proposed extra fields). The job description is what **Check & Tailor** uses later.
- Built with **TanStack Table** (free, MIT; it matches TanStack Query). On mobile the table becomes stacked cards.

## 3. CV editor UI (reference screenshots)

Screenshots are in [`docs/ui-reference/`](ui-reference/):
[editor](ui-reference/01-editor.jpg) · [Design & Font panel](ui-reference/02-design-and-font-panel.jpg) · [Templates panel](ui-reference/03-templates-panel.jpg)

### 3.1 Editor layout

| Area                | What it contains                                                                                                                                                           | Notes                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Top bar, left**   | "AI Assistant" toggle                                                                                                                                                      | Opens the left side panel with the AI chat (later phase).                                                                                                     |
| **Top bar, center** | Fix Mistakes · Check & Tailor (ATS) · Rearrange · **Templates** · **Design & Font**                                                                                        | Templates and Design & Font open in the **left side panel**. The active button is highlighted. Fix Mistakes and Check & Tailor are AI features (later phase). |
| **Top bar, right**  | Undo · Redo · **History** · Help menu (Help Center, Contact Us)                                                                                                            | History lists saved versions with restore.                                                                                                                    |
| **Left side panel** | One panel at a time: Templates, Design & Font, or AI Assistant. Closes with ✕.                                                                                             | The canvas stays visible and updates **live** while settings change.                                                                                          |
| **Canvas**          | A CV page (A4 or US Letter). Two columns: main column (name, headline, contacts, Summary, Experience) and a colored sidebar (Key Achievements, Skills, Courses, Education) | Every field is edited in place; empty fields show grey placeholder text.                                                                                      |
| **Right rail**      | Preview · Download · Share link · AI assistant · Premium (crown)                                                                                                           | Preview = read-only mode without placeholders.                                                                                                                |
| **App theme**       | Screenshots show both a dark and a light app theme                                                                                                                         | Probably a light/dark toggle (see open questions). The CV colors come from the CV design settings, not the app theme.                                         |

### 3.2 Design & Font panel

| Control         | UI                                                                        | Stored as (`design.*`)                                                 |
| --------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Page margins    | Slider with −/+, labels "narrow" to "wide"                                | `pageMargins: 1–5`                                                     |
| Section spacing | Slider with −/+, "compact" to "more space"                                | `sectionSpacing: 1–5`                                                  |
| Colors          | ~6 preset swatches plus "Use custom color" (color picker)                 | `accentColor: '#hex'`. Sidebar and heading colors are derived from it. |
| Font style      | Dropdown (e.g. Rubik)                                                     | `fontFamily`                                                           |
| Font size       | Slider "−A" to "+A", with a label (small / medium / large)                | `fontSize: 1–5`                                                        |
| Line height     | Slider, "condensed" to "spacious"                                         | `lineHeight: 1–5`                                                      |
| Column layout   | 4 thumbnails: variations of sidebar width and filled vs plain sidebar     | `columnLayout: 1–4`                                                    |
| Backgrounds     | Grid of subtle patterns (plain, hexagons, waves, lines, dots, gradients…) | `background: patternId`                                                |

Implementation notes:

- Each slider step maps to a CSS variable value (e.g. `--cv-margin`, `--cv-section-gap`, `--cv-font-size`, `--cv-line-height`), so changes render instantly without re-layout code.
- Fonts are free **Google Fonts, self-hosted** for print and PDF reliability. We pick fonts that also support **Cyrillic**; Rubik does.
- Backgrounds are lightweight **SVG patterns** that print cleanly and are tinted by the accent color.
- Colors: we check contrast so text on the sidebar stays readable.

### 3.3 Templates panel

| Control          | UI                                                                                                                                                        | Stored as                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Template gallery | 2-column grid of thumbnails with names: _Polished, Contemporary, Creative, Timeline, Stylish, Single column, Compact, Multicolumn_. Some include a photo. | `design.templateId`                 |
| Continue Editing | Primary button that closes the panel                                                                                                                      | —                                   |
| Document size    | Toggle **A4 / US Letter**                                                                                                                                 | `design.pageSize: 'A4' \| 'Letter'` |
| Resume language  | Dropdown, e.g. English (US), with an info tooltip                                                                                                         | `content.language`                  |

Implementation notes:

- **Switching template keeps all content.** A template only changes layout and default design values, and the user's own design tweaks can be kept or reset.
- **Thumbnails are live mini-renders** of each template, filled with sample content and scaled down with CSS `transform: scale()`. There are no image files to maintain, and they always match the real templates.
- **"Resume language"** controls the CV's default section titles and placeholders (e.g. "Experience" → "Опит") and spell-check. It is separate from the app's interface language.
- Templates are the visual styles. **Professions** recommend templates and default sections (e.g. a designer → Creative; academic → Single column), but users can pick any template.

## 4. Tech stack

**Constraint:** this is a hobby project that may become paid. Every service must have a **free plan that also allows commercial use**, so going paid later means upgrading a plan, not migrating. To avoid lock-in we stick to portable standards: plain PostgreSQL, the S3 storage API, and standard JWT auth.

### Frontend ✅ decided

- **React + TypeScript**, built with **Vite**
- **Tailwind CSS** (CV design values passed in as CSS variables so templates can be recolored at runtime)
- **Axios** for REST calls (one shared instance with interceptors for auth and errors)
- **React Router** for routes like `/cvs` (dashboard) and `/cvs/:id/edit`
- **TanStack Table** for the Saved Jobs table _(free, MIT)_
- **TanStack Query** on top of axios for caching, autosave mutations and loading/error states
- **Zustand** for local editor state (current CV document, selection, undo/redo)
- **dnd-kit** for "Rearrange" drag-and-drop _(free, MIT)_
- **Zod** for schema validation, shared with the backend _(free, MIT)_

### Backend ✅ decided

- **Node.js + TypeScript**
- Framework: **Fastify** recommended over NestJS. It is lighter and starts fast, which matters on free instances with 512 MB RAM and cold starts. Final pick in Step 1.
- **PostgreSQL** with a **JSONB** column for CV content
- ORM: **Drizzle** or **Prisma**, both free. Final pick in Step 1.
- Shared package `packages/shared` holds TypeScript types and Zod schemas used by both apps.

### Free-tier services

| Need                                 | Choice (free plan)                                                      | Why                                                       | When it becomes paid                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Database                             | **Neon** Postgres (free tier)                                           | Plain Postgres, scales to zero, branching per environment | Paid plan when storage or compute outgrows the free tier                                                             |
| API hosting                          | **Render** free web service (alt: Koyeb)                                | Deploys from GitHub; Docker or Node                       | Free instances sleep after ~15 min idle (cold start ~30–60 s). Upgrade to the smallest paid instance to remove that. |
| Frontend hosting                     | **Cloudflare Pages** (alt: Netlify)                                     | Generous free plan, commercial use allowed                | Rarely needed                                                                                                        |
| File storage (photos, logos)         | **Cloudflare R2**                                                       | S3-compatible, free tier ~10 GB, no egress fees           | Above free storage                                                                                                   |
| Auth                                 | **Self-built** (email/password + Google OAuth, JWT in httpOnly cookies) | Zero cost, no per-user pricing, no lock-in                | Never                                                                                                                |
| Email (verification, password reset) | **Resend** or **Brevo** free tier                                       | Simple API                                                | Above the daily/monthly free limit                                                                                   |
| PDF export                           | **Browser print** (`window.print()` + print CSS) first                  | Zero server cost, selectable text (ATS-friendly)          | Later: server-side headless Chromium on a paid instance for one-click download                                       |
| AI features                          | **Google Gemini** free tier or **Groq** free tier for prototyping       | Free while low volume                                     | Switch or upgrade to a paid model when it's a premium feature                                                        |
| CI                                   | **GitHub Actions**                                                      | Free for public repos; 2,000 min/month for private ones   | Unlikely                                                                                                             |
| Error monitoring                     | **Sentry** free developer plan                                          | Frontend and backend errors                               | Higher event volume                                                                                                  |
| Payments (later)                     | **Stripe**                                                              | No monthly fee, only per-transaction                      | Only when money comes in                                                                                             |

> ⚠️ **Avoid Vercel Hobby** for the frontend: its free plan forbids commercial use. Avoid Render's free Postgres too, because it expires after 30 days; that's why the database is on Neon. Free-tier limits change, so we re-check them when signing up in Step 17.

### Local development (free)

- Docker Compose runs Postgres, so development needs no cloud accounts. A local S3-compatible store (stand-in for R2) is added in Step 8. MinIO no longer publishes Docker images, so we'll pick a maintained alternative then (e.g. Garage or SeaweedFS).

## 5. Core data model

> The source of truth is now the Zod schemas in `packages/shared/src` (Step 2). This section is the overview.

```
User        { id, email, name, passwordHash | oauthId, plan: 'free' | 'pro', createdAt }  // plan field ready for premium later
Cv          { id, userId, title, professionId, templateId, jobId?, design (JSON), content (JSONB), updatedAt } // jobId set for tailored copies
CvVersion   { id, cvId, snapshot (JSONB), label, createdAt }        // history / restore
CoverLetter { id, userId, title, cvId?, jobId?, design (JSON), content (JSONB), updatedAt } // can reuse the linked CV's header & design
Job         { id, userId, position, company, status, type: 'remote' | 'onsite' | 'hybrid',
              dateSaved, dateApplied?, cvId?, coverLetterId?, notes,
              url?, description?, location?, salary?, contact? }
JobStatus   = 'to_apply' | 'applied' | 'interviewing' | 'negotiating' | 'accepted' | 'rejected' | 'no_answer'  // default: 'to_apply'
ShareLink   { id, documentType: 'cv' | 'coverLetter', documentId, slug, isActive, createdAt }
Template    { id, name, layout, defaultDesign, supportsPhoto, tags[] } // defined in code; thumbnails are live renders
Profession  { id, name, recommendedTemplateIds[], defaultSections[], exampleContent }
```

The CV document (`content` + `design`):

```ts
CvDocument {
  header:   { name, headline, phone, email, link, location, photo? }
  sections: Section[]        // ordered; each one has a column: "main" | "sidebar"
  language: 'en-US' | 'en-GB' | 'bg' | ...   // "Resume language": section titles, placeholders, spell-check
  design:   {
    templateId, pageSize: 'A4' | 'Letter',
    pageMargins, sectionSpacing, fontSize, lineHeight,   // 1–5 slider steps
    accentColor, fontFamily, columnLayout, background,
    showIcons, ...
  }
}
Section = { id, type, title, column, visible, items[] }
type ∈ summary | experience | education | skills | achievements | courses
       | projects | languages | certificates | custom ...
```

Splitting **content** from **design** is what lets a user switch template or style without losing anything.

## 6. Step plan

Every step ends with a demo and a discussion before the next one starts.

### Step 0: Discovery & decisions ✅ done

- ✅ Frontend stack, backend direction, and the free-tier hosting rule.
- ✅ App structure, Documents sub-tabs, Saved Jobs columns and statuses, Dashboard, editor panels.
- Remaining questions are deferred to the step where they matter (§7).
- List the first professions and templates to support.
- **Output:** this plan, updated with the decisions.

### Step 1: Project setup ✅ built (awaiting review)

- ✅ Monorepo (pnpm workspaces): `apps/web`, `apps/api`, `packages/shared`.
- ✅ Web: Vite + React 19 + TS + Tailwind v4, React Router, TanStack Query, Axios instance, Zustand installed.
- ✅ API: Fastify 5 + Drizzle ORM + postgres.js, env validated with Zod, `GET /api/health` (checks the database).
- ✅ Shared: Zod schemas consumed as TypeScript source by both apps (bundled into the API build).
- ✅ ESLint, Prettier, Husky + lint-staged pre-commit hook; Vitest in every package.
- ✅ Docker Compose for local Postgres.
- ✅ GitHub Actions CI: format check, lint, typecheck, tests, build.
- **Output:** a start page that calls the API through axios + TanStack Query and shows API/database status.
- Note: TypeScript is pinned to 6.0 because typescript-eslint does not support TypeScript 7 yet.

### Step 2: Shared domain model ✅ built (awaiting review)

All in `packages/shared/src`, as Zod schemas with inferred TypeScript types:

- **`cv/`**: `CvDocument` = `schemaVersion` + `language` + `header` + ordered `sections` + `design`.
  - 10 section types: summary, experience, education, skills, achievements, courses, projects, languages, certificates, custom. Each has `column` (main/sidebar), `visible`, and `title: null` meaning "use the default title for the CV language".
  - Dates are `YYYY` or `YYYY-MM` plus `isCurrent` ("Present").
  - Skills and languages have an optional 1–5 level; the section chooses how to show it (none / bar / dots / text).
  - `design` holds every Templates and Design & Font setting (§3.2–3.3); `DEFAULT_DESIGN` matches the reference screenshot.
  - Default section titles in English (US/UK) and Bulgarian.
  - `createEmptyCv()`, `createSection()`, `createItem()` factories.
- **`professions.ts` + `examples/`**: 5 professions (Software Developer, Designer, Sales & Marketing, Healthcare, Academic & Research), each with recommended templates, a default section layout and a full example CV. Examples are functions, not JSON files, so each copy gets fresh ids.
- **`jobs.ts`**: Saved Jobs fields, 7 statuses with labels, job types, and `withStatus()` which fills in "Date applied".
- **`coverLetter.ts`, `documents.ts`**: cover letter document and the stored record and list-row shapes for Documents.
- `schemaVersion` on stored documents so we can migrate JSONB data later.
- 45 unit tests.

### Step 3: App shell & editor shell (frontend, mock data) ✅ built (awaiting review)

- ✅ Main navigation: Dashboard · Documents · Saved Jobs, plus API status and a theme toggle (system → light → dark, saved in the browser, no flash on load).
- ✅ Dashboard: quick actions, recent documents, job pipeline counts and reminders, from mock data.
- ✅ Documents: All documents / Cover letters / CVs sub-tabs and a "Create new" button (menu on All documents).
- ✅ Saved Jobs: read-only table with all 9 columns and colored status badges.
- ✅ Editor (`/cvs/:id/edit`, `/cover-letters/:id/edit`): top bar (back, AI Assistant, the five tools, undo/redo, History, Help menu), switchable left panel (Templates, Design & Font, AI Assistant) with placeholder content, A4/Letter page canvas and the right rail (Preview, Download, Share, AI, Premium).
- ✅ Preview route (`/cvs/:id/preview`) and a "Page not found" page. `/cvs/new/edit` opens a blank CV.
- Buttons for later steps show a short message saying which step adds them.
- The page canvas shows the real header text and section titles with placeholder lines; the real template renderer is Step 4.
- Mock data lives in `apps/web/src/mocks/data.ts` and is replaced by the API in Step 9.

### Step 4: CV renderer & template system ✅ built (awaiting review)

Code in `apps/web/src/cv-renderer/`.

- ✅ Real-size pages: A4 (794×1123 px) and US Letter, at 96 dpi.
- ✅ Three templates: **Polished** (two columns, sidebar on the right, as in the reference), **Single column** (centered header; sidebar sections follow the main ones), **Compact** (full-width header, narrow sidebar on the left).
- ✅ Every design setting is applied: margins, section spacing, font size and line height (5 steps each), accent color, font, column layout 1–4 (sidebar width and plain / tinted / solid background).
- ✅ Multi-page: content is split into blocks (a section title always stays with its first item), measured in a hidden copy of the page, then poured page by page into each column. It re-measures when content, design or fonts change.
- ✅ Edit mode shows grey placeholders ("Your Name", "Company Name", "Date period"…); preview hides empty fields and sections.
- ✅ Dates ("Mar 2022 – Present"), level dots/bars/labels and section titles in English and Bulgarian.
- ✅ 10 self-hosted fonts with Cyrillic (Fontsource, free); only fonts in use are downloaded.
- ✅ Photo in the header for templates that support it (upload comes in Step 5).
- The other 5 templates fall back to the closest built one until Step 7.
- Known limit: a single item taller than a whole page is not split; it gets a page of its own and is cut off.

### Step 5: Inline editing ✅ built (awaiting review)

- ✅ Click any text on the page to edit it in place (plain text; paste is cleaned). Empty fields show the grey placeholder and are clickable.
- ✅ Bullets: Enter adds the next bullet, Backspace in an empty bullet removes it. Skills work the same way.
- ✅ Hover toolbar on every entry: move up/down, add bullet, add entry below, duplicate, delete. "Add entry" on section titles.
- ✅ Date picker (month + year, "Present") for date ranges; single-date picker for courses and certificates.
- ✅ Icon picker for Key Achievements; click dots/bars to set skill and language levels; click a text level to cycle it.
- ✅ Photo (header toolbar) and company logo upload, resized in the browser and stored in the document until file storage exists (Step 8).
- ✅ Undo/redo: toolbar buttons and Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y. Typing in one field is one undo step.
- ✅ The cursor stays in the field when its entry moves to another page while typing.
- Edits are kept in memory (mock data) until the API exists (Step 9); a page reload resets them. Edits to a brand-new CV are not kept after leaving the editor.
- Also: pnpm now installs changed dependencies automatically before running a script (`verifyDepsBeforeRun`).

### Step 6: Rearrange ✅ built (awaiting review)

- ✅ "Rearrange" opens a left panel with two lists, Main column and Sidebar, in page order.
- ✅ Drag sections (dnd-kit) to reorder them or move them to the other column; also works with the keyboard (Space, arrows, Space). One drag = one undo step.
- ✅ Show/hide a section (eye icon), rename it (empty title = default title in the CV language), delete it (undo with Ctrl+Z).
- ✅ "Add section": any type not on the CV yet, plus any number of Custom sections; summary, experience, education and projects go to the main column, the rest to the sidebar.
- Single-column templates show a note: main sections first, then sidebar sections.

### Step 7: Templates & Design/Font panels

Specification: §3.2 and §3.3.

- **Templates panel:** gallery of live thumbnails (all 8 templates), Continue Editing, A4/US Letter toggle, Resume language dropdown.
- **Design & Font panel:** margin, section spacing, font size and line height sliders; color swatches plus a custom color picker; font dropdown; 4 column layouts; background patterns.
- Every change applies live to the canvas and goes on the undo stack.
- "Reset to template defaults" action.
- **Discuss:** the final font list and color presets, which templates show a photo, and whether some templates or backgrounds become premium (crown).

### Step 8: Backend API & database

- REST endpoints:
  - `GET/POST /cvs`, `GET/PATCH/DELETE /cvs/:id`
  - `POST /cvs/:id/duplicate`
  - `GET /cvs/:id/versions`, `POST /cvs/:id/versions/:vid/restore`
  - `GET /templates`, `GET /professions`
- Postgres schema and migrations; request validation using the shared Zod schemas.
- File storage for photos and logos through the S3 API: a local S3-compatible container in dev (added to Docker Compose here), Cloudflare R2 in prod.
- Simple per-plan limits (e.g. max CVs on the free plan), enforced in one place so premium is easy to switch on later.

### Step 9: Connect frontend ↔ backend

- Axios client (base URL, interceptors, error normalization) plus TanStack Query hooks.
- Debounced **autosave** with a "Saved ✓" indicator, and handling for conflicts and offline.
- **History** panel (top-right): list of automatic and named versions with preview and restore.
- **Documents** page: the shared list component (sort, select, copy, delete, bulk actions) used by the _All documents_ and _CVs_ sub-tabs.

### Step 10: "Create new CV" flow

- Wizard: choose profession → recommended templates → start blank or from example content.
- (Later) import an existing CV from PDF/DOCX or from a LinkedIn export.

### Step 11: Preview, PDF export & sharing

- Preview mode: placeholders and empty sections hidden.
- PDF download, phase 1 (free): browser print with dedicated print CSS (`@page` A4, no margins, colors kept). The text stays selectable, which keeps it ATS-friendly.
- PDF download, phase 2 (when paid hosting exists): server-side headless Chromium for a one-click download that is identical in every browser.
- Public read-only share link (`/s/:slug`) that can be turned on and off.

### Step 12: Saved Jobs tracker

Specification: §2.3.

- Backend: `GET/POST /jobs`, `PATCH/DELETE /jobs/:id`, with filters and sorting.
- Table with sorting, filters, search and inline editing; "+ Add job" form; details drawer.
- Link a job to a resume or cover letter, including "Create tailored copy" (duplicates the CV with `jobId` set).
- Status changes automatically fill in "Date applied".
- **Discuss:** the extra fields, and whether to add a Kanban board view later.

### Step 13: Cover letters

- Cover letter editor that reuses the editor shell, Design & Font panel and PDF export.
- Header (name and contacts) and design can be **inherited from a linked CV**, so letter and CV match.
- Sections: recipient, date, greeting, body paragraphs, closing and signature.
- **Documents → Cover letters** sub-tab; cover letters also appear in _All documents_.
- (Step 16, AI) Generate a draft from a saved job's description plus the linked CV.

### Step 14: Dashboard

Specification: §2.1.

- Quick actions, recent documents, job pipeline counts, reminders.
- Built last among the pages because it summarizes data from Documents and Saved Jobs.

### Step 15: Authentication & accounts

- Email/password and Google OAuth; JWT in httpOnly cookies.
- Ownership checks on every CV endpoint.
- (Possible earlier option: anonymous CVs in local storage, then "sign up to save".)

### Step 16: AI features

- **Fix Mistakes:** grammar and spelling pass with accept/reject per suggestion.
- **Check & Tailor:** paste a job posting, or pick a **Saved Job** → ATS keyword match score, missing skills, suggested rewrites → save as a tailored copy.
- **AI assistant:** generate or improve the summary and experience bullets.
- Calls go through the backend so the API key never reaches the browser.
- Provider behind a small interface, so we can start with a free tier (Gemini/Groq) and switch providers without touching the UI.
- Per-user rate limits to stay inside free quotas. Later these become "AI credits" for premium.

### Step 17: Quality & release

- Unit tests (Vitest), component tests, E2E (Playwright).
- Accessibility, performance, i18n (EN/BG?).
- Deployment on free plans: frontend on Cloudflare Pages, API on Render, DB on Neon, files on Cloudflare R2.
- Sentry for errors; a keep-warm ping is optional, because Render's free plan sleeps when idle.

### Step 18 (optional): Premium

- The crown icon suggests premium features (more templates, AI credits, unlimited CVs). Payments via Stripe, which has no monthly fee.
- Going paid means upgrading hosting plans (Render instance, Neon), not migrating, because the stack is portable.

## 7. Open questions (deferred)

None of these block the early steps. Each one is answered in the step listed; the default applies unless you decide otherwise.

| Question                            | Decide in   | Default assumption                                                        |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------- |
| Login required from day one?        | Step 15     | Single-user dev mode until Step 15; data model already has `userId`       |
| Which professions/templates for v1? | Steps 2 & 7 | Generic set, e.g. Software, Design, Sales/Marketing, Healthcare, Academic |
| English only or Bulgarian too?      | Step 7      | Cyrillic-capable fonts; resume language EN-US, EN-GB, BG                  |
| AI in v1?                           | Step 16     | Later phase                                                               |
| Photo on CV?                        | Step 4      | Optional, only in templates that support it                               |
| Import existing CVs?                | After v1    | Later                                                                     |
| Repo visibility                     | Step 1      | CI runs on either                                                         |
| Light/dark app theme?               | Step 3      | Toggle that follows the system setting by default                         |
