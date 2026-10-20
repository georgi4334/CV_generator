# Vitae (CV generator) — Development Plan

> Status: **Step 17 done, awaiting review.** Stack and free-tier hosting decided (see §4). Each step ends with a review where we discuss ideas before moving on.
>
> **Decision log**
>
> - App tabs: Dashboard · Documents (All documents / Cover letters / CVs) · Saved Jobs ✅
> - Job statuses: To apply · Applied · Interviewing · Negotiating · Accepted · Rejected · No answer ✅
> - Backend framework: Fastify; ORM: Drizzle ✅
> - Step 0 closed. Step 1 (project setup) ✅. Step 2 (shared domain model) ✅. Step 3 (app shell) ✅. Step 4 (CV renderer) ✅. Step 5 (inline editing) ✅. Step 6 (rearrange) ✅. Step 7 (templates & design) ✅. Step 8 (API & database) ✅. Step 9 (frontend ↔ API) ✅. Step 10 ("Create new CV" wizard) ✅. Step 11 (PDF download & share links) ✅. Step 12 (Saved Jobs) ✅. Step 13 (cover letters) ✅. Step 14 (Dashboard) ✅. Step 15 (accounts) ✅. Step 16 (AI features) ✅. Step 17 (quality & release) built; awaiting review.
> - Choosing a template applies its suggested font, column layout and spacing; the user can change them afterwards ✅
> - Frontend: React + TS + Vite + Tailwind + Axios + React Router + TanStack Query + Zustand ✅
> - Backend: Node + TypeScript + PostgreSQL (JSONB) with shared Zod types ✅
> - Only free plans that allow commercial use; keep everything portable so it can become paid later ✅
> - Saved Jobs extra fields: salary, location, contact person (no job URL or description for now); no Kanban board ✅
> - Placeholders on the CV follow the CV language (English US/UK, Bulgarian) ✅
> - Accounts: email + password now, Google sign-in as a small separate step later (needs your own Google Cloud client ID and secret); open sign-up; emails go through a provider interface (printed in the API log locally, Brevo or Resend plugged in at deployment); the first account inherits the old local "dev" data ✅
> - **Deviation from the original plan:** sessions are opaque random tokens stored (hashed) in the database and sent in an httpOnly cookie, **not JWTs**. Logging out, changing or resetting a password can then end sessions immediately, which a JWT cannot do without a blocklist. Still portable plain Postgres; no extra cost ✅
> - AI: Google Gemini free tier behind a provider interface (key only on the server); all three features in one step; Saved Jobs get a "Job description" field; free plan: 30 AI requests per user per day ✅
> - Release: Cloudflare Pages proxies `/api` to Render (no domain needed, first-party cookie); emails via Brevo; Bulgarian interface later as its own step; draft privacy policy and terms ✅
> - Interface languages: English, Bulgarian, German, switched from a header dropdown without reloading (the CV keeps its own language) ✅

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
- Details drawer: all fields plus **salary, location, contact person** ✅. (A job description field can be added in Step 16 if Check & Tailor should compare the CV with the posting.)
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
| **Right rail**      | Preview · Download · Share link · AI assistant                                                                                                                             | Preview = read-only mode without placeholders.                                                                                                                |
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

**Constraint:** this is a hobby project that may become paid. Every service must have a **free plan that also allows commercial use**, so going paid later means upgrading a plan, not migrating. To avoid lock-in we stick to portable standards: plain PostgreSQL, the S3 storage API, and standard cookie sessions.

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

| Need                                 | Choice (free plan)                                                                       | Why                                                       | When it becomes paid                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Database                             | **Neon** Postgres (free tier)                                                            | Plain Postgres, scales to zero, branching per environment | Paid plan when storage or compute outgrows the free tier                                                             |
| API hosting                          | **Render** free web service (alt: Koyeb)                                                 | Deploys from GitHub; Docker or Node                       | Free instances sleep after ~15 min idle (cold start ~30–60 s). Upgrade to the smallest paid instance to remove that. |
| Frontend hosting                     | **Cloudflare Pages** (alt: Netlify)                                                      | Generous free plan, commercial use allowed                | Rarely needed                                                                                                        |
| File storage (photos, logos)         | **Cloudflare R2**                                                                        | S3-compatible, free tier ~10 GB, no egress fees           | Above free storage                                                                                                   |
| Auth                                 | **Self-built** (email/password + Google OAuth, server-side sessions in httpOnly cookies) | Zero cost, no per-user pricing, no lock-in                | Never                                                                                                                |
| Email (verification, password reset) | **Resend** or **Brevo** free tier                                                        | Simple API                                                | Above the daily/monthly free limit                                                                                   |
| PDF export                           | **Browser print** (`window.print()` + print CSS) first                                   | Zero server cost, selectable text (ATS-friendly)          | Later: server-side headless Chromium on a paid instance for one-click download                                       |
| AI features                          | **Google Gemini** free tier or **Groq** free tier for prototyping                        | Free while low volume                                     | Switch or upgrade to a paid model if free limits run out                                                             |
| CI                                   | **GitHub Actions**                                                                       | Free for public repos; 2,000 min/month for private ones   | Unlikely                                                                                                             |
| Error monitoring                     | **Sentry** free developer plan                                                           | Frontend and backend errors                               | Higher event volume                                                                                                  |
| Payments (later)                     | **Stripe**                                                                               | No monthly fee, only per-transaction                      | Only when money comes in                                                                                             |

> ⚠️ **Avoid Vercel Hobby** for the frontend: its free plan forbids commercial use. Avoid Render's free Postgres too, because it expires after 30 days; that's why the database is on Neon. Free-tier limits change, so we re-check them when signing up in Step 17.

### Local development (free)

- Docker Compose runs Postgres, so development needs no cloud accounts. Uploaded images are stored on local disk (`apps/api/uploads/`) in development.

## 5. Core data model

> The source of truth is now the Zod schemas in `packages/shared/src` (Step 2). This section is the overview.

```
User        { id, email, name, passwordHash?, emailVerifiedAt?, oauthId? (Google, later), plan: 'free' | 'pro', createdAt }
Session     { id, userId, tokenHash, createdAt, lastUsedAt, expiresAt }   // one per signed-in browser; only a hash of the cookie token is stored
AuthToken   { id, userId, purpose: 'password_reset' | 'email_verification', tokenHash, expiresAt, usedAt? }  // one-time email links
Cv          { id, userId, title, professionId, templateId, jobId?, design (JSON), content (JSONB), updatedAt } // jobId set for tailored copies
CvVersion   { id, cvId, snapshot (JSONB), label, createdAt }        // history / restore
CoverLetter { id, userId, title, cvId?, jobId?, revision, document (JSONB: header, recipient, date, greeting, paragraphs, closing, signature, design), updatedAt } // header & design copied from the linked CV
Job         { id, userId, position, company, status, type: 'remote' | 'onsite' | 'hybrid',
              dateSaved, dateApplied?, cvId?, coverLetterId?, notes,
              description, location?, salary?, contact? }   // description = the pasted job posting (Step 16)
AiUsage     { userId, day, count }   // AI requests per user per day (UTC), for the plan's daily limit
JobStatus   = 'to_apply' | 'applied' | 'interviewing' | 'negotiating' | 'accepted' | 'rejected' | 'no_answer'  // default: 'to_apply'
ShareLink   { id, cvId | coverLetterId (exactly one), slug, isActive, createdAt, updatedAt } // one per document; deleted with it
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
- ✅ Editor (`/cvs/:id/edit`, `/cover-letters/:id/edit`): top bar (back, AI Assistant, the five tools, undo/redo, History, Help menu), switchable left panel (Templates, Design & Font, AI Assistant) with placeholder content, A4/Letter page canvas and the right rail (Preview, Download, Share, AI).
- ✅ Preview route (`/cvs/:id/preview`) and a "Page not found" page. `/cvs/new/edit` opens a blank CV.
- Buttons for later steps show a short message saying which step adds them.
- The page canvas shows the real header text and section titles with placeholder lines; the real template renderer is Step 4.
- Mock data lives in `apps/web/src/mocks/data.ts` and is replaced by the API in Step 9.

### Step 4: CV renderer & template system ✅ built (awaiting review)

Code in `apps/web/src/renderer/`.

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

### Step 7: Templates & Design/Font panels ✅ built (awaiting review)

Specification: §3.2 and §3.3.

- ✅ All 8 templates: Polished, **Contemporary** (colored header band), **Creative** (bold accent name, solid left sidebar, bar titles), **Timeline** (one column, entries on a vertical line), **Stylish** (centered header between rules, pill titles, tinted left sidebar), Single column, Compact, **Multicolumn** (two near-equal columns).
- ✅ Templates panel: live thumbnails of the user's own CV in every template, Continue Editing, A4 / US Letter, Resume language (English US/UK, Bulgarian) with an info tooltip.
- ✅ Design & Font panel: page margins, section spacing, font size (Extra small … Extra large) and line height sliders with −/+; 6 color presets plus custom color (picker + hex) with a readability warning for light colors; font list shown in each font; 4 column layouts drawn per template; 8 background patterns; "Reset to <template> defaults".
- ✅ Every change applies live; a slider drag is one undo step.
- Switching template keeps the user's colors and fonts; "Reset to defaults" applies the template's own suggestions (e.g. Creative → Montserrat).
- Profession-based "Recommended" badges were added in Step 10.

### Step 8: Backend API & database ✅ built (awaiting review)

- ✅ Tables (Drizzle, migration `0000_init`): `users` (with `plan`), `cvs` (document as JSONB, `revision`), `cv_versions`, `uploads`. Migrations run automatically when the API starts (`MIGRATE_ON_START`).
- ✅ Endpoints (all under `/api`, validated with the shared Zod schemas, errors as `{ error: { code, message, details } }`):

  | Method               | Path                                   | Purpose                                                                                     |
  | -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
  | GET                  | `/cvs`                                 | List the user's CVs (newest first, without content)                                         |
  | POST                 | `/cvs`                                 | Create (empty, or with a document / profession)                                             |
  | GET / PATCH / DELETE | `/cvs/:id`                             | Read, save, delete. PATCH needs the last `revision`; an outdated save gets **409 conflict** |
  | POST                 | `/cvs/:id/duplicate`                   | Copy                                                                                        |
  | GET / POST           | `/cvs/:id/versions`                    | History; POST saves a named version                                                         |
  | GET                  | `/cvs/:id/versions/:versionId`         | One version with its content (for preview)                                                  |
  | POST                 | `/cvs/:id/versions/:versionId/restore` | Restore (the replaced content is kept as "Before restore")                                  |
  | POST / DELETE        | `/uploads`, `/uploads/:id`             | Upload or delete a photo/logo (PNG/JPEG/WebP, max 5 MB, type checked from the file's bytes) |
  | GET                  | `/uploads/:id`                         | Serve an image (public by random id, cached)                                                |
  | GET                  | `/professions`                         | Profession presets                                                                          |
  | GET                  | `/health`                              | API and database status                                                                     |

- ✅ Automatic version history: while saving, the previous content is kept as a snapshot at most every 10 minutes; versions beyond the plan limit are pruned.
- ✅ Plan limits in one place (`PLAN_LIMITS` in `@cv/shared`): free = 20 CVs and 30 versions per CV.
- ✅ Every query is scoped to the current user. Since Step 15 the user comes from the session cookie; unauthenticated requests get 401.
- ✅ File storage behind a small interface; local disk for development. The Cloudflare R2 (S3) implementation is added at deployment (Step 17).
- ✅ API tests run against a real Postgres test database (created and migrated automatically). CI runs Postgres as a service and requires these tests; locally they are skipped with a warning when Postgres isn't running.
- Templates stay defined in the frontend code (no `/templates` endpoint needed).
- The frontend still uses mock data until Step 9 connects it.

### Step 9: Connect frontend ↔ backend ✅ built (awaiting review)

- ✅ Axios client turns every failure into one error type with a stable `code` (API codes, `network_error`); typed `cvApi` calls validated with the shared Zod schemas; TanStack Query hooks keep the list and open CV in sync.
- ✅ **Autosave**: about 1 s after typing stops; one save at a time; every save carries the document revision. Status next to the title: _Saving… / Saved / Not saved, retrying… / Changed elsewhere_. Network or server errors retry with backoff (2, 5, 10, 30 s). Leaving the editor saves immediately; closing the tab with unsaved changes asks first.
- ✅ **Conflicts**: if another tab or device saved first, a banner offers _Load the other version_ or _Keep my version_.
- ✅ **Documents** (All / CVs, from the database): search, sort (last edited, created, name, type), checkboxes with select all, per-document menu (Open, Rename, Copy, Download*, Delete) and bulk Copy / Delete with a confirmation. Empty and error states.
- ✅ "Create new CV" creates it on the server and opens it; the title is editable in the editor's top bar.
- ✅ **History** panel: save a named version, list automatic and named versions, preview one read-only, restore it (current content kept as "Before restore").
- ✅ Photos and logos are uploaded to the API (still resized in the browser first) instead of being stored inside the CV.
- ✅ Choosing a template applies its suggested font, column layout and spacing; color, margins, background and page size stay. Everything remains changeable in Design & Font.
- API: renaming no longer needs or changes the document revision (so a rename never conflicts with an open editor); lost database connections answer 503 _database_unavailable_.
- Still sample data: cover letters (Step 13), saved jobs (Step 12), dashboard job pipeline (Step 14). *Download arrives in Step 11.

### Step 10: "Create new CV" flow ✅ built (awaiting review)

- ✅ Wizard at `/cvs/new` in three steps. The choices are kept in the URL (`?profession=…&template=…`), so the browser's Back button goes back one step. A step indicator shows what was chosen and lets the user jump back.
  1. **Profession:** Software Developer, Designer, Sales & Marketing, Healthcare, Academic & Research, or **Other** (general layout, no example).
  2. **Template:** the profession's 3 recommended templates come first, with a _Recommended_ badge, then the other 5. Thumbnails show the profession's example in each template, with that template's suggested look.
  3. **Start:** _Start from an example_ (the profession's complete sample CV) or _Start blank_ (the sections that profession usually has, with placeholders), each shown as a preview. Also a CV name (default "<Profession> CV") and the CV language. _Create CV_ saves it and opens the editor.
- ✅ The new CV uses the chosen template with its suggested font and layout, and the profession's accent color. The profession is saved with the CV.
- ✅ The editor's Templates panel marks the templates recommended for the CV's profession.
- ✅ The "Create new CV" buttons (Documents, Dashboard) open the wizard, and the old `/cvs/new/edit` address redirects to it. The Documents tab stays highlighted while creating.
- Fixed: the top navigation was 16 px too wide on phones.
- (Later) import an existing CV from PDF/DOCX or from a LinkedIn export.

### Step 11: Preview, PDF export & sharing ✅ built (awaiting review)

- ✅ Preview mode: placeholders and empty sections hidden (built in Step 4). The preview page now has _Share_ and _Download PDF_, and scales the pages to fit narrow screens.
- ✅ **PDF download, phase 1 (free):** _Download PDF_ opens the browser's print dialog with only the CV. It is rendered in preview mode at its page size (`@page` A4 or US Letter, no margins, colors and backgrounds kept), and the file name suggested is the CV's title. The text stays selectable, which keeps it ATS-friendly. Available in the editor (prints the latest edits, even unsaved ones), the preview page, the Documents menu (and the selection toolbar when one CV is selected) and on shared links.
- PDF download, phase 2 (when paid hosting exists): server-side headless Chromium for a one-click download that is identical in every browser.
- ✅ **Share link** (`/s/:slug`), off by default, from the editor's right rail, the preview page and the Documents menu:
  - Turning it on creates a random, unguessable address (16 characters). Turning it off makes the link stop working; turning it on again brings back the same address. _Replace link_ gives a new address and the old one stops working.
  - The shared page is read-only, shows the latest saved version, offers _Download PDF_, fits phones, and is kept out of search engines (`noindex`). It shows no ids or owner details.
  - Shared CVs get a _Shared_ badge in Documents. Deleting a CV deletes its link; copies are not shared.
  - ✅ **Hide my personal details** (for posting the link publicly, e.g. for feedback): a second switch in the share dialog. The API replaces the name, email, phone, link, location and cover-letter signature with stand-ins (`Xxxxx Xxxxxxx`, `xxxxx@xxxxx.xxx`…), removes the photo and sends no title, so the real details never reach the visitor's browser. The shared page and its PDF draw the stand-ins blurred (not selectable, read as "Hidden" by screen readers), show "The owner hid their personal details on this link" and are titled "Shared CV" / "Shared cover letter". The setting survives turning the link off and on and _Replace link_. Other text (summary, experience) is shown as is; the dialog asks the owner to check it. Column `share_links.hide_personal` (migration `0007_share_hide_personal`).
- API: `GET/PUT /cvs/:id/share` (`PUT` takes `isActive` and/or `hidePersonal`), `POST /cvs/:id/share/reset`, public `GET /shared/:slug`. New table `share_links` (migration `0001_share_links`, applied automatically on start).

### Step 12: Saved Jobs tracker ✅ built (awaiting review)

Specification: §2.3.

- ✅ Backend: `GET/POST /jobs`, `GET/PATCH/DELETE /jobs/:id` (scoped to the user; PATCH sends only changed fields). New table `jobs` (migration `0002_jobs`); deleting a CV unlinks it from jobs, deleting a job keeps its CVs. Sorting and filtering run in the browser, which is instant for a personal job list.
- ✅ Table (TanStack Table v9): sort by position, company, status, dates and type; filter by status and type; search position, company, location and notes. Inline editing of status, date applied, type, resume and notes, saved at once (undone if the save fails). Phones get one card per job.
- ✅ "+ Add job" and the details drawer: position, company, status, date applied, type, location, salary, contact person, resume and notes; delete with confirmation. The Dashboard's "Add job" opens the form directly.
- ✅ "Create tailored copy" duplicates the selected CV as "<CV title> – <Company>" with `jobId` set and links the job to it (`POST /cvs/:id/duplicate { jobId }`).
- ✅ Status changes fill in "Date applied" (today, in the user's time zone) the first time a job leaves "To apply"; it stays editable.
- ✅ The Dashboard pipeline and reminders and the Documents "For <position> at <company>" line use the real jobs.
- Decided: no Kanban board. Cover letter links arrive with cover letters (Step 13).

### Step 13: Cover letters ✅ built (awaiting review)

- ✅ **Create a cover letter** (`/cover-letters/new`, from Documents, the Dashboard or a saved job): pick the CV (most recent by default) and optionally the job. The letter copies the CV's header (name, contacts, photo) and design, so letter and CV match; the job fills in the company, names the letter "Cover letter – <Company>" and becomes that job's cover letter. Greeting, closing and date follow the letter language (English US/UK, Bulgarian).
- ✅ **Editor** reusing the CV editor shell: edit everything in place (date, recipient name, title, company, address, greeting, paragraphs, closing, signature, header). Enter starts a new paragraph; "Add paragraph"; Backspace in an empty paragraph removes it. Templates and Design & Font panels (the letter uses the template's header style; no column layout). Undo/redo, autosave with revisions and the conflict banner like CVs.
- ✅ A bar under the top bar links the letter to a CV and a job, with **"Use CV's header & design"** to copy them again after the CV changed (copied, not live-linked, so the letter never changes by surprise).
- ✅ Preview page, **Download PDF** (one page, grows if the text is longer) and **share links** for letters; the public `/s/:slug` page shows CVs and letters.
- ✅ **Documents** list real cover letters on All documents and Cover letters, with open, rename, copy, download, share and delete (also in bulk). The Dashboard's recent documents include letters. The sample cover letters are gone.
- ✅ **Saved Jobs**: the Cover letter column and the job details link a letter; the job details offer "Write a cover letter for this job".
- API: `GET/POST /cover-letters`, `GET/PATCH/DELETE /cover-letters/:id`, `POST /cover-letters/:id/duplicate`, `GET/PUT /cover-letters/:id/share`, `POST /cover-letters/:id/share/reset`. New table `cover_letters` (migration `0003_cover_letters`); share links point at a CV or a letter; `jobs.cover_letter_id` now references letters. Deleting a CV unlinks its letters; deleting a letter unlinks jobs and removes its share link.
- Not in this step: version history for letters (CVs only for now).
- (Step 16, AI) Generate a draft from a saved job plus the linked CV.

### Step 14: Dashboard ✅ built (awaiting review)

Specification: §2.1.

- ✅ **Quick actions:** New CV, New cover letter, Add job (opens the form).
- ✅ **Recent documents:** the 4 latest CVs and cover letters as cards with a thumbnail of the first page, type badge, "Shared" badge and date. An empty account gets a "Create your first CV" prompt.
- ✅ **Job pipeline:** a count and a small bar per status; each row opens Saved Jobs filtered to that status (`/jobs?status=applied`).
- ✅ **Reminders**, longest-waiting first, with a count:
  - Applied for 14+ days: _Mark as "No answer"_ in one click.
  - Still "To apply" after 7+ days: _I applied_ in one click (fills in "Date applied", like the table does).
  - The job's name opens its details (`/jobs?job=<id>`). "Nothing to follow up on." when there is none.
- Saved Jobs reads `?status=` and `?job=` once and then clears them from the address.
- The reminder rules live in `lib/reminders.ts` (14 and 7 days) and are unit-tested.

### Step 15: Authentication & accounts ✅ built (awaiting review)

- ✅ **Sign up / sign in / sign out** with email and password. Sign-up is open to everyone (the free plan limits apply to each account).
- ✅ **Passwords:** scrypt (Node built-in, OWASP cost settings, per-hash salt, parameters stored with the hash), 8–128 characters, a list of very common passwords is refused, unknown emails cost the same time as wrong passwords, login errors are generic.
- ✅ **Sessions:** a random 256-bit token in the `cv_session` cookie (httpOnly, `SameSite=Lax`, `Secure` in production); the database keeps only its SHA-256. Idle expiry 30 days (sliding), absolute limit 90 days. Logout deletes the session on the server; changing a password signs out the other browsers; resetting signs out all.
- ✅ **Forgot password:** the reset link (valid 1 hour, single use, a newer link replaces the older) is emailed; the answer is identical whether or not the address has an account.
- ✅ **Email confirmation** is not blocking: a banner reminds until the link was opened, with "Send it again". Resetting a password also confirms the address.
- ✅ **Emails** go through a `Mailer` interface. In development the email is printed in the API log (copy the link from the terminal). A real provider (Brevo or Resend) is plugged in at deployment (Step 17).
- ✅ **Account page** (`/account`): name, change password, delete account (asks for the password; removes all CVs, letters, jobs, share links and uploaded files).
- ✅ **Every data route requires a session** (401 `unauthorized`); public routes stay public: health, professions, uploaded images, shared documents, and the auth endpoints. Tests prove that one user cannot read, change, copy, share or delete another user's CVs, letters, jobs or uploads.
- ✅ **Abuse protection:** in-memory rate limits (login per account and per address, sign-ups, reset emails, token attempts, resend), and writes with a foreign `Origin` header are refused (CSRF, on top of `SameSite`).
- ✅ **Upgrade path:** in development the first account created takes over the old "dev" user's CVs, letters, jobs and uploads (done in one transaction with a row lock, so two simultaneous sign-ups cannot both inherit); later accounts start empty. This is switched off when `NODE_ENV=production`.
- ✅ **Web:** pages `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`; all app and editor pages need a session and send visitors to `/login?next=…` and back afterwards; shared links (`/s/:slug`) stay public. Signing in or out clears the cache and the open editors, so one user's data never shows for the next. A session that ends elsewhere sends the app back to the sign-in page.
- ⏭ **Later, small separate step:** "Continue with Google" (needs a Google Cloud OAuth client ID and secret that only you can create).
- ⚠️ **For deployment (Step 17):** the cookie is `SameSite=Lax`, which works when the web app and API share a registrable domain (use a custom domain such as `app.example.com` + `api.example.com`) or when the web host proxies `/api`. Without that, set `COOKIE_SAME_SITE=none` with `COOKIE_SECURE=true`. Behind a hosting proxy set `TRUST_PROXY=true` so rate limits see real addresses. Rate limits live in the API's memory: fine for one instance, move them to the database if the API ever runs several.

### Step 16: AI features ✅ built (awaiting review)

- ✅ **Fix Mistakes** (CVs and cover letters): spelling, grammar and punctuation; each suggestion shows "wrong → right" with a reason and can be accepted or rejected ("Accept all" too). Accepted fixes are normal edits (undo works). Respects US/UK spelling and Bulgarian.
- ✅ **Check & Tailor** (CVs): pick a Saved Job (its new **Job description** field) or paste a posting →
  - **Match score**: the share of the posting's keywords found in the CV, important ones counting double. The AI picks the keywords; the app counts them itself (`matchKeywords` in `@cv/shared`), so the score is stable and rises live as you add keywords.
  - Missing / found keywords, short advice, and **suggested rewrites** of whole fields (summary, headline, bullets) that use the posting's vocabulary without inventing experience.
  - Apply rewrites to this CV, or **Save as tailored copy**: copies the CV with the selected rewrites, names it "<CV> – <Company>", links the job to it and opens it. The original stays unchanged.
  - A posting pasted for a job without a description is saved with that job.
- ✅ **AI Assistant** panel:
  - CV: write or improve the **summary**, or the **bullets** of any experience or project entry; optional instructions ("shorter", "mention leadership") and an optional saved job to aim at. The proposal shows first; Replace or Discard.
  - Cover letter: **writes the paragraphs** from the linked CV and the job (company, position, description).
- ✅ Nothing changes without the user's click; the panel says where the text is sent.
- ✅ **Backend:** `/api/ai/status`, `/api/ai/fix-mistakes`, `/api/ai/tailor`, `/api/ai/assist`. The browser sends the document's text as fields with their editor paths; the model sees short ids (f1, f2, …); the server maps answers back, drops anything that cannot be applied (unknown field, text not found, no change), and validates every answer with Zod (one retry on malformed JSON). Prompts forbid invented facts and tell the model to ignore instructions inside the CV or posting.
- ✅ **Provider interface** (`AiProvider`): **Google Gemini** via its REST API (JSON mode), model `gemini-flash-latest` by default (`GEMINI_MODEL` to pin one). A **mock provider** (`AI_PROVIDER=mock`) gives simple fake answers so the features can be tried and tested without a key; it refuses to run in production. Without a key, AI is off and the panels explain how to turn it on.
- ✅ **Limits:** 30 AI requests per user per day on the free plan (`PLAN_LIMITS.aiRequestsPerDay`, ready to become "AI credits"); counted atomically in the database, refunded when the AI fails. A server-wide limit per minute (`AI_MAX_PER_MINUTE`, default 10) keeps the app inside Gemini's free quota. Input size is capped (30 000 characters of document, 20 000 of posting).
- ⚠️ **Gemini free tier and privacy:** on the free tier Google may use prompts (here: CV text) to improve its products. Fine for development and a hobby launch; switch to the paid tier (or another provider) before real users rely on it, and mention it in the privacy policy (Step 17).
- ⚠️ Free-tier quotas and model names change; check them in Google AI Studio when getting the key.

### Step 17: Quality & release ✅ built (awaiting review)

- ✅ **Deployment setup** for the free plans, step by step in [`docs/DEPLOY.md`](DEPLOY.md): Neon (database), Cloudflare R2 (images), Brevo (emails), Gemini (AI), Sentry (errors), Render (API, [`render.yaml`](../render.yaml) blueprint), Cloudflare Pages (web).
- ✅ **One site for the browser:** a Cloudflare Pages Function forwards `/api/*` to Render with a shared secret (`PROXY_SECRET`) and the real client address. The cookie stays first-party (`SameSite=Lax`, `Secure`) without buying a domain; the API refuses requests that skip the proxy (except `/api/health` and `/api/ping`).
- ✅ **Production pieces in the API:** R2 storage (S3 API, signed with `aws4fetch`, private bucket), Brevo mailer, Sentry (errors with route and user id only, never document contents), hardening headers, `/api/ping` for keep-warm pings that do not wake the database. The API **refuses to start** in production when storage, email or the public addresses are not configured, and warns about optional ones.
- ✅ **Web:** security headers generated at build time (`_headers`: a Content-Security-Policy that allows exactly the page's inline theme script by hash, HSTS, nosniff, `frame-ancestors 'none'`), long caching for assets, a friendly error page (also for "a new version is available"), optional Sentry (downloaded only when configured).
- ✅ **Performance:** pages are split into chunks; the first download shrank from 838 KB to 258 KB (80 KB gzipped). The other pages load in the background after the first screen, so moving around stays instant.
- ✅ **Accessibility:** automatic WCAG 2.1 AA checks (axe) on the public and app pages. Fixed: button contrast (teal-600 → teal-700), links in text are underlined, "Saved" contrast, the job pipeline's and the date fields' accessible names.
- ✅ **Browser tests (Playwright)** in `e2e/`: sign-up/sign-out/sign-in, legal pages, CV create → edit → autosave → reload → share link, saved job description, all AI features with the mock provider, accessibility, security headers, not-found page. They run against the production builds and a fresh database; CI runs them on pull requests.
- ✅ **Privacy policy** (`/privacy`) and **terms** (`/terms`), linked from every page and the sign-up form. Drafts based on what the app really stores and which services process it; **review them (not legal advice)** and set `VITE_OPERATOR_NAME` / `VITE_CONTACT_EMAIL`.
- ⚠️ **Gemini in the EU:** Google's Gemini API terms allow only _paid_ services for apps used by people in the EEA, UK or Switzerland. Turn on billing for the key's Google Cloud project before launch (cheap with the daily limit; set a budget alert).
- ⏭ Later: Google sign-in (separate step), own domain with SPF/DKIM for email deliverability.

### Interface languages (EN · BG · DE) ✅ built (awaiting review)

- ✅ **Language dropdown** in every header (app, sign-in pages, legal pages, editor; compact "EN/BG/DE" in the editor). Switching is instant and keeps the page, open documents and unsaved edits; the `<html lang>` follows.
- ✅ **First visit:** the browser's language (bg/de, else English); the choice is remembered in the browser and, when signed in, on the account (`users.locale`), so another browser opens in the same language.
- ✅ **Everything the app says is translated:** navigation, all pages and panels, editor controls, AI panels, dialogs, notices, empty states, plurals ("1 job / 3 jobs"), dates (formatted per language), API error messages (translated by error code), privacy policy and terms, and the **account emails** (confirmation, password reset).
- ✅ **The CV keeps its own language:** CV content, section titles and placeholders follow the CV language (EN-US/EN-GB/BG), so a German interface can edit an English CV.
- ✅ **Built with i18next:** English is the source (`apps/web/src/i18n/locales/en`); Bulgarian and German files are type-checked against it (a missing or extra key fails the build) and a test checks that every `{{placeholder}}` matches. Bulgarian and German download only when chosen. How to add text: `apps/web/src/i18n/README.md`.
- ✅ Browser tests switch languages in place (no reload), check that the choice is remembered and saved on the account, and run the accessibility checks in Bulgarian and German.
- ⚠️ The Bulgarian and German texts were written carefully but not by native-speaker reviewers; the legal pages especially should be reviewed before launch.
- ⏭ Possible next: German as a **CV language** (German section titles, placeholders and date formats for CVs written in German).

### Phones & design tokens ✅ built (awaiting review)

- ✅ **Works on phones:** bottom tab bar, cards instead of tables, full-screen drawers, and an editor made for touch (compact top bar, bottom toolbar, tools as bottom sheets, page scaled to fit). No page scrolls sideways at 390px.
- ✅ **One file for the look:** colours (light and dark), padding, rounding, shadows, widths, grids, z-index and breakpoints are variables in `apps/web/src/shared/styles/tokens.css`; buttons, inputs and cards are shared classes. See `docs/ARCHITECTURE.md` → "Styles: design tokens".
- ✅ **No magic numbers:** form limits come from the shared schemas (`TITLE_MAX`, `JOB_TEXT_MAX`…), and timings and sizes are named constants.
- ✅ **Loading skeletons** instead of spinners and "Loading…" text: page and editor outlines, document and job lists, dashboard thumbnails, history, share dialog and AI answers; themed for light and dark, still for reduced motion.
- ✅ **Cleaner header:** the logo and tabs on the left, the language and the account avatar on the right. The API and database status is in the footer, next to Privacy and Terms.
- ✅ **Liquid glass and a sticky header:** dashboard cards, the documents list and the Saved Jobs table (cards on phones) are see-through glass over soft brand-coloured glows; the header stays at the top while scrolling, as a glass bar (the phone tab bar too). Light and dark; solid for reduced transparency.
- ✅ **Not found and error pages with a way home:** a broken link shows "404 · Page not found" with **Go to dashboard** (and **Go back** when there is a page to return to); a crash shows "Something went wrong" with **Reload** and **Go to dashboard**. Both on a glass card with the logo, light and dark.
- ✅ **Frosted redesign:** a vivid aurora gradient behind the app (teal, sky, violet, mint; deeper in dark mode); the app tabs are a frosted pill with the active tab as a brighter pill. The editor's top bar floats over the gradient: a round back button with the title, the tools in a centred glass pill and the document's actions in a second pill; the quick-action rail is a vertical glass pill beside the page; tool panels are frosted cards. The not-found and error pages have illustrations (a magnifying glass as the 0 of 404, a torn page with a spark). CV pages stay white paper in dark mode.
- ✅ **Splash screen and app-like motion:** a frosted splash shows until the app has rendered. Tabs switch instantly with a highlight that glides to the chosen tab and the page easing in from that side (no freeze, no crossfade). CVs and cover letters grow out of their thumbnail when opened (also right after creating one, and from the Saved Jobs table) and shrink back when closed. The job drawer and the account drawer slide in from the right and back out; dialogs grow in and shrink away. Still for reduced motion.
- ✅ **Glass buttons, fields, menus and toasts:** buttons have a frosted or glowing glass look with a gentle lift on hover; fields and drop-downs are frosted; menus are frosted cards. Messages (the email reminder, saved/copied/deleted results, errors, editor notices) are frosted toasts in the bottom-right corner, coloured by tone (info, success, warning, error) and closable with ✕. Every drawer and dialog also closes from the dimmed area around it.
- ✅ **Application funnel and numbers on the dashboard:** next to the job pipeline, a funnel shows how far applications get (Saved → Applied → Interview → Offer, with each step's share of the one before; rejected and no-answer counts beneath), and three stat tiles show active applications, the response rate and interviews. One validated teal in light and dark; a hover sentence per step; translated.
- ✅ **Skills styles:** a palette button on the Skills title (in the editor) chooses how skills look: a plain list, dots, a progress bar, pills or bullet points (the last two show names only). Pills tint with the accent colour on white pages and white on coloured sidebars.
- ✅ **Certificates with an expiry date and a link:** each certificate has an optional expiry date ("May 2023 · Expires May 2026") and a credential link shown with a link icon and without "https://"; on the finished CV (preview, shared link, PDF) it is a real link. Older CVs without an expiry date still load.
- ✅ **Click-to-pick dates:** dates open a picker with **From / To** tabs (experience, education, projects) or **Issued / Expires** (certificates): arrows or a grid of years choose the year, then a month grid; "year only", "Clear" and "Present". Picking the start month moves on to the end, which opens on the start year. The picker opens above the date when there is no room below.
- ✅ **Zoom for CVs and cover letters:** a floating zoom bar under the page (−, slider, +, percentage, fit to screen) from 25% to 200%. By default the page fits the screen (100% where it fits); on phones too.
- ✅ **Photo upload in Design & Font:** a Photo section at the top of the panel (CVs and cover letters) uploads a photo (pick a file or drop one on the preview; resized in the browser to 480px), changes or removes it, shows or hides it, and sets its shape: circle, rounded or square. Every template now shows the photo (Single column and Multicolumn centre it above the name). The hover button on the page header still works too.
- ✅ **More backgrounds:** eleven full-page designs next to the repeating patterns: honeycomb, contour lines, triangles, flowing lines, geometric squares, a halftone wave, chevrons, ribbons, a dot horizon, chevron stripes and rings. All are drawn as SVG in the accent colour and kept faint behind the text; the picker shows each one bolder so it can be recognised.
- ✅ **Photo position, bigger entry toolbars, rail beside the page:** the photo can sit next to the name (the template's place), top left or top right; a corner on the sidebar's side puts it at the top of the sidebar (filling the space beside the header), otherwise it sits in that corner of the header. The hover toolbars of entries, section titles and the header are larger (a green **+ Entry**, edit, up, down, add bullet, duplicate, delete), sit on the top edge of what they belong to and linger briefly, so they no longer vanish on the way to them. The quick-action rail is attached to the page's left edge at every zoom.
- ✅ **Glass header everywhere, and clearer document icons:** the app header is now floating glass pills like the editor's top bar (logo, tabs, language and account; a compact bar on phones), and the Preview page has the same pills (back, title, share and PDF) over the app's gradient. In Documents a CV is a teal "page with a person" icon and a cover letter a blue envelope, matching their badges, in light and dark.
- ✅ **Welcome page:** visitors who are not signed in and open the home address land on `/welcome`: a glass header with language, theme and **Log in**, a hero ("Build a CV that gets you the interview") with an example CV drawn by the real renderer, **Create your CV** and **Log in** buttons, six feature cards (templates, AI, cover letters, PDF or link, job tracking, languages and dark mode) and a closing call to action. Light, dark, phone, English/Bulgarian/German. Signed-in people are sent to the dashboard; other pages still ask for a sign-in and return afterwards.
- ✅ **Dashboard reminders checked end to end** (real app, real API): the 14-day "no answer" and 7-day "to apply" rules, their order and count, "Mark as No answer" and "I applied" (saved, with today's date), opening a job from its name, the empty state, local-date saving in other time zones, light/dark and phone. Fixed: while the jobs load, the pipeline, funnel, numbers and reminders are skeletons (before, Reminders said "Nothing to follow up on" and the pipeline showed zeros until the jobs arrived), and if the jobs cannot be loaded the dashboard says so with **Try again** instead of showing empty cards.
- ✅ **Dusk dark theme:** dark mode now follows a dusk-sky reference: a vertical gradient from indigo at the top through a mauve band in the middle to deep navy at the bottom, with soft halos of light and violet-tinted frosted glass (brighter edges), lilac-white text and violet-tinted surfaces; the brand teal stays for buttons and the logo, and CV pages stay white. All of it is tokens (`--theme-backdrop-from/mid/to/angle`, glass, neutrals), so light mode is unchanged. The splash uses the same dusk gradient. Text contrast was measured on the real pixels behind every text (gradient included): all dark views pass 4.5:1 (3:1 for large text). The zoom bar uses the stronger glass so its numbers stay readable over the white page.
- ✅ **Dark drawers and a fix for the editor's menus:** in dark mode the account and job drawers and the editor's side panels are a solid deep navy (`--theme-panel`, utility `glass-panel`), clearly apart from the gradient behind them (light mode unchanged). The editor's top bar now sits above the page, so its menus (theme, language, More, Help) open over the page instead of behind it: before, the theme menu could not be clicked while editing a CV, and on phones the More menu (which holds the theme) was hidden behind the page. Covered by e2e tests on desktop and phone.
- ✅ **Fixes from the full UI test:** the dashboard's document thumbnails no longer put a link inside a link (links inside a thumbnail are plain text); entry toolbars (move, duplicate, delete…) and the header toolbar are reachable with the keyboard (they fade instead of vanishing, like section toolbars); a double click on Create CV or Create cover letter makes one document; long words and links wrap inside the page (editor, preview, PDF, shared link); header text has limits (name 150, headline 300, email 254, phone 40, location 150, link 300) enforced while typing and when saving, but not when reading, so older documents still open; the "Applied" date cannot be in the future (picker and API; an applied date before the saved date stays allowed, for jobs added after applying); the letter's "Add paragraph" button and the shared page footer pass the contrast check; footer links, "View all", sort headers, the job status control and checkboxes are bigger tap targets (24px, 44px on touch screens); the zoom bar's group and slider no longer share one label.
- ✅ **Resignation letters:** a third document type next to CVs and cover letters, created **only from Documents** (Create new → Resignation letter, or the Resignation letters tab; no dashboard button, though recent ones show there). The form asks for your details (name, email, phone, place of residence), the employer (company, contact name, address, postal code, city) and the letter (subject, date, language); a CV can fill in your details and the fonts and colours. The letter is a formal business page (sender and date on top, employer, subject, greeting, text, closing, signature) with a default text in English or Bulgarian that names the company and contact; everything is editable in place, with autosave, undo, conflict handling, zoom, Design & Font and Fix Mistakes (no templates, sections, photo or AI assistant). Preview, PDF, share link and "Hide my personal details" work too; hiding also masks the employer and swaps the names in the text. Fields have length limits like the CV header. API `/resignations` (table `resignations`, share link column `resignation_id`, migration `0008_resignations`).
- ✅ **Fixes from the second full UI test:** long cover letters and resignation letters keep their top and bottom margins on every printed page after the first (before, page 2 started at the edge of the paper); "Hide my personal details" now also hides a cover letter's recipient (name, company, address) and swaps the owner's name, contacts, first and last name wherever the text of a CV or letter mentions them (whole words only); the Documents menus (row actions, Create new) and the editor's help and More menus work with the keyboard (arrows, Home/End, Escape returns focus to the button); a "Skip to content" link starts every page; dialogs and drawers give focus back to the button that opened them; the first paragraph of a resignation letter hints at an opening, not at the greeting; the empty Resignation letters and Cover letters tabs offer to create that kind of document; no single text of a CV or letter can be longer than 5,000 characters (typing stops there; saving refuses more).
- ✅ **Eight more CV templates, grouped by kind of work:** **Portfolio** (name, photo and contacts at the top of a filled sidebar), **Elegant** (italic serif name), **Vivid** (colored band with the photo in a white ring), **Spotlight** (centered name in a sidebar on the right, pill titles), **Modern** (photo with an accent ring), **Bold** (very large capital name), **Monogram** (initials in a circle when there is no photo) and **Executive** (colored band, filled titles). New section-title styles: filled block, heavy capitals, italic with a rule. The template pickers (new-CV wizard and editor) now group all 16 templates under Professional, Design & creative, Marketing and Sales; Designer CVs recommend Creative, Portfolio and Vivid, Sales & Marketing CVs Polished, Spotlight and Bold. The new templates are for CVs only: letters keep the original eight, and a letter made from a CV on a new template gets the closest letter template.
- ✅ **More browser tests (QA pass):** 13 → 40 tests (plus the Safari runs in CI). New: cover and resignation letters (create, edit, templates, print, share, "hide personal details", delete); email flows (confirm, send again, forgot and reset password with one-time links, unknown address, delete account); failure paths (two tabs, server errors and offline while saving, AI busy / limit / not set up, a session that ends, a server error when opening a document with "Try again"); PDFs read back with pdf.js (A4 size, Cyrillic text, margins on every page of a long letter, multi-page CVs); odd data (Cyrillic and emoji, markup shown as text, a very long word, a nearly empty CV); screenshots of all 16 templates and six full pages (made by CI: the label `update-screenshots` on a pull request makes CI commit new pictures); Safari (WebKit) projects for a desktop and an iPhone in CI; coverage reports with a table in each CI run; and `pnpm smoke`, a short check of the live site. Test-only API settings: `E2E_MAIL_FILE` (emails written to a file) and `AUTH_LIMIT_SCALE` (raises the sign-up limits); production refuses to start with either set.
- ✅ **Page objects, fixtures and a bigger smoke suite:** the e2e specs no longer hold selectors: one page object per screen or component (`e2e/pages/`) and Playwright fixtures (`e2e/fixtures/`: a lazy signed-in `account`, `cvEditor`, `api`, `mailbox`, `printing`, `visitors`, automatic console-error check) make a test read like a story. The live smoke suite uses the same layers and grew from 4 to 27 tests (availability and headers, sign-in and cookie flags, documents with photo upload and share links, jobs, the three AI features, phone layout); `SMOKE_LOCAL=1 pnpm smoke` runs it against the local stack, and CI does so after e2e. The server setup is shared in `e2e/stack.ts`.
- ✅ **Own Gemini key per person:** the account menu has a new **AI key** view (below Theme) where each person pastes their free Google Gemini key and picks Flash or Flash-Lite. The API checks the key with Google (`PUT /api/ai/key`), stores it encrypted with AES-256-GCM (`users.ai_key_encrypted`, key from the new `SECRETS_KEY` setting, which production requires) and never returns it; only its last four characters are shown. Requests then use that key and Google's limits instead of the app's 30-a-day limit; without one the optional shared `GEMINI_API_KEY` still works. Tests: API (saving, encryption at rest, per-person, rejected key), web (form) and e2e.
- ✅ **Practices from a reference Playwright project:** after reading [AutomationCamp-Playwright](https://github.com/varadinos/AutomationCamp-Playwright) the e2e suite gained a link checker (every same-site link on the public pages answers 200, with the checked links attached to the report), Core Web Vitals budgets (LCP and layout shift, with the values as report annotations) and data-driven validation tests whose cases live in JSON (`e2e/data/`): sign-up rules and rejected photo files. 17 new tests. Parallel runs (`E2E_WORKERS`) were tried and left opt-in: faster, but two tests failed at random on each run. The docs list what was taken and what was left out and why.
- ✅ **Email delivery made visible:** "Send it again" waits for the email and says when it could not be sent; without an email service (local setup) the banner says the link is printed in the API's log; the API logs at start how emails are sent. Troubleshooting steps in `docs/DEPLOY.md`.
- ✅ **Account drawer:** the avatar opens a drawer from the right with the name and email, **Account settings** (profile, password, delete account) and **Theme** (System / Light / Dark), each opened inside the drawer with a back button, and "Sign out" at the bottom. Old `/account` links open it on account settings.
- ✅ **Name and logo:** the product is called **Vitae** (from _curriculum vitae_), with the tagline "CVs, cover letters and job tracking". The logo is a page with a folded corner and a check: a CV that is ready to send. The name lives in one constant (`APP_NAME` in the shared package), used by the web app (`{{app}}` in translations) and the API (emails, sender name).
- ✅ Browser tests on a phone (no sideways scrolling, bottom navigation, editor toolbar and sheet, accessibility).

## 7. Open questions (deferred)

None of these block the early steps. Each one is answered in the step listed; the default applies unless you decide otherwise.

| Question                            | Decide in   | Default assumption                                                        |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------- |
| Login required from day one?        | Step 15 ✅  | Yes: every data route needs an account                                    |
| Which professions/templates for v1? | Steps 2 & 7 | Generic set, e.g. Software, Design, Sales/Marketing, Healthcare, Academic |
| English only or Bulgarian too?      | Step 7      | Cyrillic-capable fonts; resume language EN-US, EN-GB, BG                  |
| AI in v1?                           | Step 16 ✅  | Yes: Fix Mistakes, Check & Tailor, AI Assistant (Gemini free tier)        |
| Photo on CV?                        | Step 4      | Optional, only in templates that support it                               |
| Import existing CVs?                | After v1    | Later                                                                     |
| Repo visibility                     | Step 1      | CI runs on either                                                         |
| Light/dark app theme?               | Step 3      | Toggle that follows the system setting by default                         |
